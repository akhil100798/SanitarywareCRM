package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogImportPreviewItem;
import com.sanitaryware.crm.dto.CatalogImportPreviewResponse;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.CatalogVersion;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.entity.ProductPriceHistory;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.CatalogVersionRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.ProductPriceHistoryRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImage;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.text.TextPosition;
import org.apache.pdfbox.util.Matrix;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.extern.slf4j.Slf4j;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class CatalogPdfImportService {

    static {
        try {
            java.util.logging.Logger.getLogger("org.apache.pdfbox").setLevel(java.util.logging.Level.OFF);
            java.util.logging.Logger.getLogger("org.apache.fontbox").setLevel(java.util.logging.Level.OFF);
            if (org.slf4j.LoggerFactory.getLogger("org.apache.pdfbox") instanceof ch.qos.logback.classic.Logger rootPdf) {
                rootPdf.setLevel(ch.qos.logback.classic.Level.OFF);
            }
            if (org.slf4j.LoggerFactory.getLogger("org.apache.fontbox") instanceof ch.qos.logback.classic.Logger rootFont) {
                rootFont.setLevel(ch.qos.logback.classic.Level.OFF);
            }
        } catch (Throwable ignored) {}
    }

    private static final Pattern ROW_PATTERN = Pattern.compile("^(.*?)\\s+(\\d{7,10})\\s+([\\d,]+\\.\\d{2})$");
    private static final Pattern LEGACY_SKU_CANDIDATE = Pattern.compile("(?<!\\d)\\d{7,10}(?!\\d)");
    private static final Pattern HSN_PATTERN = Pattern.compile("(?i)HSN\\s*CODE\\s*[:\\s]+([0-9]{4,10})");

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductImageRepository productImageRepository;
    private final FileUploadService fileUploadService;
    private final CatalogVersionRepository catalogVersionRepository;
    private final ProductPriceHistoryRepository productPriceHistoryRepository;

    public CatalogPdfImportService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this(productRepository, categoryRepository, null, null, null, null);
    }

    @Autowired
    public CatalogPdfImportService(ProductRepository productRepository,
                                   CategoryRepository categoryRepository,
                                   @Autowired(required = false) ProductImageRepository productImageRepository,
                                   @Autowired(required = false) FileUploadService fileUploadService,
                                   @Autowired(required = false) CatalogVersionRepository catalogVersionRepository,
                                   @Autowired(required = false) ProductPriceHistoryRepository productPriceHistoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productImageRepository = productImageRepository;
        this.fileUploadService = fileUploadService;
        this.catalogVersionRepository = catalogVersionRepository;
        this.productPriceHistoryRepository = productPriceHistoryRepository;
    }

    @FunctionalInterface
    public interface CatalogProgressListener {
        void onProgress(int currentPage, int totalPages, String stageMessage, int productsFound, int imagesCropped);
    }

    @Transactional(readOnly = true)
    public CatalogImportPreviewResponse previewCatalog(Brand brand, MultipartFile file) {
        return previewCatalog(brand, file, null);
    }

    @Transactional(readOnly = true)
    public CatalogImportPreviewResponse previewCatalog(Brand brand, MultipartFile file, CatalogProgressListener listener) {
        validateBrand(brand);
        validatePdf(file);
        try (TemporaryCatalogPdf temporaryPdf = TemporaryCatalogPdf.copyOf(file);
             PDDocument document = Loader.loadPDF(temporaryPdf.path().toFile())) {
            if (listener != null) {
                listener.onProgress(0, document.getNumberOfPages(), "Initializing catalog parser...", 0, 0);
            }
            CatalogParseResult catalog = parseCatalogRows(document, listener);
            List<String> warnings = new ArrayList<>(catalog.warnings());
            Map<String, Product> existingProducts = findProductsBySku(catalog.rows());
            List<CatalogImportPreviewItem> items = new ArrayList<>();
            int creates = 0;
            int updates = 0;
            int conflicts = 0;
            int priceIncreases = 0;
            int priceDecreases = 0;
            int priceUnchanged = 0;

            int thumbnailBudget = 15;
            int thumbnailsGenerated = 0;
            for (CatalogRow row : catalog.rows()) {
                Product existing = existingProducts.get(row.sku().toUpperCase(Locale.ROOT));
                String action;
                BigDecimal priceDifference = null;
                Double priceDiffPercentage = null;
                String priceChangeType = "NEW";

                if (existing == null) {
                    action = "CREATE";
                    creates++;
                } else if (existing.getBrand() == null
                        || !brand.getId().equals(existing.getBrand().getId())) {
                    action = "CONFLICT";
                    conflicts++;
                    warnings.add("SKU " + row.sku() + " on page " + row.sourcePage()
                            + " already belongs to a different brand and cannot be updated.");
                } else {
                    action = "UPDATE";
                    updates++;
                    if (existing.getMrp() != null && row.mrp() != null) {
                        priceDifference = row.mrp().subtract(existing.getMrp());
                        if (existing.getMrp().compareTo(BigDecimal.ZERO) > 0) {
                            priceDiffPercentage = Math.round(((priceDifference.doubleValue() / existing.getMrp().doubleValue()) * 100.0) * 10.0) / 10.0;
                        }
                        if (priceDifference.compareTo(BigDecimal.ZERO) > 0) {
                            priceChangeType = "INCREASE";
                            priceIncreases++;
                        } else if (priceDifference.compareTo(BigDecimal.ZERO) < 0) {
                            priceChangeType = "DECREASE";
                            priceDecreases++;
                        } else {
                            priceChangeType = "UNCHANGED";
                            priceUnchanged++;
                        }
                    } else {
                        priceChangeType = "UNCHANGED";
                        priceUnchanged++;
                    }
                }

                boolean hasImage = row.hasImage();
                String imagePreviewUrl = null;
                if (hasImage && thumbnailsGenerated < thumbnailBudget) {
                    byte[] thumb = row.effectiveThumbnailBytes();
                    if (thumb != null && thumb.length > 0) {
                        imagePreviewUrl = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(thumb);
                        thumbnailsGenerated++;
                    }
                }

                items.add(new CatalogImportPreviewItem(
                        row.sku(), row.name(), row.mrp(), row.mrp(),
                        row.size() != null ? row.size() : "--",
                        row.systemName() != null ? row.systemName() : "General Catalogue",
                        row.description() != null ? row.description() : "--",
                        action, row.sourcePage(),
                        existing == null ? null : existing.getName(),
                        existing == null ? null : existing.getMrp(),
                        existing == null || existing.getBrand() == null
                                ? null : existing.getBrand().getName(),
                        row.hsnCode(), row.material(), row.materialCode(), row.itemCode(),
                        existing == null || existing.getIsAvailable() == null
                                ? true : existing.getIsAvailable(),
                        hasImage, imagePreviewUrl,
                        priceDifference, priceDiffPercentage, priceChangeType));
            }

            int rejected = catalog.skippedRows() + conflicts;
            if (items.isEmpty() && warnings.isEmpty()) {
                warnings.add("No supported product rows were found in the catalogue PDF.");
            }
            if (listener != null) {
                listener.onProgress(document.getNumberOfPages(), document.getNumberOfPages(), "Preview analysis complete!", items.size(), thumbnailsGenerated);
            }
            return new CatalogImportPreviewResponse(
                    brand.getId(), brand.getName(), file.getOriginalFilename(), file.getSize(),
                    reviewToken(temporaryPdf.path(), brand.getId()), document.getNumberOfPages(),
                    items.size() + catalog.skippedRows(), creates, updates, conflicts, rejected,
                    (creates + updates) > 0, List.copyOf(items), List.copyOf(warnings),
                    priceIncreases, priceDecreases, priceUnchanged);
        } catch (IOException exception) {
            throw new IllegalArgumentException("The catalogue PDF could not be read", exception);
        }
    }

    @Transactional
    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String reviewedSha256) {
        return importCatalog(brand, file, reviewedSha256, null, Set.of(), null);
    }

    @Transactional
    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String reviewedSha256,
                                            List<String> selectedSkus, Set<String> unavailableSkus) {
        return importCatalog(brand, file, reviewedSha256, selectedSkus, unavailableSkus, null);
    }

    @Transactional
    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String reviewedSha256,
                                            List<String> selectedSkus, Set<String> unavailableSkus,
                                            CatalogProgressListener listener) {
        validateBrand(brand);
        validatePdf(file);
        if (reviewedSha256 == null || reviewedSha256.isBlank()) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,
                    "Preview the catalogue and confirm its review before importing.");
        }
        ImportCounters counters = new ImportCounters();
        try (TemporaryCatalogPdf temporaryPdf = TemporaryCatalogPdf.copyOf(file);
             PDDocument document = Loader.loadPDF(temporaryPdf.path().toFile())) {
            String currentSha256 = reviewToken(temporaryPdf.path(), brand.getId());
            if (!MessageDigest.isEqual(currentSha256.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    reviewedSha256.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "The selected PDF changed after preview. Run the preview again before importing.");
            }

            if (listener != null) {
                listener.onProgress(0, document.getNumberOfPages(), "Analyzing catalog for import...", 0, 0);
            }
            CatalogParseResult catalog = parseCatalogRows(document, listener);
            if (selectedSkus == null && !catalog.warnings().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        buildValidationMessage(catalog));
            }
            if (catalog.rows().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        buildValidationMessage(catalog));
            }
            List<CatalogRow> rowsToImport = selectRows(catalog.rows(), selectedSkus);
            if (selectedSkus == null) {
                Map<String, Product> existingBySku = findProductsBySku(catalog.rows());
                rowsToImport = rowsToImport.stream()
                        .filter(r -> {
                            Product ex = existingBySku.get(r.sku().toUpperCase(Locale.ROOT));
                            return ex == null || ex.getBrand() == null || brand.getId().equals(ex.getBrand().getId());
                        })
                        .toList();
            }
            Set<String> normalizedUnavailable = normalizeSkuSet(unavailableSkus);
            Set<String> selectedSkuSet = rowsToImport.stream()
                    .map(row -> row.sku().toUpperCase(Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
            if (!selectedSkuSet.containsAll(normalizedUnavailable)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unavailable selections must be among the selected preview products.");
            }
            validateBrandOwnership(brand, rowsToImport);

            CatalogVersion catalogVersion = null;
            if (catalogVersionRepository != null) {
                catalogVersion = CatalogVersion.builder()
                        .brand(brand)
                        .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "catalog.pdf")
                        .versionTag(brand.getName() + " - " + (file.getOriginalFilename() != null ? file.getOriginalFilename().replace(".pdf", "") : "Catalog"))
                        .sha256(currentSha256)
                        .totalProducts(0)
                        .createdCount(0)
                        .updatedCount(0)
                        .status("ACTIVE")
                        .build();
                catalogVersion = catalogVersionRepository.save(catalogVersion);
            }

            if (listener != null) {
                listener.onProgress(0, rowsToImport.size(), "Saving products to database...", 0, 0);
            }

            if (rowsToImport.stream().anyMatch(row -> row.systemName() == null)) {
                importCatalogRows(brand, document, rowsToImport, counters, listener, catalogVersion);
            } else {
                importLegacyRows(brand, rowsToImport, counters, listener, catalogVersion);
            }
            if (!normalizedUnavailable.isEmpty()) {
                for (Product product : productRepository.findBySkuIn(normalizedUnavailable)) {
                    if (brand.getId().equals(product.getBrand().getId())) {
                        product.setIsAvailable(false);
                        productRepository.save(product);
                    }
                }
            }

            if (catalogVersion != null && catalogVersionRepository != null) {
                catalogVersion.setTotalProducts(counters.created + counters.updated);
                catalogVersion.setCreatedCount(counters.created);
                catalogVersion.setUpdatedCount(counters.updated);
                catalogVersionRepository.save(catalogVersion);
            }

            if (listener != null) {
                listener.onProgress(rowsToImport.size(), rowsToImport.size(), "Import complete!", counters.created + counters.updated, counters.imagesLinked);
            }
            return buildResponse(counters, List.of());
        } catch (IOException exception) {
            throw new IllegalArgumentException("The catalogue PDF could not be read", exception);
        }
    }

    private List<CatalogRow> selectRows(List<CatalogRow> rows, List<String> selectedSkus) {
        if (selectedSkus == null) {
            return rows;
        }
        Set<String> selected = normalizeSkuSet(selectedSkus);
        if (selected.isEmpty() || selected.size() != selectedSkus.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Select at least one unique product from the reviewed preview.");
        }
        Map<String, CatalogRow> rowsBySku = new HashMap<>();
        for (CatalogRow row : rows) {
            rowsBySku.put(row.sku().toUpperCase(Locale.ROOT), row);
        }
        if (!rowsBySku.keySet().containsAll(selected)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The selected SKUs no longer match the reviewed catalog. Run preview again.");
        }
        return rows.stream().filter(row -> selected.contains(row.sku().toUpperCase(Locale.ROOT))).toList();
    }

    private Set<String> normalizeSkuSet(java.util.Collection<String> skus) {
        if (skus == null || skus.isEmpty()) {
            return Set.of();
        }
        return skus.stream().filter(sku -> sku != null && !sku.isBlank())
                .map(sku -> sku.trim().toUpperCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
    }

    private String buildValidationMessage(CatalogParseResult catalog) {
        if (catalog.rows().isEmpty() && catalog.warnings().isEmpty()) {
            return "No supported product rows were found in the catalogue PDF.";
        }
        List<String> details = catalog.warnings().stream().limit(10).toList();
        String detail = details.isEmpty() ? "" : " " + String.join(" ", details);
        if (catalog.warnings().size() > details.size()) {
            detail += " Additional diagnostics were omitted from this error response.";
        }
        return "Catalogue import stopped before saving products because some candidate rows were ambiguous."
                + detail;
    }

    private void validateBrandOwnership(Brand brand, List<CatalogRow> rows) {
        for (Product existing : findProductsBySku(rows).values()) {
            if (existing.getBrand() != null && !brand.getId().equals(existing.getBrand().getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "SKU " + existing.getSku()
                                + " already belongs to brand \"" + existing.getBrand().getName()
                                + "\"; please deselect conflicting products before importing.");
            }
        }
    }

    private Map<String, Product> findProductsBySku(List<CatalogRow> rows) {
        if (rows.isEmpty()) {
            return Map.of();
        }
        Map<String, Product> productsBySku = new HashMap<>();
        for (int start = 0; start < rows.size(); start += 500) {
            List<String> skus = rows.subList(start, Math.min(start + 500, rows.size()))
                    .stream().map(CatalogRow::sku).toList();
            for (Product product : productRepository.findBySkuIn(skus)) {
                productsBySku.put(product.getSku().toUpperCase(Locale.ROOT), product);
            }
        }
        return productsBySku;
    }

    private String reviewToken(Path path, Long brandId) {
        try (var input = Files.newInputStream(path)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(("brand:" + brandId + "\n")
                    .getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Could not verify the uploaded catalogue file", exception);
        }
    }

    private void validateBrand(Brand brand) {
        if (brand == null || brand.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a valid product brand.");
        }
    }

    private CatalogParseResult parseCatalogRows(PDDocument document) throws IOException {
        return parseCatalogRows(document, null);
    }

    private CatalogParseResult parseCatalogRows(PDDocument document, CatalogProgressListener listener) throws IOException {
        CatalogParseResult catalog = parseGenericCatalogRows(document, listener);
        if (!catalog.rows().isEmpty() || catalog.skippedRows() > 0) {
            return catalog;
        }
        return parseLegacyCatalogRows(document);
    }

    private BulkUploadResponse buildResponse(ImportCounters counters, List<String> warnings) {
        if (counters.created + counters.updated == 0) {
            List<String> details = warnings.stream().limit(10).toList();
            String detail = details.isEmpty() ? "" : ". " + String.join(" ", details);
            if (warnings.size() > details.size()) {
                detail += " Additional unsupported rows were found on " + (warnings.size() - details.size())
                        + " more pages.";
            }
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "No supported product rows were found in the catalogue PDF" + detail);
        }

        return BulkUploadResponse.builder()
                .createdCount(counters.created)
                .updatedCount(counters.updated)
                .totalProcessed(counters.created + counters.updated)
                .imagesLinkedCount(counters.imagesLinked)
                .skippedCount(counters.skipped)
                .errors(warnings)
                .build();
    }

    CatalogParseResult parseGenericCatalogRows(PDDocument document) throws IOException {
        return parseGenericCatalogRows(document, null);
    }

    CatalogParseResult parseGenericCatalogRows(PDDocument document, CatalogProgressListener listener) throws IOException {
        List<PositionedTextLine> lines = new ArrayList<>();
        PDFTextStripper stripper = new PDFTextStripper() {
            @Override
            protected void writeString(String text, List<TextPosition> positions) {
                List<TextPosition> run = new ArrayList<>();
                double runEnd = Double.NaN;
                double baseline = Double.NaN;
                for (TextPosition position : positions) {
                    double x = position.getXDirAdj();
                    double y = position.getYDirAdj();
                    boolean newRun = !run.isEmpty()
                            && (Math.abs(y - baseline) > 2.5 || x - runEnd > 18);
                    if (newRun) {
                        addPositionedLine(lines, getCurrentPageNo(), run);
                        run.clear();
                    }
                    if (run.isEmpty()) {
                        baseline = y;
                    }
                    run.add(position);
                    runEnd = x + position.getWidthDirAdj();
                }
                addPositionedLine(lines, getCurrentPageNo(), run);
            }
        };
        stripper.setSortByPosition(true);
        stripper.getText(document);

        Set<Integer> candidatePages = lines.stream()
                .map(PositionedTextLine::pageNumber)
                .collect(java.util.stream.Collectors.toSet());

        List<ImageCandidate> images = extractImages(document, candidatePages);
        CatalogParseResult initialResult = CatalogLineParser.parsePositionedCandidates(lines, images, true, document, listener);
        List<CatalogRow> updatedRows = new ArrayList<>(initialResult.rows().size());
        Map<Integer, String> systemNameByPage = new HashMap<>();
        for (CatalogRow row : initialResult.rows()) {
            if (row.systemName() == null || row.systemName().equals("General Catalogue")) {
                String sys = systemNameByPage.computeIfAbsent(row.sourcePage(), pageNo -> {
                    try {
                        if (document != null && pageNo <= document.getNumberOfPages()) {
                            return detectSystemName(document.getPage(pageNo - 1));
                        }
                    } catch (Exception ignored) {}
                    return "General Catalogue";
                });
                updatedRows.add(new CatalogRow(row.sku(), row.name(), row.mrp(), row.sourcePage(), sys, row.size(), row.description(), row.hsnCode(), row.material(), row.materialCode(), row.itemCode(), row.imageBytes(), row.imageCandidate()));
            } else {
                updatedRows.add(row);
            }
        }
        return new CatalogParseResult(updatedRows, initialResult.warnings(), initialResult.skippedRows());
    }

    record ImageCandidate(int pageNumber, float x, float y, float width, float height, PDImage pdImage, byte[] preloadedBytes,
                           Supplier<BufferedImage> canvasSupplier, Rectangle cropBox,
                           java.util.concurrent.atomic.AtomicReference<byte[]> thumbCache,
                           java.util.concurrent.atomic.AtomicReference<byte[]> imgCache) {
        ImageCandidate(int pageNumber, float x, float y, float width, float height, PDImage pdImage, byte[] preloadedBytes) {
            this(pageNumber, x, y, width, height, pdImage, preloadedBytes, null, null,
                    new java.util.concurrent.atomic.AtomicReference<>(),
                    new java.util.concurrent.atomic.AtomicReference<>());
        }

        ImageCandidate(int pageNumber, float x, float y, float width, float height,
                       Supplier<BufferedImage> canvasSupplier, Rectangle cropBox) {
            this(pageNumber, x, y, width, height, null, null, canvasSupplier, cropBox,
                    new java.util.concurrent.atomic.AtomicReference<>(),
                    new java.util.concurrent.atomic.AtomicReference<>());
        }

        double centerX() { return x + width / 2.0; }
        double centerY() { return y + height / 2.0; }

        byte[] getImageBytes() {
            return getImageBytes(500);
        }

        byte[] getImageBytes(int maxDim) {
            if (preloadedBytes != null && preloadedBytes.length > 0) {
                return preloadedBytes;
            }
            if (imgCache.get() != null) {
                return imgCache.get();
            }
            if (pdImage != null) {
                try {
                    if (pdImage.getWidth() > 2500 || pdImage.getHeight() > 2500) {
                        return null; // Skip giant background or full page cover scans
                    }
                    BufferedImage bImg = pdImage.getImage();
                    byte[] bytes = compressImage(bImg, maxDim, 0.80f);
                    if (bytes != null) {
                        imgCache.set(bytes);
                    }
                    return bytes;
                } catch (Throwable ignored) {}
            }
            if (canvasSupplier != null && cropBox != null) {
                try {
                    BufferedImage canvas = canvasSupplier.get();
                    if (canvas != null) {
                        int cx = Math.max(0, cropBox.x);
                        int cy = Math.max(0, cropBox.y);
                        int cw = Math.min(cropBox.width, canvas.getWidth() - cx);
                        int ch = Math.min(cropBox.height, canvas.getHeight() - cy);
                        if (cw > 20 && ch > 20) {
                            BufferedImage cropped = canvas.getSubimage(cx, cy, cw, ch);
                            byte[] bytes = compressImage(cropped, maxDim, 0.80f);
                            if (bytes != null) {
                                imgCache.set(bytes);
                            }
                            return bytes;
                        }
                    }
                } catch (Throwable ignored) {}
            }
            return null;
        }

        byte[] getThumbnailBytes() {
            if (preloadedBytes != null && preloadedBytes.length > 0) {
                return createThumbnail(preloadedBytes, 100);
            }
            if (thumbCache.get() != null) {
                return thumbCache.get();
            }
            if (pdImage != null) {
                try {
                    if (pdImage.getWidth() > 1500 || pdImage.getHeight() > 1500) {
                        return null; // Skip decoding giant images for preview thumbnails
                    }
                    BufferedImage bImg = pdImage.getImage();
                    byte[] bytes = compressImage(bImg, 100, 0.65f);
                    if (bytes != null) {
                        thumbCache.set(bytes);
                    }
                    return bytes;
                } catch (Throwable ignored) {}
            }
            if (canvasSupplier != null && cropBox != null) {
                try {
                    BufferedImage canvas = canvasSupplier.get();
                    if (canvas != null) {
                        int cx = Math.max(0, cropBox.x);
                        int cy = Math.max(0, cropBox.y);
                        int cw = Math.min(cropBox.width, canvas.getWidth() - cx);
                        int ch = Math.min(cropBox.height, canvas.getHeight() - cy);
                        if (cw > 20 && ch > 20) {
                            BufferedImage cropped = canvas.getSubimage(cx, cy, cw, ch);
                            byte[] bytes = compressImage(cropped, 100, 0.65f);
                            if (bytes != null) {
                                thumbCache.set(bytes);
                            }
                            return bytes;
                        }
                    }
                } catch (Throwable ignored) {}
            }
            return null;
        }
    }

    List<ImageCandidate> extractImages(PDDocument document, Set<Integer> candidatePages) {
        List<ImageCandidate> images = new ArrayList<>();
        for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
            int pageNumber = pageIndex + 1;
            if (candidatePages != null && !candidatePages.contains(pageNumber)) {
                continue;
            }
            PDPage page = document.getPage(pageIndex);
            PDResources resources = page.getResources();
            if (resources == null) continue;
            Iterable<COSName> xNames = resources.getXObjectNames();
            if (xNames == null || !xNames.iterator().hasNext()) {
                continue;
            }
            float pageHeight = page.getMediaBox().getHeight();
            ImageStreamExtractor extractor = new ImageStreamExtractor(page, pageNumber, pageHeight);
            try {
                extractor.processPage(page);
                images.addAll(extractor.getImages());
            } catch (Throwable ignored) {
            }

            if (extractor.getImages().isEmpty()) {
                try {
                    int fallbackCount = 0;
                    for (COSName xName : resources.getXObjectNames()) {
                        if (fallbackCount >= 20) break;
                        try {
                            PDXObject xObject = resources.getXObject(xName);
                            if (xObject instanceof PDImageXObject imgObj) {
                                if (imgObj.getWidth() < 25 || imgObj.getHeight() < 25
                                        || imgObj.getWidth() > 2500 || imgObj.getHeight() > 2500) {
                                    continue;
                                }
                                images.add(new ImageCandidate(pageNumber, 50, 50, 150, 150, imgObj, null));
                                fallbackCount++;
                            }
                        } catch (Throwable ignored) {
                        }
                    }
                } catch (Throwable ignored) {
                }
            }
        }
        return images;
    }

    private static class ImageStreamExtractor extends org.apache.pdfbox.contentstream.PDFGraphicsStreamEngine {
        private final int pageNumber;
        private final float pageHeight;
        private final List<ImageCandidate> pageImages = new ArrayList<>();
        private int formDepth = 0;

        ImageStreamExtractor(PDPage page, int pageNumber, float pageHeight) {
            super(page);
            this.pageNumber = pageNumber;
            this.pageHeight = pageHeight;
        }

        List<ImageCandidate> getImages() {
            return pageImages;
        }

        @Override
        protected void processOperator(Operator operator, List<COSBase> operands) throws IOException {
            String name = operator.getName();
            if ("Do".equals(name)) {
                if (formDepth > 2) return;
                formDepth++;
                try {
                    super.processOperator(operator, operands);
                } finally {
                    formDepth--;
                }
            } else if ("q".equals(name) || "Q".equals(name) || "cm".equals(name)) {
                super.processOperator(operator, operands);
            }
        }

        @Override
        public void drawImage(PDImage pdImage) {
            try {
                Matrix ctm = getGraphicsState().getCurrentTransformationMatrix();
                float x = ctm.getTranslateX();
                float y = ctm.getTranslateY();
                float width = Math.abs(ctm.getScalingFactorX());
                float height = Math.abs(ctm.getScalingFactorY());
                float topY = pageHeight - (y + height);

                if (width < 25 || height < 25) {
                    return;
                }
                if (width > 500 || height > 650 || (width > pageHeight * 0.70f && height > pageHeight * 0.70f)) {
                    return; // Skip page-sized backgrounds and banners
                }
                if (pdImage.getWidth() > 2500 || pdImage.getHeight() > 2500) {
                    return; // Skip giant resolution cover or scan images
                }
                if (pageImages.size() >= 20) {
                    return;
                }

                pageImages.add(new ImageCandidate(pageNumber, x, topY, width, height, pdImage, null));
            } catch (Throwable ignored) {
            }
        }

        @Override public void appendRectangle(java.awt.geom.Point2D p0, java.awt.geom.Point2D p1, java.awt.geom.Point2D p2, java.awt.geom.Point2D p3) {}
        @Override public void clip(int windingRule) {}
        @Override public void moveTo(float x, float y) {}
        @Override public void lineTo(float x, float y) {}
        @Override public void curveTo(float x1, float y1, float x2, float y2, float x3, float y3) {}
        @Override public java.awt.geom.Point2D getCurrentPoint() { return new java.awt.geom.Point2D.Float(0, 0); }
        @Override public void closePath() {}
        @Override public void endPath() {}
        @Override public void strokePath() {}
        @Override public void fillPath(int windingRule) {}
        @Override public void fillAndStrokePath(int windingRule) {}
        @Override public void shadingFill(COSName shadingName) {}
    }

    static byte[] compressImage(BufferedImage original, int maxDimension) {
        return compressImage(original, maxDimension, 0.80f);
    }

    static byte[] compressImage(BufferedImage original, int maxDimension, float quality) {
        if (original == null) return null;
        try {
            int width = original.getWidth();
            int height = original.getHeight();
            if (width <= 0 || height <= 0) return null;

            double scale = 1.0;
            if (width > maxDimension || height > maxDimension) {
                scale = Math.min((double) maxDimension / width, (double) maxDimension / height);
            }
            int targetWidth = Math.max(1, (int) Math.round(width * scale));
            int targetHeight = Math.max(1, (int) Math.round(height * scale));

            BufferedImage rgbImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g2d = rgbImage.createGraphics();
            try {
                g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                        java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g2d.setColor(java.awt.Color.WHITE);
                g2d.fillRect(0, 0, targetWidth, targetHeight);
                g2d.drawImage(original, 0, 0, targetWidth, targetHeight, null);
            } finally {
                g2d.dispose();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            javax.imageio.ImageWriter writer = null;
            java.util.Iterator<javax.imageio.ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
            if (writers.hasNext()) {
                writer = writers.next();
                try (javax.imageio.stream.ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
                    writer.setOutput(ios);
                    javax.imageio.ImageWriteParam param = writer.getDefaultWriteParam();
                    if (param.canWriteCompressed()) {
                        param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                        param.setCompressionQuality(quality);
                    }
                    writer.write(null, new javax.imageio.IIOImage(rgbImage, null, null), param);
                } finally {
                    writer.dispose();
                }
            } else {
                ImageIO.write(rgbImage, "jpg", baos);
            }
            return baos.toByteArray();
        } catch (Throwable t) {
            return null;
        }
    }

    static byte[] createThumbnail(byte[] input, int maxDim) {
        if (input == null || input.length == 0) return null;
        try {
            BufferedImage img = ImageIO.read(new java.io.ByteArrayInputStream(input));
            if (img == null) return input;
            return compressImage(img, maxDim, 0.65f);
        } catch (Throwable ignored) {
            return input;
        }
    }

    static void addPositionedLine(List<PositionedTextLine> lines, int pageNumber,
                                  List<TextPosition> positions) {
        if (positions.isEmpty()) {
            return;
        }
        List<TextPosition> currentSegment = new ArrayList<>();
        double lastEndX = -1;

        for (TextPosition position : positions) {
            double curX = position.getXDirAdj();
            if (lastEndX >= 0 && (curX - lastEndX) > 28.0) {
                flushTextSegment(lines, pageNumber, currentSegment);
                currentSegment.clear();
            }
            currentSegment.add(position);
            lastEndX = Math.max(lastEndX, curX + position.getWidthDirAdj());
        }
        if (!currentSegment.isEmpty()) {
            flushTextSegment(lines, pageNumber, currentSegment);
        }
    }

    private static void flushTextSegment(List<PositionedTextLine> lines, int pageNumber,
                                         List<TextPosition> positions) {
        if (positions.isEmpty()) return;
        StringBuilder text = new StringBuilder();
        double x = positions.get(0).getXDirAdj();
        double y = 0;
        double endX = x;
        for (TextPosition position : positions) {
            text.append(position.getUnicode());
            y += position.getYDirAdj();
            endX = Math.max(endX, position.getXDirAdj() + position.getWidthDirAdj());
        }
        String normalized = text.toString().replaceAll("\\s+", " ").trim();
        if (!normalized.isBlank()) {
            lines.add(new PositionedTextLine(pageNumber, y / positions.size(), x, endX, normalized));
        }
    }

    private CatalogParseResult parseLegacyCatalogRows(PDDocument document) throws IOException {
        List<CatalogRow> rows = new ArrayList<>();
        List<String> unsupportedRows = new ArrayList<>();
        for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
            PDPage page = document.getPage(pageIndex);
            String systemName = detectSystemName(page);
            float middle = page.getMediaBox().getWidth() / 2f;
            List<ProductFamily> families = new ArrayList<>();
            String left = extractColumn(page, "left", 0, middle);
            String right = extractColumn(page, "right", middle, page.getMediaBox().getWidth() - middle);
            detectUnsupportedLegacyRows(left, pageIndex + 1, unsupportedRows);
            detectUnsupportedLegacyRows(right, pageIndex + 1, unsupportedRows);
            families.addAll(parseFamilies(left, pageIndex + 1));
            families.addAll(parseFamilies(right, pageIndex + 1));
            for (ProductFamily family : families) {
                for (CatalogVariant variant : family.variants()) {
                    rows.add(new CatalogRow(variant.sku(), family.name(), variant.mrp(), pageIndex + 1,
                            systemName, variant.size(), family.hsnCode()));
                }
            }
        }

        Map<String, CatalogRow> bySku = new LinkedHashMap<>();
        Set<String> conflicts = new HashSet<>();
        List<String> warnings = new ArrayList<>(unsupportedRows);
        for (CatalogRow row : rows) {
            String key = row.sku().toUpperCase(Locale.ROOT);
            CatalogRow existing = bySku.putIfAbsent(key, row);
            if (existing == null || conflicts.contains(key)) {
                continue;
            }
            if (!existing.name().equalsIgnoreCase(row.name())
                    || existing.mrp().compareTo(row.mrp()) != 0
                    || !java.util.Objects.equals(existing.size(), row.size())
                    || !java.util.Objects.equals(existing.hsnCode(), row.hsnCode())
                    || !java.util.Objects.equals(existing.material(), row.material())
                    || !java.util.Objects.equals(existing.materialCode(), row.materialCode())
                    || !java.util.Objects.equals(existing.itemCode(), row.itemCode())) {
                bySku.remove(key);
                conflicts.add(key);
                warnings.add("Conflicting catalogue SKU " + row.sku() + " on pages "
                        + existing.sourcePage() + " and " + row.sourcePage() + ": \""
                        + existing.name() + "\" at " + existing.mrp() + " vs \""
                        + row.name() + "\" at " + row.mrp() + ".");
            }
        }
        return new CatalogParseResult(new ArrayList<>(bySku.values()), warnings,
                unsupportedRows.size() + conflicts.size());
    }

    private void detectUnsupportedLegacyRows(String text, int pageNumber, List<String> unsupportedRows) {
        for (String rawLine : text.split("\\R")) {
            String line = rawLine.replace('\uFFFD', ' ').replaceAll("\\s+", " ").trim();
            if (line.isBlank() || isNoise(line) || HSN_PATTERN.matcher(line).find()) {
                continue;
            }
            if (LEGACY_SKU_CANDIDATE.matcher(line).find() && !ROW_PATTERN.matcher(line).matches()) {
                unsupportedRows.add(skippedRowWarning(pageNumber, line,
                        "its numeric SKU, name, or price was incomplete"));
            }
        }
    }

    private static String skippedRowWarning(int pageNumber, String line, String reason) {
        String excerpt = line.length() > 180 ? line.substring(0, 177) + "..." : line;
        return "Page " + pageNumber + ": rejected catalogue row \"" + excerpt + "\" because " + reason + ".";
    }

    private void importLegacyRows(Brand brand, List<CatalogRow> rows, ImportCounters counters) {
        importLegacyRows(brand, rows, counters, null, null);
    }

    private void importLegacyRows(Brand brand, List<CatalogRow> rows, ImportCounters counters,
                                  CatalogProgressListener listener, CatalogVersion catalogVersion) {
        Map<LegacyFamilyKey, ProductFamily> families = new LinkedHashMap<>();
        for (CatalogRow row : rows) {
            LegacyFamilyKey familyKey = new LegacyFamilyKey(
                    row.sourcePage(), row.systemName(), row.name(), row.hsnCode());
            ProductFamily family = families.computeIfAbsent(familyKey, ignored ->
                    new ProductFamily(row.name(), row.hsnCode(), new ArrayList<>()));
            family.variants().add(new CatalogVariant(row.sku(), row.size(), row.mrp(),
                    row.material(), row.materialCode(), row.itemCode(), row.description(), row.effectiveImageBytes()));
        }
        for (Map.Entry<LegacyFamilyKey, ProductFamily> entry : families.entrySet()) {
            importFamilies(brand, entry.getKey().systemName(), entry.getKey().pageNumber(),
                    List.of(entry.getValue()), counters, listener, rows.size(), catalogVersion);
        }
    }

    private void importCatalogRows(Brand brand, PDDocument document, List<CatalogRow> rows,
                                   ImportCounters counters) throws IOException {
        importCatalogRows(brand, document, rows, counters, null, null);
    }

    private void importCatalogRows(Brand brand, PDDocument document, List<CatalogRow> rows,
                                   ImportCounters counters, CatalogProgressListener listener,
                                   CatalogVersion catalogVersion) throws IOException {
        Map<Integer, List<CatalogRow>> rowsByPage = new LinkedHashMap<>();
        for (CatalogRow row : rows) {
            rowsByPage.computeIfAbsent(row.sourcePage(), ignored -> new ArrayList<>()).add(row);
        }

        for (Map.Entry<Integer, List<CatalogRow>> entry : rowsByPage.entrySet()) {
            int pageNumber = entry.getKey();
            List<CatalogRow> pageRows = entry.getValue();
            List<ProductFamily> families = new ArrayList<>();
            for (CatalogRow row : pageRows) {
                ProductFamily family = new ProductFamily(row.name(), row.hsnCode(),
                        new ArrayList<>(List.of(new CatalogVariant(row.sku(), row.size(), row.mrp(),
                                row.material(), row.materialCode(), row.itemCode(), row.description(), row.effectiveImageBytes()))));
                families.add(family);
            }
            String systemName = detectSystemName(document.getPage(pageNumber - 1));
            importFamilies(brand, systemName, pageNumber, families, counters, listener, rows.size(), catalogVersion);
        }
    }

    private void importFamilies(Brand brand, String systemName, int pageNumber,
                                List<ProductFamily> families, ImportCounters counters) {
        importFamilies(brand, systemName, pageNumber, families, counters, null, 0, null);
    }

    private void importFamilies(Brand brand, String systemName, int pageNumber,
                                List<ProductFamily> families, ImportCounters counters,
                                CatalogProgressListener listener, int totalExpected) {
        importFamilies(brand, systemName, pageNumber, families, counters, listener, totalExpected, null);
    }

    private void importFamilies(Brand brand, String systemName, int pageNumber,
                                List<ProductFamily> families, ImportCounters counters,
                                CatalogProgressListener listener, int totalExpected,
                                CatalogVersion catalogVersion) {
        if (families.isEmpty()) {
            return;
        }
        Category category = findOrCreateCategory(systemName);

        for (ProductFamily family : families) {
            for (CatalogVariant variant : family.variants()) {
                Product product = productRepository.findBySku(variant.sku()).orElse(null);
                boolean created = product == null;
                BigDecimal oldMrp = created ? null : product.getMrp();
                BigDecimal oldSellingPrice = created ? null : product.getSellingPrice();

                if (created) {
                    product = new Product();
                    product.setSku(variant.sku());
                    product.setStockQuantity(0);
                    product.setReorderLevel(10);
                    product.setUnit("Piece");
                }

                String safeName = (family.name() != null && !family.name().isBlank()) ? limit(family.name(), 200) : "--";
                product.setName(safeName);
                product.setDescription(variant.description() != null && !variant.description().isBlank() ? variant.description() : "--");
                product.setSize(variant.size() != null && !variant.size().isBlank() ? limit(variant.size(), 100) : "--");
                String specSize = variant.size() != null && !variant.size().equals("--") ? "; Size: " + variant.size() : "";
                product.setSpecifications("Source PDF page: " + pageNumber + specSize);
                product.setBarcode(null);
                product.setPurchasePrice(null);
                product.setGstRate(null);
                product.setColor(null);
                product.setMaterial(variant.material() != null && !variant.material().isBlank() ? variant.material() : "--");
                product.setMaterialCode(variant.materialCode() != null && !variant.materialCode().isBlank() ? variant.materialCode() : "--");
                product.setItemCode(variant.itemCode() != null && !variant.itemCode().isBlank() ? variant.itemCode() : "--");
                product.setBrand(brand);
                product.setCategory(category);
                product.setHsnCode(family.hsnCode() != null && !family.hsnCode().isBlank() ? family.hsnCode() : "--");
                BigDecimal safeMrp = variant.mrp() != null ? variant.mrp() : BigDecimal.ZERO;
                product.setMrp(safeMrp);
                product.setSellingPrice(safeMrp);
                product.setIsActive(true);
                if (product.getIsFeatured() == null) product.setIsFeatured(false);

                product = productRepository.save(product);

                // Option B: Record price history snapshot for catalog version & rollback
                if (catalogVersion != null && productPriceHistoryRepository != null) {
                    String changeType = created ? "CREATED" : (oldMrp != null && oldMrp.compareTo(safeMrp) == 0 ? "UNCHANGED" : "UPDATED");
                    ProductPriceHistory history = ProductPriceHistory.builder()
                            .catalogVersion(catalogVersion)
                            .product(product)
                            .sku(product.getSku())
                            .oldMrp(oldMrp)
                            .newMrp(safeMrp)
                            .oldSellingPrice(oldSellingPrice)
                            .newSellingPrice(safeMrp)
                            .changeType(changeType)
                            .build();
                    productPriceHistoryRepository.save(history);
                }

                if (variant.imageBytes() != null && variant.imageBytes().length > 0 && fileUploadService != null && productImageRepository != null) {
                    try {
                        String storedPath = fileUploadService.storeGeneratedFile(variant.imageBytes(), ".jpg", "products");
                        String downloadUri = "/api/files/download/" + storedPath;
                        ProductImage imgEntity = new ProductImage();
                        imgEntity.setProduct(product);
                        imgEntity.setImageUrl(downloadUri);
                        imgEntity.setIsPrimary(true);
                        imgEntity.setDisplayOrder(1);
                        productImageRepository.save(imgEntity);
                        counters.imagesLinked++;
                    } catch (Exception ignored) {
                    }
                }

                if (created) counters.created++;
                else counters.updated++;

                if (listener != null && totalExpected > 0 && (counters.created + counters.updated) % 25 == 0) {
                    listener.onProgress(counters.created + counters.updated, totalExpected,
                            "Saved product " + (counters.created + counters.updated) + " of " + totalExpected + " to database...",
                            counters.created + counters.updated, counters.imagesLinked);
                }
            }
        }
    }

    private List<ProductFamily> parseFamilies(String text, int pageNumber) {
        List<ProductFamily> families = new ArrayList<>();
        String candidateHeading = null;
        ProductFamily current = null;

        for (String rawLine : text.split("\\R")) {
            String line = rawLine.replace('\uFFFD', ' ').replaceAll("\\s+", " ").trim();
            if (line.isBlank() || isNoise(line)) continue;

            Matcher hsn = HSN_PATTERN.matcher(line);
            if (hsn.find()) {
                if (current != null) current.hsnCode = hsn.group(1);
                continue;
            }

            Matcher row = ROW_PATTERN.matcher(line);
            if (row.matches()) {
                if (current == null || !current.name().equals(candidateHeading)) {
                    if (current != null && !current.variants().isEmpty()) families.add(current);
                    current = new ProductFamily(cleanHeading(candidateHeading), null, new ArrayList<>());
                }
                try {
                    String size = extractSizeIgnoreQuantity(row.group(1));
                    current.variants().add(new CatalogVariant(
                            row.group(2), size,
                            new BigDecimal(row.group(3).replace(",", ""))));
                } catch (NumberFormatException ignored) {
                }
                continue;
            }

            if (looksLikeHeading(line)) {
                if (current != null && !current.variants().isEmpty()) {
                    families.add(current);
                    current = null;
                }
                candidateHeading = line;
            }
        }
        if (current != null && !current.variants().isEmpty()) families.add(current);
        return families;
    }

    private String extractColumn(PDPage page, String regionName, float x, float width) throws IOException {
        PDFTextStripperByArea stripper = new PDFTextStripperByArea();
        stripper.setSortByPosition(true);
        stripper.addRegion(regionName, new Rectangle(Math.round(x), 0, Math.round(width),
                Math.round(page.getMediaBox().getHeight())));
        stripper.extractRegions(page);
        return stripper.getTextForRegion(regionName);
    }

    private String detectSystemName(PDPage page) throws IOException {
        String pageText = extractColumn(page, "system", 0, page.getMediaBox().getWidth());
        for (String line : pageText.split("\\R")) {
            String value = line.replaceAll("\\s+", " ").trim();
            String upper = value.toUpperCase(Locale.ROOT);
            if (value.length() <= 100 && (upper.contains("PLUMBING SYSTEM")
                    || upper.contains("DRAINAGE SYSTEM") || upper.startsWith("SWR PIPES")
                    || upper.contains("SEWAGE SOLUTIONS"))) {
                return value;
            }
        }
        return "General Catalogue";
    }

    private Category findOrCreateCategory(String systemName) {
        String categoryName = limit(systemName, 100);
        return categoryRepository.findByName(categoryName).orElseGet(() -> {
            Category category = new Category();
            category.setName(categoryName);
            category.setDescription("Imported product system from a brand catalogue");
            category.setIsActive(true);
            return categoryRepository.save(category);
        });
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a PDF file to upload.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only PDF catalogues are supported.");
        }
        try (java.io.InputStream is = file.getInputStream()) {
            byte[] header = new byte[5];
            int read = is.read(header);
            if (read < 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uploaded file does not have valid PDF magic bytes (%PDF-).");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to inspect file: " + e.getMessage());
        }
    }

    private boolean isNoise(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        return lower.contains("part no") || lower.contains("taxes/pc") || lower.startsWith("size ")
                || line.startsWith("(") || lower.contains("pkg. qty") || lower.contains("std. box")
                || lower.contains("warranty applicable")
                || lower.contains("manufactured from") || lower.contains("introducing shortly")
                || lower.matches("^(revised|speciality|new|first in india).*$") || line.matches("^\\d+$");
    }

    private boolean looksLikeHeading(String line) {
        return line.length() >= 3 && line.length() <= 100 && !line.matches(".*\\d{7,10}.*")
                && !line.matches("^[\\d.,/\\- xX]+$");
    }

    private String cleanHeading(String heading) {
        return heading == null || heading.isBlank() ? "Catalogue Product" : limit(heading.trim(), 140);
    }

    public static String extractSizeIgnoreQuantity(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String text = value.replaceAll("(?i)^(size\\s*)+", "").replaceAll("\\s+", " ").trim();

        String[] tokens = text.split("\\s+");
        int end = tokens.length;
        int strippedCount = 0;

        while (end > 0 && strippedCount < 2) {
            String token = tokens[end - 1];
            if (token.matches("^[-–—]+$") || token.matches("^(?i)(na|n/a)$")) {
                end--;
                strippedCount++;
            } else if (token.matches("^\\d+$")) {
                int val;
                try {
                    val = Integer.parseInt(token);
                } catch (NumberFormatException e) {
                    break;
                }
                if (val >= 5) {
                    end--;
                    strippedCount++;
                } else if (strippedCount == 1) {
                    end--;
                    strippedCount++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if (end == 0) {
            return null;
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < end; i++) {
            if (i > 0) sb.append(" ");
            sb.append(tokens[i]);
        }
        String sizeText = sb.toString().trim();

        Matcher compoundMatcher = Pattern.compile("^(\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?)\\s+(.+)$").matcher(sizeText);
        if (compoundMatcher.matches()) {
            String cmPart = compoundMatcher.group(1).trim();
            String inchPart = compoundMatcher.group(2).trim();
            return inchPart + "\" (" + cmPart + " cm)";
        }

        Matcher singleMatcher = Pattern.compile("^(\\d+(?:\\.\\d+)?)\\s+([0-9½¾¼/]+)$").matcher(sizeText);
        if (singleMatcher.matches()) {
            String cmPart = singleMatcher.group(1).trim();
            String inchPart = singleMatcher.group(2).trim();
            return inchPart + "\" (" + cmPart + " cm)";
        }

        return sizeText;
    }

    private String cleanVariant(String value) {
        return extractSizeIgnoreQuantity(value);
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    static final class CatalogLineParser {
        private static final String PRICE_PREFIX = "(?:(?:Rs\\.?|INR|[t₹<$€£?]|['’]\\s*\\(?)\\s*)";
        private static final String PRICE_VALUE = "((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?)";
        private static final String PRICE_MARKER = "(?i)(?:\\bRs\\.?|\\bINR\\b|[₹$€£]|"
                + "(?-i:(?<![A-Za-z0-9])t(?=\\s*\\d))|['’]\\s*\\(?\\s*(?=\\d))";
        private static final String PRICE_NUMBER = "(\\d{1,3}(?:,\\s*\\d{3})+|\\d+)(?:\\.\\d{2})?";
        private static final Pattern PRICE_TOKEN = Pattern.compile(
                PRICE_MARKER + "\\s*" + PRICE_NUMBER + "(?:\\s*[/|1-]+)?(?![\\dA-Za-z,.])");
        private static final Pattern PRICE_MARKER_ONLY = Pattern.compile(PRICE_MARKER);
        private static final Pattern MAPPED_RUPEE_PRICE = Pattern.compile(
                "(?i)^I\\s*((?:\\d{1,3}(?:,\\d{3})+|\\d{4,6})(?:\\.\\d{2})?)$");
        private static final Pattern SPLIT_ALPHA_NUMERIC_SKU = Pattern.compile(
                "^([A-Z][A-Z0-9-]{3,20})\\s+([A-Z])\\s+(\\d{1,2})\\s+(.+)$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern SPLIT_NUMERIC_SKU = Pattern.compile(
                "^([A-Z][A-Z0-9-]{2,20})\\s+(\\d)\\s+([A-Z].+)$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern SKU_FIRST_PRODUCT = Pattern.compile(
                "^([A-Z0-9./-]{3,30})\\s+(.+)$", Pattern.CASE_INSENSITIVE);
        private static final Pattern NAME_FIRST_PRODUCT = Pattern.compile(
                "^(.+?)\\s+([A-Z0-9./-]{3,30})$", Pattern.CASE_INSENSITIVE);
        private static final Pattern SKU_FIRST_ROW = Pattern.compile(
                "^([A-Z][A-Z0-9-]{3,20})\\s+(.+?)\\s+" + PRICE_PREFIX + PRICE_VALUE + "$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern NAME_FIRST_ROW = Pattern.compile(
                "^(.+?)\\s+([A-Z][A-Z0-9-]{3,20})\\s+" + PRICE_PREFIX + PRICE_VALUE + "$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern STRICT_SKU_TOKEN = Pattern.compile(
                "(?<![A-Z0-9-])[A-Z][A-Z0-9-]{3,20}(?![A-Z0-9-])",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern BROAD_SKU_TOKEN = Pattern.compile(
                "(?<![A-Z0-9./-])[A-Z0-9./-]{3,30}(?![A-Z0-9./-])",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern CURRENCY_MARKER = Pattern.compile(
                "(?i)(?:^|\\s)(?:Rs\\.?|INR|[₹<$€£?]|t|['’]\\s*\\(?)(?=\\s*"
                        + "(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?(?:\\s|$))");
        private static final Pattern LABELED_FIELD = Pattern.compile(
                "(?i)\\b(HSN(?:\\s*CODE)?|MATERIAL\\s*CODE|ITEM\\s*(?:/\\s*PRODUCT\\s*)?CODE|"
                        + "PRODUCT\\s*CODE|MATERIAL)\\s*[:#]\\s*([A-Z0-9][A-Z0-9./-]{0,39})\\b");
        private static final Set<String> COMMON_WORDS = Set.of(
                "AND", "FOR", "THE", "SIZE", "WITH", "PACK", "PIECE", "PIECES", "WHITE",
                "COLOR", "COLOUR", "INCH", "INCHES", "TYPE", "SET", "STANDARD", "SPECIAL");

        private CatalogLineParser() {
        }

        private static boolean isBrochureOrPrefacePage(List<PositionedTextLine> lines) {
            if (lines == null || lines.isEmpty()) return true;
            int pageNo = lines.get(0).pageNumber();
            if (pageNo > 5) return false;
            String fullText = lines.stream().map(PositionedTextLine::text).collect(java.util.stream.Collectors.joining(" ")).toLowerCase(Locale.ROOT);
            boolean hasBrochureTerms = fullText.contains("since 1952")
                    || fullText.contains("milestones")
                    || fullText.contains("company profile")
                    || fullText.contains("display studios")
                    || fullText.contains("manufacturing plants")
                    || fullText.contains("dealers and retailers")
                    || fullText.contains("evolve-where")
                    || fullText.contains("brand campaign")
                    || fullText.contains("network of dealers");
            if (hasBrochureTerms) {
                long priceCount = lines.stream().filter(l -> l.text().matches("(?i).*₹\\s*\\d+.*|.*Rs\\.?\\s*\\d+.*")).count();
                return priceCount < 2;
            }
            return false;
        }

        record ExtractedDetails(String cleanName, String size, String description) {}

        private static ExtractedDetails extractDetails(String rawName, String rawText) {
            if (rawName == null || rawName.isBlank() || rawName.equals("--")) {
                return new ExtractedDetails("--", "--", "--");
            }
            String text = (rawText != null && !rawText.isBlank()) ? rawText : rawName;
            String name = rawName.trim();
            String size = null;
            String description = null;

            Matcher dim3D = Pattern.compile("(?i)\\b(\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?(?:\\s*x\\s*\\d+(?:\\.\\d+)?)?\\s*(?:mm|cm|mtr|inch|in)?)\\b").matcher(text);
            if (dim3D.find()) {
                size = dim3D.group(1).replaceAll("\\s+", " ").trim();
                // Strip compound multi-axis dimensions from name as they are pure annotations, not part of the product identity
                String nameAfter3D = name.replace(dim3D.group(0), " ").replaceAll("\\s+", " ").trim();
                if (!nameAfter3D.isBlank() && !nameAfter3D.equals("--") && !isPriceOnly(nameAfter3D)) {
                    name = nameAfter3D;
                } else {
                    size = null; // Name would be empty after stripping — keep name intact
                }
            }

            if (size == null) {
                // Extract 1D size as metadata only — do NOT strip from name, as single-unit dimensions
                // like "1.5 inch" and "15mm" are frequently part of the product identity in plumbing fittings
                Matcher dim1D = Pattern.compile("(?i)(?:\\(|\\b)(\\d+(?:\\.\\d+)?\\s*(?:mm|cm|mtr|meter|inch|in|ft|feet|ltr|l|bar|\"|''))(?:\\)|\\b)").matcher(text);
                if (dim1D.find()) {
                    size = dim1D.group(1).trim();
                }
            }            Matcher specMatcher = Pattern.compile("(?i)\\b(To be f[i]tted with concealed body|With UF Seat Cover|Soft close Seat Cover|Concealed (?:S|P|SIP|S/P)[- ]?Trap|Floor Mounted|Wall Hung|Table Top|Slim Seat Cover|Single Lever (?:Concealed Diverter|Wall Mixer)|Bath Tub Spout (?:with [^,]+)?|Thermostat Diverter(?: - (?:Two|Three) Way)?)\\b").matcher(text);
            if (specMatcher.find()) {
                description = specMatcher.group(1).trim();
            }

            Matcher parenSpec = Pattern.compile("\\((Trim \\+ Body|Trim Only|Body|Upper Trim|Diverter Body)\\)", Pattern.CASE_INSENSITIVE).matcher(text);
            if (parenSpec.find()) {
                String pDesc = parenSpec.group(1).trim();
                description = description == null ? pDesc : description + "; " + pDesc;
            }

            name = name.replaceAll("(?i)\\bDimensions\\s*[:#]?", " ")
                       .replaceAll("(?i)\\b(?:White|Moon\\s*Ivory|Color)\\b", " ")
                       .replaceAll("\\(\\s*(?:\\d+(?:[.,]\\d+)?\\s*(?:mm|cm|mtr|inch|in|ft|ltr|l|bar)(?:\\s*x\\s*\\d+(?:[.,]\\d+)?\\s*(?:mm|cm|mtr|inch|in|ft|ltr|l|bar)?)*)\\s*\\)", " ")
                       .replaceAll("\\s+", " ").trim();
            while (name.startsWith("-") || name.startsWith("–") || name.startsWith(":")) {
                name = name.substring(1).trim();
            }
            if (name.isBlank() || isPriceOnly(name) || name.matches("^[\\d.,/\\- xX]+$")) {
                name = "--";
            }

            return new ExtractedDetails(
                    name,
                    (size != null && !size.isBlank()) ? size : "--",
                    (description != null && !description.isBlank()) ? description : "--"
            );
        }

        static CatalogParseResult parsePositioned(List<PositionedTextLine> lines) {
            return parsePositioned(lines, List.of(), false);
        }

        static CatalogParseResult parsePositioned(List<PositionedTextLine> lines,
                                                  List<PositionedImage> images,
                                                  boolean exhaustive) {
            List<ImageCandidate> candidates = images == null ? List.of() :
                    images.stream().map(img -> new ImageCandidate(img.pageNumber(), (float) img.x(), (float) img.y(), (float) img.width(), (float) img.height(), null, img.imageBytes())).toList();
            return parsePositionedCandidates(lines, candidates, exhaustive);
        }

        static CatalogParseResult parsePositionedCandidates(List<PositionedTextLine> lines,
                                                            List<ImageCandidate> images,
                                                            boolean exhaustive) {
            return parsePositionedCandidates(lines, images, exhaustive, null);
        }

        static CatalogParseResult parsePositionedCandidates(List<PositionedTextLine> lines,
                                                            List<ImageCandidate> images,
                                                            boolean exhaustive,
                                                            PDDocument document) {
            return parsePositionedCandidates(lines, images, exhaustive, document, null);
        }

        static CatalogParseResult parsePositionedCandidates(List<PositionedTextLine> lines,
                                                            List<ImageCandidate> images,
                                                            boolean exhaustive,
                                                            PDDocument document,
                                                            CatalogProgressListener listener) {
            if (lines == null || lines.isEmpty()) {
                return new CatalogParseResult(List.of(), List.of(), 0);
            }

            Map<Integer, List<PositionedTextLine>> linesByPage = new LinkedHashMap<>();
            for (PositionedTextLine line : lines) {
                linesByPage.computeIfAbsent(line.pageNumber(), ignored -> new ArrayList<>()).add(line);
            }

            Map<Integer, List<ImageCandidate>> imagesByPage = new HashMap<>();
            if (images != null) {
                for (ImageCandidate img : images) {
                    imagesByPage.computeIfAbsent(img.pageNumber(), ignored -> new ArrayList<>()).add(img);
                }
            }

            List<CatalogRow> allRows = new ArrayList<>();
            List<String> allWarnings = new ArrayList<>();
            int totalSkipped = 0;
            Map<Integer, BufferedImage> pageCanvasCache = new java.util.concurrent.ConcurrentHashMap<>();

            int totalPages = linesByPage.size();
            int pageIdx = 0;
            for (Map.Entry<Integer, List<PositionedTextLine>> entry : linesByPage.entrySet()) {
                pageIdx++;
                int pageNo = entry.getKey();
                List<PositionedTextLine> pageLines = entry.getValue();
                List<ImageCandidate> pageImages = imagesByPage.getOrDefault(pageNo, List.of());
                PageParseResult pageResult = parsePage(pageLines, pageImages, exhaustive, document, pageCanvasCache);
                allRows.addAll(pageResult.rows());
                allWarnings.addAll(pageResult.warnings());
                totalSkipped += pageResult.skippedRows();

                if (listener != null) {
                    listener.onProgress(pageIdx, totalPages,
                            "Scanned page " + pageNo + " of " + totalPages + " (" + allRows.size() + " products found)",
                            allRows.size(), images != null ? images.size() : 0);
                }
            }

            return collapseDuplicates(allRows, allWarnings, totalSkipped, exhaustive);
        }

        private record PageParseResult(List<CatalogRow> rows, List<String> warnings, int skippedRows) {}

        private static PageParseResult parsePage(List<PositionedTextLine> lines,
                                                  List<ImageCandidate> images,
                                                  boolean exhaustive) {
            return parsePage(lines, images, exhaustive, null, null);
        }

        private static PageParseResult parsePage(List<PositionedTextLine> lines,
                                                  List<ImageCandidate> images,
                                                  boolean exhaustive,
                                                  PDDocument document,
                                                  Map<Integer, BufferedImage> pageCanvasCache) {
            if (isBrochureOrPrefacePage(lines)) {
                return new PageParseResult(List.of(), List.of(), 0);
            }
            List<PositionedProduct> products = new ArrayList<>();
            List<PositionedPrice> prices = new ArrayList<>();
            List<PositionedPrice> mappedRupeePrices = new ArrayList<>();
            List<PositionedMrpPrice> mrpPrices = findMrpPrices(lines);
            List<PositionedPrice> malformedPrices = new ArrayList<>();
            List<PositionedTextLine> possibleNameContinuations = new ArrayList<>();
            List<String> warnings = new ArrayList<>();
            int skippedRows = 0;

            for (PositionedTextLine line : lines) {
                String text = normalizeCatalogText(line.text());
                if (text.isBlank()) {
                    continue;
                }
                if (isMrpLabel(text) || (exhaustive && isHeaderOrNoise(text))) {
                    continue;
                }
                Matcher mappedRupee = MAPPED_RUPEE_PRICE.matcher(text);
                if (mappedRupee.matches()) {
                    BigDecimal amount = new BigDecimal(mappedRupee.group(1).replace(",", ""));
                    mappedRupeePrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), amount, text));
                    continue;
                }

                if (text.matches("(?i)^\\s*(?:MRP|PRICE|RATE)?\\s*(?:Rs\\.?|INR|[₹$€£t]|['’]\\s*\\(?)?\\s*[\\d,]+(?:\\.\\d{1,2})?\\s*$")) {
                    List<MatchResult> priceTokens = findMatches(PRICE_TOKEN, text);
                    if (priceTokens.isEmpty()) {
                        String numOnly = text.replaceAll("[^0-9.]", "");
                        if (!numOnly.isBlank()) {
                            try {
                                prices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                        line.startX(), line.endX(), new BigDecimal(numOnly), text));
                            } catch (Exception ignored) { }
                        }
                    } else {
                        for (MatchResult token : priceTokens) {
                            try {
                                BigDecimal value = new BigDecimal(token.group(1).replace(",", "").replaceAll("\\s+", ""));
                                if (value.signum() > 0) {
                                    prices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                            line.startX(), line.endX(), value, text));
                                }
                            } catch (Exception ignored) { }
                        }
                    }
                    continue;
                }

                List<MatchResult> markers = findMatches(PRICE_MARKER_ONLY, text);
                List<MatchResult> priceTokens = findMatches(PRICE_TOKEN, text);
                if (markers.size() > 1 || priceTokens.size() > 1) {
                    if (!exhaustive) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "multiple price candidates were found in one visual cell"));
                        skippedRows++;
                        continue;
                    }
                    malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), null, text));
                }
                if (markers.size() > priceTokens.size()) {
                    if (!exhaustive) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "the price was malformed"));
                        skippedRows++;
                        continue;
                    }
                    malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), null, text));
                }
                if (!exhaustive && priceTokens.isEmpty() && isExplanatoryText(text)) {
                    continue;
                }
                ParsedCatalogText parsedText = extractLabeledFields(text);
                if (parsedText.productText().isBlank()) {
                    if (exhaustive && !products.isEmpty()) {
                        int lastIdx = products.size() - 1;
                        PositionedProduct last = products.get(lastIdx);
                        if (last.pageNumber() == line.pageNumber() && Math.abs(line.y() - last.y()) <= 35) {
                            CatalogAttributes merged = mergeAttributes(last.fields(), parsedText.fields());
                            products.set(lastIdx, new PositionedProduct(last.pageNumber(), last.y(),
                                    last.startX(), last.endX(), last.sku(), last.name(), last.raw() + " " + text, merged));
                        }
                    }
                    continue;
                }
                List<String> skuCandidates = findSkuCandidates(parsedText.productText(), exhaustive);
                ProductText product = parseProductText(parsedText.productText(), markers, parsedText.fields(), exhaustive);
                if (product != null) {
                    if (!exhaustive && parsedText.ambiguous()) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "one or more labeled product fields had conflicting values"));
                        skippedRows++;
                        continue;
                    }
                    if (!exhaustive && !findSkuCandidates(product.name().replaceAll("\\([^)]*\\)", " "), false).isEmpty()) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "multiple SKU candidates were present in one visual cell"));
                        skippedRows++;
                        continue;
                    }
                    products.add(new PositionedProduct(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), product.sku(), product.name(), text,
                            product.fields()));
                } else if (exhaustive && (!skuCandidates.isEmpty() || parsedText.fields().itemCode() != null || parsedText.fields().hsnCode() != null)) {
                    String fallbackSku = !skuCandidates.isEmpty() ? skuCandidates.get(0)
                            : (parsedText.fields().itemCode() != null ? parsedText.fields().itemCode() : parsedText.fields().hsnCode());
                    String fallbackName = cleanFallbackName(parsedText.productText(), fallbackSku);
                    products.add(new PositionedProduct(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), fallbackSku, fallbackName, text,
                            parsedText.fields()));
                } else if (!exhaustive && hasSeparatedProductName(text, skuCandidates)) {
                    warnings.add(skippedRowWarning(line.pageNumber(), text,
                            "its SKU and product name could not be separated"));
                    skippedRows++;
                } else if (markers.isEmpty() && priceTokens.isEmpty()
                        && !isPriceOnly(text) && !isDimensionOrNoiseSku(text)
                        && !isHeaderOrNoise(text) && !text.matches("^[\\d.,/\\-\\s₹$€£RsINR]+$")) {
                    possibleNameContinuations.add(line);
                }

                for (MatchResult token : priceTokens) {
                    try {
                        BigDecimal value = new BigDecimal(token.group(1).replace(",", "").replaceAll("\\s+", ""));
                        if (value.signum() > 0) {
                            prices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                    line.startX(), line.endX(), value, text));
                        } else {
                            malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                    line.startX(), line.endX(), null, text));
                        }
                    } catch (NumberFormatException exception) {
                        malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                line.startX(), line.endX(), null, text));
                    }
                }
            }

            if (exhaustive) {
                products = attachProductHeadings(products, lines);
            }
            products = attachWrappedNames(products, possibleNameContinuations);
            addPositionallySupportedRupeePrices(products, mappedRupeePrices, prices);
            Map<Integer, PositionedPrice> assignedPrices = assignPrices(products, prices);
            assignMrpPrices(products, mrpPrices, assignedPrices, prices, malformedPrices, exhaustive);

            Map<Integer, ImageCandidate> assignedImages = assignImagesToProducts(products, images);

            if (exhaustive && document != null && pageCanvasCache != null) {
                for (int pIdx = 0; pIdx < products.size(); pIdx++) {
                    if (assignedImages.containsKey(pIdx)) continue;
                    PositionedProduct product = products.get(pIdx);
                    int pageNo = product.pageNumber();
                    float ptTop = (float) Math.max(15, product.y() - 130);
                    float ptHeight = (float) Math.min(130, product.y() - ptTop - 2);
                    float ptLeft = (float) Math.max(10, product.startX() - 20);
                    float ptWidth = (float) Math.max(130, (product.endX() - product.startX()) + 40);

                    float scale = 100.0f / 72.0f;
                    int cx = (int) (ptLeft * scale);
                    int cy = (int) (ptTop * scale);
                    int cw = (int) (ptWidth * scale);
                    int ch = (int) (ptHeight * scale);
                    Rectangle cropBox = new Rectangle(cx, cy, cw, ch);

                    Supplier<BufferedImage> canvasSupplier = () -> {
                        return pageCanvasCache.computeIfAbsent(pageNo, p -> {
                            try {
                                PDFRenderer renderer = new PDFRenderer(document);
                                return renderer.renderImageWithDPI(p - 1, 100);
                            } catch (Throwable t) {
                                return null;
                            }
                        });
                    };

                    ImageCandidate croppedCandidate = new ImageCandidate(pageNo, ptLeft, ptTop, ptWidth, ptHeight, canvasSupplier, cropBox);
                    assignedImages.put(pIdx, croppedCandidate);
                }
            }

            List<CatalogRow> rows = new ArrayList<>();
            for (int index = 0; index < products.size(); index++) {
                PositionedProduct product = products.get(index);
                PositionedPrice price = assignedPrices.get(index);
                if (price == null) {
                    if (exhaustive) {
                        PositionedPrice malformed = nearestPrice(product, malformedPrices, 25, 55);
                        if (malformed != null) {
                            warnings.add(skippedRowWarning(product.pageNumber(), product.raw(), "the associated price was malformed"));
                            skippedRows++;
                            continue;
                        }
                        price = new PositionedPrice(product.pageNumber(), product.y(),
                                product.startX(), product.endX(), BigDecimal.ZERO, "0.00");
                    } else {
                        PositionedPrice malformed = nearestPrice(product, malformedPrices, 25, 55);
                        String reason = malformed == null
                                ? "no unambiguous price was found in the same row or aligned cell"
                                : "the associated price was malformed";
                        warnings.add(skippedRowWarning(product.pageNumber(), product.raw(), reason));
                        skippedRows++;
                        continue;
                    }
                }
                ImageCandidate candidate = assignedImages.get(index);
                byte[] imgBytes = (candidate != null && candidate.preloadedBytes() != null) ? candidate.preloadedBytes() : null;
                String safeName = (product.name() != null && !product.name().isBlank()
                        && !product.name().equals("--")
                        && !isPriceOnly(product.name())
                        && !containsCurrencyAmount(product.name())
                        && !product.name().matches("^[\\d.,/\\- xX₹$€£RsINR]+$")) ? product.name() : "--";
                BigDecimal safeMrp = price.value() != null ? price.value() : BigDecimal.ZERO;

                ExtractedDetails details = extractDetails(safeName, product.raw());
                String finalName = details.cleanName().equals("--") ? safeName : details.cleanName();
                String finalSize = details.size();
                String finalDesc = details.description();

                rows.add(new CatalogRow(product.sku().toUpperCase(Locale.ROOT), finalName,
                        safeMrp, product.pageNumber(), null, finalSize, finalDesc,
                        product.fields().hsnCode(), product.fields().material(), product.fields().materialCode(), product.fields().itemCode(), imgBytes, candidate));
            }

            return new PageParseResult(rows, warnings, skippedRows);
        }

        private static String cleanFallbackName(String text, String sku) {
            String cleaned = text.replace(sku, "").replaceAll("(?i)\\b(?:HSN|MATERIAL|CODE|MRP|PRICE)\\b.*", "").replaceAll("\\s+", " ").trim();
            while (cleaned.startsWith("--") || cleaned.startsWith("-")) {
                cleaned = cleaned.replaceFirst("^[-–—]+\\s*", "").trim();
            }
            if (cleaned.isBlank() || isPriceOnly(cleaned) || containsCurrencyAmount(cleaned)
                    || cleaned.matches("^[\\d.,/\\- xX₹$€£RsINR]+$")
                    || cleaned.toLowerCase(Locale.ROOT).startsWith("dimensions")
                    || isDimensionOrNoiseSku(cleaned)) {
                return "--";
            }
            String withoutTrailingPrice = cleaned.replaceAll("(?i)\\s*(?:Rs\\.?|INR|[₹<$€£?]|t)?\\s*[\\d,]+(?:\\.\\d{1,2})?\\s*$", "").trim();
            if (withoutTrailingPrice.isBlank() || isPriceOnly(withoutTrailingPrice) || withoutTrailingPrice.matches("^[\\d.,/\\- xX₹$€£RsINR]+$")) {
                return "--";
            }
            return limit(withoutTrailingPrice, 200);
        }

        private static boolean isPriceOnly(String value) {
            if (value == null || value.isBlank() || value.equals("--")) {
                return true;
            }
            String stripped = value.replaceAll("(?i)(?:Rs\\.?|INR|[₹<$€£?]|t|['’]\\s*\\(?)", "")
                    .replaceAll("[\\d.,/\\-\\s]", "").trim();
            return stripped.isEmpty();
        }

        private static boolean isHeaderOrNoise(String text) {
            if (text == null || text.isBlank()) return true;
            String lower = text.toLowerCase(Locale.ROOT);
            if (lower.contains("catalog") || lower.contains("catalogue")
                    || lower.contains("price list") || lower.contains("price table")
                    || lower.contains("collection")
                    || lower.matches("(?i)^\\s*(item(?:\\s*code)?|sku|product\\s*description|description|hsn(?:\\s*code)?|mrp|price|rate|rate\\s*chart|sr\\.?\\s*no\\.?|s\\.?no\\.?)(?:\\s*[/|-]\\s*(item(?:\\s*code)?|sku|description|hsn|mrp|price))?\\s*$")) {
                return true;
            }
            // Dimension strings like "(230, 220, 210, 200, 190, 180 mm)" or "500 x 345 x 350 mm"
            if (text.matches("(?i)^\\(?\\s*\\d+(?:\\s*[,/xX]\\s*\\d+)+\\s*(?:mm|cm|inch|mtr)?\\s*\\)?$")) {
                return true;
            }
            if (lower.matches("^\\s*dimensions?\\s*[:#]?\\s*.*$")) {
                return true;
            }
            // Contact, dealer, address, customer care noise
            if (lower.contains("tel:") || lower.contains("mob:") || lower.contains("mobile:")
                    || lower.contains("e-mail") || lower.contains("email") || lower.contains("toll free")
                    || lower.contains("customer care") || lower.contains("experience center")
                    || lower.contains("service center") || lower.contains("corporate office")
                    || lower.contains("registered office") || lower.contains("head office")
                    || lower.contains("branch office") || lower.contains("www.")
                    || lower.contains(".com") || text.contains("@")) {
                return true;
            }
            return false;
        }

        private static final Set<String> BLACKLISTED_SKUS = Set.of(
                "HIGH-QUALITY", "EVOLVE-WHERE", "INLET/OUTLET", "3-IN-1", "2-IN-1", "POP-UP",
                "POP-UP/CLICK-CLACK", "HALF/FULL", "HOT/COLD", "TAXES/", "BRASSTHREADED",
                "STD.PKG", "BOX.QTY", "PART.NO", "PARTNO", "PRICE/PC", "RATE/PC",
                "WALL-HUNG", "TABLE-TOP", "ONE-PIECE", "SINGLE-LEVER", "CONCEALED",
                "EXPOSED", "QUARTER-TURN", "HALF-TURN", "OVERHEAD", "HAND-SHOWER",
                "RAIN-SHOWER", "HEALTH-FAUCET", "BOTTLE-TRAP", "ANGLE-COCK",
                "PILLAR-COCK", "BIB-COCK", "SINK-COCK", "SWIVEL-SPOUT"
        );

        private static boolean isDimensionOrNoiseSku(String token) {
            if (token == null || token.isBlank()) return true;
            String upper = token.trim().replaceAll("^[-–—./]+|[-–—./]+$", "").toUpperCase(Locale.ROOT);
            if (upper.isBlank() || BLACKLISTED_SKUS.contains(upper)) {
                return true;
            }
            if (upper.matches("^\\d+-IN-\\d+$")) {
                return true;
            }
            if (upper.matches("^\\d+\\.\\d+$")) {
                return true;
            }
            // Units: 45MM, 15MM, 20MM, 50MM, 350MM, 1.5MT, 1MTR, 10LTR, 80MM, etc.
            if (upper.matches("^\\d+(?:\\.\\d+)?\\s*(?:MM|CM|MTR|MT|INCH|INCHES|LTR|LTS|LITRE|LITRES|GM|KG|PCS|PC)$")) {
                return true;
            }
            // Compound dimensions: 680X365X760MM, 545X350X390MM, 510X410X190MM, 600X455X230, X16, X18, 3/6, 2.5X, etc.
            if (upper.matches("^(?:X\\d+|\\d+(?:\\.\\d+)?\\s*[Xx*].*)$")) {
                return true;
            }
            if (upper.matches("^\\d+/\\d+$")) {
                return true;
            }
            // Bare 1-5 digit numbers: 15, 20, 25, 360, 500, 650, 860, 950, 840, 304, 3000
            if (upper.matches("^\\d{1,5}$")) {
                return true;
            }
            // 10-digit Indian phone numbers
            if (upper.matches("^[6-9]\\d{9}$")) {
                return true;
            }
            // Hyphenated or slash words with NO digits (e.g. EVOLVE-WHERE, HIGH-QUALITY, INLET/OUTLET)
            if (!upper.matches(".*\\d.*") && upper.matches("^[A-Z]+[-/][A-Z]+$")) {
                return true;
            }
            // Common noise labels / words
            if (upper.matches("^(?:E-?MAIL|1ST|2ND|3RD|TOP/?|TIP-TON|2-IN-1|IN1|SS304|SS204|REGAL\\d*|SERIES|COLLECTION|RANGE|CATALOG|CATALOGUE|PAGE|INDEX|SPECIFICATIONS?|WARRANTY)$")) {
                return true;
            }
            return false;
        }

        private static CatalogAttributes mergeAttributes(CatalogAttributes a, CatalogAttributes b) {
            String hsn = (b.hsnCode() != null && !b.hsnCode().isBlank()) ? b.hsnCode() : a.hsnCode();
            String mat = (b.material() != null && !b.material().isBlank()) ? b.material() : a.material();
            String matCode = (b.materialCode() != null && !b.materialCode().isBlank()) ? b.materialCode() : a.materialCode();
            String itemCode = (b.itemCode() != null && !b.itemCode().isBlank()) ? b.itemCode() : a.itemCode();
            return new CatalogAttributes(hsn, mat, matCode, itemCode);
        }

        private static Map<Integer, ImageCandidate> assignImagesToProducts(
                List<PositionedProduct> products, List<ImageCandidate> images) {
            Map<Integer, ImageCandidate> assigned = new HashMap<>();
            if (images == null || images.isEmpty() || products.isEmpty()) {
                return assigned;
            }
            Map<Integer, List<ImageCandidate>> imagesByPage = new HashMap<>();
            for (ImageCandidate img : images) {
                imagesByPage.computeIfAbsent(img.pageNumber(), k -> new ArrayList<>()).add(img);
            }
            Set<ImageCandidate> usedImages = new HashSet<>();
            for (int pIdx = 0; pIdx < products.size(); pIdx++) {
                PositionedProduct product = products.get(pIdx);
                List<ImageCandidate> pageImages = imagesByPage.get(product.pageNumber());
                if (pageImages == null || pageImages.isEmpty()) continue;
                double prodCenterX = (product.startX() + product.endX()) / 2.0;
                ImageCandidate bestImg = null;
                double bestDist = Double.MAX_VALUE;
                for (ImageCandidate img : pageImages) {
                    if (usedImages.contains(img)) continue;
                    double dx = prodCenterX - img.centerX();
                    double dy = product.y() - img.centerY();
                    double dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 450.0 && dist < bestDist) {
                        bestDist = dist;
                        bestImg = img;
                    }
                }
                if (bestImg != null) {
                    assigned.put(pIdx, bestImg);
                    usedImages.add(bestImg);
                }
            }

            // Pass 2: Vertical column image inheritance for multi-size variants under a shared illustration
            for (int pIdx = 0; pIdx < products.size(); pIdx++) {
                if (assigned.containsKey(pIdx)) continue;
                PositionedProduct p = products.get(pIdx);
                double pCenterX = (p.startX() + p.endX()) / 2.0;
                ImageCandidate inherited = null;
                double minDist = Double.MAX_VALUE;
                for (int priorIdx = 0; priorIdx < products.size(); priorIdx++) {
                    if (priorIdx == pIdx || !assigned.containsKey(priorIdx)) continue;
                    PositionedProduct prior = products.get(priorIdx);
                    if (prior.pageNumber() != p.pageNumber()) continue;
                    double priorCenterX = (prior.startX() + prior.endX()) / 2.0;
                    if (Math.abs(priorCenterX - pCenterX) <= 80.0 && p.y() >= prior.y() && (p.y() - prior.y()) <= 380.0) {
                        double dy = p.y() - prior.y();
                        if (dy < minDist) {
                            minDist = dy;
                            inherited = assigned.get(priorIdx);
                        }
                    }
                }
                if (inherited != null) {
                    assigned.put(pIdx, inherited);
                }
            }

            return assigned;
        }

        private static void addPositionallySupportedRupeePrices(
                List<PositionedProduct> products,
                List<PositionedPrice> mappedPrices,
                List<PositionedPrice> prices) {
            for (PositionedPrice mappedPrice : mappedPrices) {
                List<PositionedProduct> matchingProducts = products.stream()
                        .filter(product -> product.pageNumber() == mappedPrice.pageNumber()
                                && Math.abs(product.y() - mappedPrice.y()) <= 2.5
                                && horizontalDistance(product, mappedPrice) <= 40)
                        .toList();
                if (matchingProducts.size() == 1) {
                    prices.add(mappedPrice);
                }
            }
        }

        private static List<PositionedMrpPrice> findMrpPrices(List<PositionedTextLine> lines) {
            List<PositionedTextLine> headers = lines.stream()
                    .filter(line -> isMrpLabel(normalizeCatalogText(line.text())))
                    .sorted(java.util.Comparator.comparingInt(PositionedTextLine::pageNumber)
                            .thenComparingDouble(PositionedTextLine::y)
                            .thenComparingDouble(PositionedTextLine::startX))
                    .toList();
            List<PositionedMrpPrice> result = new ArrayList<>();
            for (PositionedTextLine header : headers) {
                List<PositionedTextLine> nextHeaders = headers.stream()
                        .filter(other -> other.pageNumber() == header.pageNumber()
                                && other.y() > header.y()
                                && Math.abs(other.startX() - header.startX()) <= 45)
                        .toList();
                double endY = nextHeaders.stream().mapToDouble(PositionedTextLine::y)
                        .min().orElse(header.y() + 55);
                List<PositionedTextLine> values = lines.stream()
                        .filter(line -> line.pageNumber() == header.pageNumber()
                                && line.y() > header.y() && line.y() < endY
                                && line.y() - header.y() <= 55
                                && Math.abs(line.startX() - header.startX()) <= 45
                                && line.text().matches("\\d{1,3}(?:,\\d{3})*\\.\\d{2}"))
                        .toList();
                if (values.size() != 1) {
                    continue;
                }
                PositionedTextLine value = values.get(0);
                try {
                    BigDecimal amount = new BigDecimal(value.text().replace(",", ""));
                    if (amount.signum() > 0) {
                        result.add(new PositionedMrpPrice(header.pageNumber(), header.y(),
                                header.startX(), amount, value.text()));
                    }
                } catch (Exception ignored) { }
            }
            return result;
        }

        private static void assignMrpPrices(List<PositionedProduct> products,
                                            List<PositionedMrpPrice> mrpPrices,
                                            Map<Integer, PositionedPrice> assignedPrices,
                                            List<PositionedPrice> prices,
                                            List<PositionedPrice> malformedPrices,
                                            boolean exhaustive) {
            Set<Integer> usedProducts = new HashSet<>(assignedPrices.keySet());
            for (PositionedMrpPrice mrpPrice : mrpPrices) {
                int bestProduct = -1;
                double bestScore = Double.MAX_VALUE;
                boolean tied = false;
                for (int index = 0; index < products.size(); index++) {
                    if (usedProducts.contains(index)) {
                        continue;
                    }
                    PositionedProduct product = products.get(index);
                    double verticalDistance = mrpPrice.headerY() - product.y();
                    double horizontalDistance = horizontalDistance(product.startX(), product.endX(),
                            mrpPrice.headerX(), mrpPrice.headerX());
                    if (product.pageNumber() != mrpPrice.pageNumber()
                            || verticalDistance < 0 || verticalDistance > 45
                            || horizontalDistance > 150) {
                        continue;
                    }
                    double score = verticalDistance * 2 + horizontalDistance;
                    if (score < bestScore - 0.1) {
                        bestProduct = index;
                        bestScore = score;
                        tied = false;
                    } else if (Math.abs(score - bestScore) <= 0.1) {
                        tied = true;
                    }
                }
                if (bestProduct < 0 || tied) {
                    continue;
                }
                PositionedProduct selected = products.get(bestProduct);
                boolean anotherCellIsCloser = mrpPrices.stream()
                        .filter(other -> other != mrpPrice
                                && other.pageNumber() == selected.pageNumber())
                        .anyMatch(other -> {
                            double selectedDistance = (mrpPrice.headerY() - selected.y()) * 2
                                    + horizontalDistance(selected.startX(), selected.endX(),
                                    mrpPrice.headerX(), mrpPrice.headerX());
                            double otherVertical = other.headerY() - selected.y();
                            double otherDistance = otherVertical * 2 + horizontalDistance(
                                    selected.startX(), selected.endX(), other.headerX(), other.headerX());
                            return otherVertical >= 0 && otherVertical <= 45
                                    && otherDistance < selectedDistance - 0.1;
                        });
                if (!anotherCellIsCloser) {
                    assignedPrices.put(bestProduct, new PositionedPrice(mrpPrice.pageNumber(),
                            mrpPrice.headerY(), mrpPrice.headerX(), mrpPrice.headerX(),
                            mrpPrice.value(), mrpPrice.raw()));
                    usedProducts.add(bestProduct);
                }
            }

            if (exhaustive) {
                for (int pIdx = 0; pIdx < products.size(); pIdx++) {
                    if (assignedPrices.containsKey(pIdx)) continue;
                    PositionedProduct p = products.get(pIdx);
                    if (nearestPrice(p, malformedPrices, 25, 55) != null) {
                        continue;
                    }
                    PositionedPrice best = null;
                    double bestDist = Double.MAX_VALUE;
                    for (PositionedPrice pr : prices) {
                        if (pr.pageNumber() == p.pageNumber() && Math.abs(p.y() - pr.y()) <= 65.0) {
                            double dist = Math.abs(p.y() - pr.y()) * 1.5 + Math.abs(p.startX() - pr.startX());
                            if (dist < bestDist) {
                                bestDist = dist;
                                best = pr;
                            }
                        }
                    }
                    if (best != null) {
                        assignedPrices.put(pIdx, best);
                    }
                }
            }
        }

        private static boolean isMrpLabel(String text) {
            return text.matches("(?i)^MRP$");
        }

        static CatalogParseResult parse(List<CatalogPageLine> lines) {
            List<CatalogRow> rows = new ArrayList<>();
            List<String> unsupportedRows = new ArrayList<>();
            int skippedRows = 0;

            for (CatalogPageLine pageLine : lines) {
                for (String rawLine : pageLine.text().split("\\R")) {
                    String line = normalizeCatalogText(rawLine);
                    ParsedCatalogText parsedText = extractLabeledFields(line);
                    Matcher skuTokens = STRICT_SKU_TOKEN.matcher(parsedText.productText());
                    List<String> skuCandidates = new ArrayList<>();
                    while (skuTokens.find()) {
                        String candidate = skuTokens.group();
                        if (candidate.matches("(?i)(?=.*[A-Z])(?=.*\\d)[A-Z0-9-]{4,21}")) {
                            skuCandidates.add(candidate);
                        }
                    }
                    if (skuCandidates.isEmpty()) {
                        continue;
                    }

                    Matcher markers = CURRENCY_MARKER.matcher(parsedText.productText());
                    int markerCount = 0;
                    while (markers.find()) {
                        markerCount++;
                    }
                    Matcher row = SKU_FIRST_ROW.matcher(parsedText.productText());
                    boolean skuFirst = row.matches()
                            && skuCandidates.get(0).equalsIgnoreCase(row.group(1));
                    String sku;
                    String name;
                    String price;
                    if (skuFirst) {
                        sku = row.group(1);
                        name = row.group(2);
                        price = row.group(3);
                    } else {
                        row = NAME_FIRST_ROW.matcher(parsedText.productText());
                        if (!row.matches()) {
                            unsupportedRows.add(skippedRowWarning(pageLine.pageNumber(), line,
                                    "its SKU, name, or currency-marked price could not be associated"));
                            skippedRows++;
                            continue;
                        }
                        name = row.group(1);
                        sku = row.group(2);
                        price = row.group(3);
                    }
                    if (parsedText.ambiguous() || markerCount > 1 || skuCandidates.size() != 1
                            || !skuCandidates.get(0).equalsIgnoreCase(sku) || name.isBlank()
                            || (skuFirst && looksLikeSplitSku(name))
                            || containsCurrencyAmount(name)) {
                        unsupportedRows.add(skippedRowWarning(pageLine.pageNumber(), line,
                                "multiple or ambiguous SKU/price candidates were found"));
                        skippedRows++;
                        continue;
                    }

                    try {
                        BigDecimal mrp = new BigDecimal(price.replace(",", ""));
                        if (mrp.signum() <= 0) {
                            unsupportedRows.add(skippedRowWarning(pageLine.pageNumber(), line,
                                    "the price must be greater than zero"));
                            skippedRows++;
                            continue;
                        }
                        rows.add(new CatalogRow(sku.toUpperCase(Locale.ROOT),
                                normalizeCatalogText(name), mrp, pageLine.pageNumber(),
                                null, null, parsedText.fields().hsnCode(),
                                parsedText.fields().material(), parsedText.fields().materialCode(),
                                parsedText.fields().itemCode()));
                    } catch (NumberFormatException exception) {
                        unsupportedRows.add(skippedRowWarning(pageLine.pageNumber(), line,
                                "the price was malformed"));
                        skippedRows++;
                    }
                }
            }

            return collapseDuplicates(rows, unsupportedRows, skippedRows, false);
        }

        private static ProductText parseProductText(String text, List<MatchResult> markers,
                                                   CatalogAttributes fields, boolean exhaustive) {
            String productText = text;
            if (!markers.isEmpty()) {
                productText = text.substring(0, markers.get(0).start()).trim();
            }

            Matcher row = SPLIT_ALPHA_NUMERIC_SKU.matcher(productText);
            if (row.matches()) {
                return productText(row.group(1) + row.group(2) + row.group(3), row.group(4), fields, exhaustive);
            }
            row = SPLIT_NUMERIC_SKU.matcher(productText);
            if (row.matches()) {
                return productText(row.group(1) + row.group(2), row.group(3), fields, exhaustive);
            }
            row = SKU_FIRST_PRODUCT.matcher(productText);
            if (row.matches()) {
                ProductText pt = productText(row.group(1), row.group(2), fields, exhaustive);
                if (pt != null) return pt;
            }
            row = NAME_FIRST_PRODUCT.matcher(productText);
            if (row.matches()) {
                String candidateName = row.group(1).trim();
                if (!isPriceOnly(candidateName) && !containsCurrencyAmount(candidateName) && !candidateName.matches("^[\\d.,/\\-\\s₹$€£RsINR]+$")) {
                    ProductText pt = productText(row.group(2), row.group(1), fields, exhaustive);
                    if (pt != null) return pt;
                }
            }
            return null;
        }

        private static ProductText productText(String sku, String name, CatalogAttributes fields, boolean exhaustive) {
            if (!exhaustive) {
                if (!sku.matches("(?i)(?=.*[A-Z])(?=.*\\d)[A-Z0-9-]{4,21}")) {
                    return null;
                }
                String cleanName = normalizeCatalogText(name);
                if (cleanName.isBlank() || cleanName.length() > 200
                        || !cleanName.matches(".*[A-Za-z].*") || containsCurrencyAmount(cleanName)) {
                    return null;
                }
                return new ProductText(sku, cleanName, fields);
            }

            if (isDimensionOrNoiseSku(sku)) {
                return null;
            }

            String upperSku = sku.toUpperCase(Locale.ROOT);
            if (COMMON_WORDS.contains(upperSku)) {
                return null;
            }
            if (!sku.matches("(?i)[A-Z0-9./-]{3,30}")) {
                return null;
            }
            boolean hasDigit = sku.matches(".*\\d.*");
            boolean hasHyphenOrSlash = sku.contains("-") || sku.contains("/");
            if (!hasDigit && (!hasHyphenOrSlash || upperSku.matches("^[A-Z]+[-/][A-Z]+$"))) {
                return null;
            }

            String cleanName = normalizeCatalogText(name);
            if (cleanName.isBlank() || containsCurrencyAmount(cleanName) || isPriceOnly(cleanName)) {
                cleanName = "--";
            }
            return new ProductText(sku, limit(cleanName, 200), fields);
        }

        private static List<PositionedProduct> attachProductHeadings(
                List<PositionedProduct> products, List<PositionedTextLine> candidateLines) {
            List<PositionedProduct> result = new ArrayList<>(products);

            List<PositionedTextLine> headingCandidates = candidateLines.stream()
                    .filter(line -> {
                        String t = normalizeCatalogText(line.text());
                        return !t.isBlank() && !isHeaderOrNoise(t) && !isPriceOnly(t)
                                && !containsCurrencyAmount(t) && !t.matches("^[\\d.,/\\- xX₹$€£RsINR]+$")
                                && !isDimensionOrNoiseSku(t)
                                && t.matches(".*[A-Za-z].*") && !t.toLowerCase(Locale.ROOT).startsWith("dimensions");
                    })
                    .toList();

            for (int i = 0; i < result.size(); i++) {
                PositionedProduct p = result.get(i);
                if (p.name() != null && !p.name().isBlank() && !p.name().equals("--") && !isPriceOnly(p.name())) {
                    continue;
                }

                PositionedTextLine bestHeading = null;
                double bestScore = Double.MAX_VALUE;

                for (PositionedTextLine line : headingCandidates) {
                    if (line.pageNumber() != p.pageNumber()) {
                        continue;
                    }
                    double dy = p.y() - line.y();
                    double dx = horizontalDistance(p.startX(), p.endX(), line.startX(), line.endX());

                    boolean isAbove = dy > 0 && dy <= 85 && dx <= 160;
                    boolean isBeside = Math.abs(dy) <= 8 && line.startX() < p.startX() && dx <= 160;

                    if (isAbove || isBeside) {
                        double score = (isAbove ? dy : Math.abs(dy) * 5) + dx * 0.5;
                        if (score < bestScore) {
                            bestScore = score;
                            bestHeading = line;
                        }
                    }
                }

                if (bestHeading != null) {
                    String cleanHeading = normalizeCatalogText(bestHeading.text());
                    for (PositionedTextLine subLine : headingCandidates) {
                        if (subLine != bestHeading && subLine.pageNumber() == bestHeading.pageNumber()) {
                            double subDy = subLine.y() - bestHeading.y();
                            double subDx = horizontalDistance(bestHeading.startX(), bestHeading.endX(), subLine.startX(), subLine.endX());
                            if (subDy > 0 && subDy <= 18 && subDx <= 30 && subLine.y() < p.y()) {
                                cleanHeading = normalizeCatalogText(cleanHeading + " " + subLine.text());
                                break;
                            }
                        }
                    }
                    cleanHeading = cleanHeading.replaceAll("(?i)\\b(?:HSN|MATERIAL|CODE|MRP|PRICE)\\b.*", "").trim();
                    if (!cleanHeading.isBlank() && !isPriceOnly(cleanHeading)
                            && !containsCurrencyAmount(cleanHeading)
                            && !cleanHeading.matches("^[\\d.,/\\- xX₹$€£RsINR]+$")) {
                        result.set(i, new PositionedProduct(p.pageNumber(), p.y(),
                                p.startX(), p.endX(), p.sku(), limit(cleanHeading, 200),
                                p.raw() + " " + cleanHeading, p.fields()));
                    }
                }
            }

            return result;
        }

        private static ParsedCatalogText extractLabeledFields(String text) {
            Matcher matcher = LABELED_FIELD.matcher(text);
            StringBuilder productText = new StringBuilder(text);
            Map<String, String> fields = new HashMap<>();
            boolean ambiguous = false;
            while (matcher.find()) {
                String label = matcher.group(1).toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
                String key;
                if (label.startsWith("HSN")) {
                    key = "hsnCode";
                } else if (label.equals("MATERIAL")) {
                    key = "material";
                } else if (label.startsWith("MATERIAL")) {
                    key = "materialCode";
                } else {
                    key = "itemCode";
                }
                String value = matcher.group(2).trim();
                String previous = fields.putIfAbsent(key, value);
                if (previous != null && !previous.equalsIgnoreCase(value)) {
                    ambiguous = true;
                }
                for (int index = matcher.start(); index < matcher.end(); index++) {
                    productText.setCharAt(index, ' ');
                }
            }
            CatalogAttributes attributes = new CatalogAttributes(
                    fields.get("hsnCode"), fields.get("material"),
                    fields.get("materialCode"), fields.get("itemCode"));
            return new ParsedCatalogText(productText.toString(), attributes, ambiguous);
        }

        private static List<PositionedProduct> attachWrappedNames(
                List<PositionedProduct> products, List<PositionedTextLine> continuations) {
            List<PositionedProduct> result = new ArrayList<>(products);
            for (PositionedTextLine continuation : continuations) {
                String text = normalizeCatalogText(continuation.text());
                if (!text.matches("(?i)^[A-Za-z][A-Za-z0-9 ,()./'&-]{1,100}$")
                        || isPriceOnly(text) || containsCurrencyAmount(text)
                        || text.matches("^[\\d.,/\\- xX₹$€£RsINR]+$") || isDimensionOrNoiseSku(text)) {
                    continue;
                }
                int match = -1;
                double nearestDistance = Double.MAX_VALUE;
                boolean tied = false;
                for (int index = 0; index < result.size(); index++) {
                    PositionedProduct product = result.get(index);
                    double verticalDistance = continuation.y() - product.y();
                    double horizontalDistance = horizontalDistance(
                            product.startX(), product.endX(), continuation.startX(), continuation.endX());
                    if (continuation.pageNumber() != product.pageNumber()
                            || verticalDistance <= 0 || verticalDistance > 35
                            || horizontalDistance > 30) {
                        continue;
                    }
                    double distance = verticalDistance + horizontalDistance;
                    if (distance < nearestDistance - 0.1) {
                        match = index;
                        nearestDistance = distance;
                        tied = false;
                    } else if (Math.abs(distance - nearestDistance) <= 0.1) {
                        tied = true;
                    }
                }
                if (match >= 0 && !tied) {
                    PositionedProduct product = result.get(match);
                    String baseName = isPriceOnly(product.name()) || product.name().equals("--") ? "" : product.name();
                    String name = baseName.isBlank() ? text : normalizeCatalogText(baseName + " " + text);
                    if (isPriceOnly(name) || containsCurrencyAmount(name) || name.matches("^[\\d.,/\\- xX₹$€£RsINR]+$")) {
                        continue;
                    }
                    if (name.length() <= 200) {
                        result.set(match, new PositionedProduct(product.pageNumber(), product.y(),
                                product.startX(), product.endX(), product.sku(), name,
                                product.raw() + " " + text, product.fields()));
                    }
                }
            }
            return result;
        }

        private static List<String> findSkuCandidates(String text, boolean exhaustive) {
            List<String> candidates = new ArrayList<>();
            Pattern pattern = exhaustive ? BROAD_SKU_TOKEN : STRICT_SKU_TOKEN;
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                String candidate = matcher.group();
                if (!exhaustive) {
                    if (candidate.matches("(?i)(?=.*[A-Z])(?=.*\\d)[A-Z0-9-]{4,21}")) {
                        candidates.add(candidate);
                    }
                } else {
                    String upper = candidate.toUpperCase(Locale.ROOT);
                    if (candidate.matches("^[\\d,]+\\.\\d{1,2}$") || candidate.matches("^(?:19|20)\\d{2}$") || isDimensionOrNoiseSku(candidate)) {
                        continue;
                    }
                    if (!COMMON_WORDS.contains(upper)) {
                        boolean hasDigit = candidate.matches(".*\\d.*");
                        boolean hasHyphenOrSlash = candidate.contains("-") || candidate.contains("/");
                        if (hasDigit || (hasHyphenOrSlash && !upper.matches("^[A-Z]+[-/][A-Z]+$"))) {
                            candidates.add(candidate);
                        }
                    }
                }
            }
            if (candidates.size() > 1) {
                candidates.sort((c1, c2) -> {
                    boolean p1 = c1.matches("^700\\d{5}$") || c1.matches("^\\d{7,8}$");
                    boolean p2 = c2.matches("^700\\d{5}$") || c2.matches("^\\d{7,8}$");
                    if (p1 && !p2) return -1;
                    if (!p1 && p2) return 1;
                    return 0;
                });
            }
            return candidates;
        }

        private static boolean hasSeparatedProductName(String text, List<String> skuCandidates) {
            for (String sku : skuCandidates) {
                String quotedSku = Pattern.quote(sku);
                Matcher skuFirst = Pattern.compile(
                        "(?i)^\\s*" + quotedSku + "\\b\\s*(?:[-:–—]\\s*)?(.+)$").matcher(text);
                if (skuFirst.matches() && containsProductNameWords(skuFirst.group(1))) {
                    return true;
                }

                Matcher nameFirst = Pattern.compile(
                        "(?i)^(.+?)\\s+" + quotedSku + "\\b\\s*[.,;:)]?\\s*$").matcher(text);
                if (nameFirst.matches() && containsProductNameWords(nameFirst.group(1))) {
                    return true;
                }
            }
            return false;
        }

        private static boolean containsProductNameWords(String value) {
            return value.length() <= 200 && value.matches("(?s).*\\p{L}{2,}.*");
        }

        private static boolean isExplanatoryText(String text) {
            return text.matches("(?is).*\\b(?:https?://|www\\.)\\S+.*")
                    || text.matches("(?is).*\\b(?:is|are|was|were|will|would|should|can|could|must|may)"
                    + "\\s+\\p{L}+.*");
        }

        private static List<MatchResult> findMatches(Pattern pattern, String text) {
            List<MatchResult> matches = new ArrayList<>();
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                matches.add(matcher.toMatchResult());
            }
            return matches;
        }

        private static Map<Integer, PositionedPrice> assignPrices(
                List<PositionedProduct> products, List<PositionedPrice> prices) {
            Map<Integer, PositionedPrice> assigned = new HashMap<>();
            Set<Integer> usedPrices = new HashSet<>();

            for (int productIndex = 0; productIndex < products.size(); productIndex++) {
                PositionedProduct product = products.get(productIndex);
                List<Integer> sameRow = new ArrayList<>();
                for (int priceIndex = 0; priceIndex < prices.size(); priceIndex++) {
                    PositionedPrice price = prices.get(priceIndex);
                    if (!usedPrices.contains(priceIndex)
                            && product.pageNumber() == price.pageNumber()
                            && Math.abs(product.y() - price.y()) <= 2.5) {
                        sameRow.add(priceIndex);
                    }
                }
                if (sameRow.size() == 1) {
                    int priceIndex = sameRow.get(0);
                    long candidateCount = products.stream().filter(candidate ->
                            candidate.pageNumber() == product.pageNumber()
                                    && Math.abs(candidate.y() - product.y()) <= 2.5).count();
                    if (candidateCount == 1) {
                        assigned.put(productIndex, prices.get(priceIndex));
                        usedPrices.add(priceIndex);
                    }
                }
            }

            for (int pass = 0; pass < products.size(); pass++) {
                boolean changed = false;
                for (int productIndex = 0; productIndex < products.size(); productIndex++) {
                    if (assigned.containsKey(productIndex)) {
                        continue;
                    }
                    PositionedProduct product = products.get(productIndex);
                    int bestPrice = -1;
                    double bestScore = Double.MAX_VALUE;
                    boolean tied = false;
                    for (int priceIndex = 0; priceIndex < prices.size(); priceIndex++) {
                        if (usedPrices.contains(priceIndex)) {
                            continue;
                        }
                        PositionedPrice price = prices.get(priceIndex);
                        double verticalDistance = Math.abs(product.y() - price.y());
                        double horizontalDistance = horizontalDistance(product, price);
                        if (product.pageNumber() != price.pageNumber()
                                || verticalDistance > 25 || horizontalDistance > 55) {
                            continue;
                        }
                        double score = verticalDistance * 2 + horizontalDistance;
                        if (score < bestScore - 0.1) {
                            bestPrice = priceIndex;
                            bestScore = score;
                            tied = false;
                        } else if (Math.abs(score - bestScore) <= 0.1) {
                            tied = true;
                        }
                    }
                    if (bestPrice < 0 || tied) {
                        continue;
                    }
                    PositionedPrice selected = prices.get(bestPrice);
                    int bestProduct = -1;
                    double bestProductScore = Double.MAX_VALUE;
                    boolean productTie = false;
                    for (int otherIndex = 0; otherIndex < products.size(); otherIndex++) {
                        if (assigned.containsKey(otherIndex)) {
                            continue;
                        }
                        PositionedProduct other = products.get(otherIndex);
                        double verticalDistance = Math.abs(other.y() - selected.y());
                        double horizontalDistance = horizontalDistance(other, selected);
                        if (other.pageNumber() != selected.pageNumber()
                                || verticalDistance > 25 || horizontalDistance > 55) {
                            continue;
                        }
                        double score = verticalDistance * 2 + horizontalDistance;
                        if (score < bestProductScore - 0.1) {
                            bestProduct = otherIndex;
                            bestProductScore = score;
                            productTie = false;
                        } else if (Math.abs(score - bestProductScore) <= 0.1) {
                            productTie = true;
                        }
                    }
                    if (bestProduct == productIndex && !productTie) {
                        assigned.put(productIndex, selected);
                        usedPrices.add(bestPrice);
                        changed = true;
                    }
                }
                if (!changed) {
                    break;
                }
            }
            return assigned;
        }

        private static PositionedPrice nearestPrice(PositionedProduct product,
                                                    List<PositionedPrice> prices,
                                                    double maxVertical, double maxHorizontal) {
            PositionedPrice nearest = null;
            double nearestScore = Double.MAX_VALUE;
            boolean tied = false;
            for (PositionedPrice price : prices) {
                double vertical = Math.abs(product.y() - price.y());
                double horizontal = horizontalDistance(product, price);
                if (product.pageNumber() != price.pageNumber()
                        || vertical > maxVertical || horizontal > maxHorizontal) {
                    continue;
                }
                double score = vertical * 2 + horizontal;
                if (score < nearestScore - 0.1) {
                    nearest = price;
                    nearestScore = score;
                    tied = false;
                } else if (Math.abs(score - nearestScore) <= 0.1) {
                    if (nearest != null && Math.abs(price.y() - nearest.y()) <= 1.0
                            && Math.abs(price.startX() - nearest.startX()) <= 1.0) {
                        continue;
                    }
                    tied = true;
                }
            }
            return tied ? null : nearest;
        }

        private static double horizontalDistance(PositionedProduct product, PositionedPrice price) {
            return horizontalDistance(product.startX(), product.endX(), price.startX(), price.endX());
        }

        private static double horizontalDistance(double firstStart, double firstEnd,
                                                 double secondStart, double secondEnd) {
            if (firstEnd < secondStart) {
                return secondStart - firstEnd;
            }
            if (secondEnd < firstStart) {
                return firstStart - secondEnd;
            }
            return 0;
        }

        private static CatalogParseResult collapseDuplicates(
                List<CatalogRow> rows, List<String> warnings, int skippedRows, boolean exhaustive) {
            Map<String, CatalogRow> rowsBySku = new LinkedHashMap<>();
            Set<String> conflictingSkus = new HashSet<>();
            List<String> conflictWarnings = new ArrayList<>();
            for (CatalogRow row : rows) {
                String skuKey = row.sku().toUpperCase(Locale.ROOT);
                if (!exhaustive && conflictingSkus.contains(skuKey)) {
                    continue;
                }
                CatalogRow existing = rowsBySku.get(skuKey);
                if (existing != null) {
                    if (exhaustive) {
                        CatalogRow merged = mergeCatalogRows(existing, row);
                        rowsBySku.put(skuKey, merged);
                    } else if (!existing.name().equalsIgnoreCase(row.name())
                            || existing.mrp().compareTo(row.mrp()) != 0
                            || !java.util.Objects.equals(existing.hsnCode(), row.hsnCode())
                            || !java.util.Objects.equals(existing.material(), row.material())
                            || !java.util.Objects.equals(existing.materialCode(), row.materialCode())
                            || !java.util.Objects.equals(existing.itemCode(), row.itemCode())) {
                        rowsBySku.remove(skuKey);
                        conflictingSkus.add(skuKey);
                        conflictWarnings.add("Conflicting catalogue SKU " + row.sku() + " on pages "
                                + existing.sourcePage() + " and " + row.sourcePage() + ": \""
                                + existing.name() + "\" at " + existing.mrp() + " vs \""
                                + row.name() + "\" at " + row.mrp() + ".");
                    }
                } else {
                    rowsBySku.put(skuKey, row);
                }
            }
            List<String> allWarnings = new ArrayList<>(warnings);
            allWarnings.addAll(conflictWarnings);
            if (!exhaustive) {
                Map<String, List<CatalogRow>> confusableIdentifiers = new LinkedHashMap<>();
                for (CatalogRow row : rowsBySku.values()) {
                    String identifier = row.sku().toUpperCase(Locale.ROOT);
                    String name = row.name().toLowerCase(Locale.ROOT);
                    String key = identifier.replace('O', '0') + "|" + name;
                    confusableIdentifiers.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row);
                }
                int confusableConflictCount = 0;
                for (List<CatalogRow> alternatives : confusableIdentifiers.values()) {
                    Set<String> identifiers = alternatives.stream()
                            .map(row -> row.sku().toUpperCase(Locale.ROOT))
                            .collect(java.util.stream.Collectors.toSet());
                    if (identifiers.size() < 2
                            || identifiers.stream().noneMatch(identifier -> identifier.contains("O"))
                            || identifiers.stream().noneMatch(identifier -> identifier.contains("0"))) {
                        continue;
                    }
                    alternatives.forEach(row -> rowsBySku.remove(row.sku().toUpperCase(Locale.ROOT)));
                    String locations = alternatives.stream()
                            .map(row -> row.sku() + " on page " + row.sourcePage()
                                    + " at MRP " + row.mrp().toPlainString())
                            .distinct()
                            .collect(java.util.stream.Collectors.joining("; "));
                    allWarnings.add("Conflicting catalogue identifiers may differ only by letter O vs digit 0 "
                            + "for \"" + alternatives.get(0).name() + "\": " + locations
                            + ". Review the printed identifiers; no correction was applied.");
                    confusableConflictCount++;
                }
                return new CatalogParseResult(new ArrayList<>(rowsBySku.values()), allWarnings,
                        skippedRows + conflictingSkus.size() + confusableConflictCount);
            }
            return new CatalogParseResult(new ArrayList<>(rowsBySku.values()), allWarnings, skippedRows);
        }

        private static CatalogRow mergeCatalogRows(CatalogRow a, CatalogRow b) {
            String sku = a.sku();

            String name = a.name();
            if (isPlaceholderOrEmpty(name) && !isPlaceholderOrEmpty(b.name())) {
                name = b.name();
            } else if (!isPlaceholderOrEmpty(name) && !isPlaceholderOrEmpty(b.name())) {
                if (isPriceOnly(name) && !isPriceOnly(b.name())) {
                    name = b.name();
                } else if (!isPriceOnly(name) && isPriceOnly(b.name())) {
                    // keep a's name
                } else if (b.name().length() > a.name().length() && !b.name().toLowerCase(Locale.ROOT).startsWith("dimensions")) {
                    name = b.name();
                } else if (a.name().toLowerCase(Locale.ROOT).startsWith("dimensions") && !b.name().toLowerCase(Locale.ROOT).startsWith("dimensions")) {
                    name = b.name();
                }
            }

            BigDecimal mrp = a.mrp() != null ? a.mrp() : BigDecimal.ZERO;
            BigDecimal bMrp = b.mrp() != null ? b.mrp() : BigDecimal.ZERO;
            if (mrp.signum() <= 0 && bMrp.signum() > 0) {
                mrp = bMrp;
            } else if (mrp.signum() > 0 && bMrp.signum() > 0) {
                mrp = mrp.max(bMrp);
            }

            int page = Math.min(a.sourcePage(), b.sourcePage());
            String systemName = a.systemName() != null ? a.systemName() : b.systemName();
            String size = a.size() != null ? a.size() : b.size();
            String description = hasText(a.description()) ? a.description() : b.description();

            String hsn = hasText(b.hsnCode()) ? b.hsnCode() : a.hsnCode();
            String material = hasText(b.material()) ? b.material() : a.material();
            String matCode = hasText(b.materialCode()) ? b.materialCode() : a.materialCode();
            String itemCode = hasText(b.itemCode()) ? b.itemCode() : a.itemCode();

            ImageCandidate imgCand = a.imageCandidate() != null ? a.imageCandidate() : b.imageCandidate();
            byte[] img = (a.imageBytes() != null && a.imageBytes().length > 0) ? a.imageBytes() : b.imageBytes();

            return new CatalogRow(sku, name, mrp, page, systemName, size, description, hsn, material, matCode, itemCode, img, imgCand);
        }

        private static boolean isPlaceholderOrEmpty(String val) {
            return val == null || val.isBlank() || val.equals("--") || val.equalsIgnoreCase("null") || isPriceOnly(val);
        }

        private static boolean hasText(String val) {
            return val != null && !val.isBlank() && !val.equals("--") && !val.equalsIgnoreCase("null");
        }

        private static boolean looksLikeSplitSku(String name) {
            return name.matches("(?i)^[A-Z]\\s+[A-Z0-9]{1,3}(?:\\s|$).*");
        }

        private static boolean containsCurrencyAmount(String value) {
            return CURRENCY_MARKER.matcher(value).find();
        }

        private static String normalizeCatalogText(String value) {
            return value.replace('\uFFFD', ' ').replaceAll("\\s+", " ").trim();
        }

    }

    record PositionedImage(int pageNumber, double x, double y, double width, double height, byte[] imageBytes) {
        double centerX() { return x + width / 2.0; }
        double centerY() { return y + height / 2.0; }
    }

    record CatalogPageLine(int pageNumber, String text) {
    }

    record PositionedTextLine(int pageNumber, double y, double startX, double endX, String text) {
    }

    private record PositionedProduct(int pageNumber, double y, double startX, double endX,
                                     String sku, String name, String raw, CatalogAttributes fields) {
    }

    private record PositionedPrice(int pageNumber, double y, double startX, double endX,
                                   BigDecimal value, String raw) {
    }

    private record PositionedMrpPrice(int pageNumber, double headerY, double headerX,
                                      BigDecimal value, String raw) {
    }

    private record ProductText(String sku, String name, CatalogAttributes fields) {
    }

    record CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                      String systemName, String size, String description, String hsnCode,
                      String material, String materialCode, String itemCode,
                      byte[] imageBytes, ImageCandidate imageCandidate) {
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String description, String hsnCode,
                   String material, String materialCode, String itemCode,
                   byte[] imageBytes) {
            this(sku, name, mrp, sourcePage, systemName, size, description, hsnCode, material, materialCode, itemCode, imageBytes, null);
        }
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String description, String hsnCode,
                   String material, String materialCode, String itemCode) {
            this(sku, name, mrp, sourcePage, systemName, size, description, hsnCode, material, materialCode, itemCode, null, null);
        }
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String hsnCode) {
            this(sku, name, mrp, sourcePage, systemName, size, null, hsnCode, null, null, null, null, null);
        }
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String hsnCode,
                   String material, String materialCode, String itemCode,
                   byte[] imageBytes, ImageCandidate imageCandidate) {
            this(sku, name, mrp, sourcePage, systemName, size, null, hsnCode, material, materialCode, itemCode, imageBytes, imageCandidate);
        }
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String hsnCode,
                   String material, String materialCode, String itemCode,
                   byte[] imageBytes) {
            this(sku, name, mrp, sourcePage, systemName, size, null, hsnCode, material, materialCode, itemCode, imageBytes, null);
        }
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String hsnCode,
                   String material, String materialCode, String itemCode) {
            this(sku, name, mrp, sourcePage, systemName, size, null, hsnCode, material, materialCode, itemCode, null, null);
        }

        public byte[] effectiveImageBytes() {
            if (imageBytes != null && imageBytes.length > 0) return imageBytes;
            if (imageCandidate != null) return imageCandidate.getImageBytes(500);
            return null;
        }

        public byte[] effectiveThumbnailBytes() {
            if (imageCandidate != null) return imageCandidate.getThumbnailBytes();
            if (imageBytes != null && imageBytes.length > 0) return createThumbnail(imageBytes, 100);
            return null;
        }

        public boolean hasImage() {
            return (imageBytes != null && imageBytes.length > 0) || imageCandidate != null;
        }
    }

    record CatalogParseResult(List<CatalogRow> rows, List<String> warnings, int skippedRows) {
        CatalogParseResult {
            rows = List.copyOf(rows);
            warnings = List.copyOf(warnings);
        }
    }

    private record CatalogVariant(String sku, String size, BigDecimal mrp,
                                  String material, String materialCode, String itemCode,
                                  String description, byte[] imageBytes) {
        private CatalogVariant(String sku, String size, BigDecimal mrp,
                               String material, String materialCode, String itemCode,
                               String description) {
            this(sku, size, mrp, material, materialCode, itemCode, description, null);
        }
        private CatalogVariant(String sku, String size, BigDecimal mrp,
                               String material, String materialCode, String itemCode,
                               byte[] imageBytes) {
            this(sku, size, mrp, material, materialCode, itemCode, null, imageBytes);
        }
        private CatalogVariant(String sku, String size, BigDecimal mrp,
                               String material, String materialCode, String itemCode) {
            this(sku, size, mrp, material, materialCode, itemCode, null, null);
        }
        private CatalogVariant(String sku, String size, BigDecimal mrp) {
            this(sku, size, mrp, null, null, null, null, null);
        }
    }

    private record CatalogAttributes(String hsnCode, String material,
                                     String materialCode, String itemCode) { }

    private record ParsedCatalogText(String productText, CatalogAttributes fields, boolean ambiguous) { }

    private record LegacyFamilyKey(int pageNumber, String systemName, String name, String hsnCode) { }

    private record TemporaryCatalogPdf(Path path) implements AutoCloseable {
        private static TemporaryCatalogPdf copyOf(MultipartFile file) throws IOException {
            Path path = Files.createTempFile("crm-catalog-import-", ".pdf");
            try {
                file.transferTo(path);
                return new TemporaryCatalogPdf(path);
            } catch (IOException | RuntimeException exception) {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException cleanupException) {
                    exception.addSuppressed(cleanupException);
                }
                throw exception;
            }
        }

        @Override
        public void close() throws IOException {
            Files.deleteIfExists(path);
        }
    }

    private static final class ProductFamily {
        private final String name;
        private String hsnCode;
        private final List<CatalogVariant> variants;

        private ProductFamily(String name, String hsnCode, List<CatalogVariant> variants) {
            this.name = name;
            this.hsnCode = hsnCode;
            this.variants = variants;
        }

        private String name() { return name; }
        private String hsnCode() { return hsnCode; }
        private List<CatalogVariant> variants() { return variants; }
    }

    private static final class ImportCounters {
        private int created;
        private int updated;
        private int imagesLinked;
        private int skipped;
    }

}
