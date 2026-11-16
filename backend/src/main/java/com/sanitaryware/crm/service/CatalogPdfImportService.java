package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogImportPreviewItem;
import com.sanitaryware.crm.dto.CatalogImportPreviewResponse;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.text.TextPosition;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.awt.Rectangle;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CatalogPdfImportService {

    private static final Pattern ROW_PATTERN = Pattern.compile("^(.*?)\\s+(\\d{7,10})\\s+([\\d,]+\\.\\d{2})$");
    private static final Pattern LEGACY_SKU_CANDIDATE = Pattern.compile("(?<!\\d)\\d{7,10}(?!\\d)");
    private static final Pattern HSN_PATTERN = Pattern.compile("(?i)HSN\\s*CODE\\s*[:\\s]+([0-9]{4,10})");
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public CatalogImportPreviewResponse previewCatalog(Brand brand, MultipartFile file) {
        validateBrand(brand);
        validatePdf(file);
        try (TemporaryCatalogPdf temporaryPdf = TemporaryCatalogPdf.copyOf(file);
             PDDocument document = Loader.loadPDF(temporaryPdf.path().toFile())) {
            CatalogParseResult catalog = parseCatalogRows(document);
            List<String> warnings = new ArrayList<>(catalog.warnings());
            Map<String, Product> existingProducts = findProductsBySku(catalog.rows());
            List<CatalogImportPreviewItem> items = new ArrayList<>();
            int creates = 0;
            int updates = 0;
            int conflicts = 0;

            for (CatalogRow row : catalog.rows()) {
                Product existing = existingProducts.get(row.sku().toUpperCase(Locale.ROOT));
                String action;
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
                }

                items.add(new CatalogImportPreviewItem(
                        row.sku(), row.name(), row.mrp(), action, row.sourcePage(),
                        existing == null ? null : existing.getName(),
                        existing == null ? null : existing.getMrp(),
                        existing == null || existing.getBrand() == null
                                ? null : existing.getBrand().getName(),
                        row.hsnCode(), row.material(), row.materialCode(), row.itemCode(),
                        existing == null || existing.getIsAvailable() == null
                                ? true : existing.getIsAvailable()));
            }

            int rejected = catalog.skippedRows() + conflicts;
            if (items.isEmpty() && warnings.isEmpty()) {
                warnings.add("No supported product rows were found in the catalogue PDF.");
            }
            return new CatalogImportPreviewResponse(
                    brand.getId(), brand.getName(), file.getOriginalFilename(), file.getSize(),
                    reviewToken(temporaryPdf.path(), brand.getId()), document.getNumberOfPages(),
                    items.size() + catalog.skippedRows(), creates, updates, conflicts, rejected,
                    warnings.isEmpty() && !items.isEmpty(), List.copyOf(items), List.copyOf(warnings));
        } catch (IOException exception) {
            throw new IllegalArgumentException("The catalogue PDF could not be read", exception);
        }
    }

    @Transactional
    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String reviewedSha256) {
        return importCatalog(brand, file, reviewedSha256, null, Set.of());
    }

    @Transactional
    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String reviewedSha256,
                                            List<String> selectedSkus, Set<String> unavailableSkus) {
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

            CatalogParseResult catalog = parseCatalogRows(document);
            if (!catalog.warnings().isEmpty() || catalog.rows().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        buildValidationMessage(catalog));
            }
            List<CatalogRow> rowsToImport = selectRows(catalog.rows(), selectedSkus);
            Set<String> normalizedUnavailable = normalizeSkuSet(unavailableSkus);
            Set<String> selectedSkuSet = rowsToImport.stream()
                    .map(row -> row.sku().toUpperCase(Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
            if (!selectedSkuSet.containsAll(normalizedUnavailable)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unavailable selections must be among the selected preview products.");
            }
            validateBrandOwnership(brand, rowsToImport);

            if (rowsToImport.stream().anyMatch(row -> row.systemName() == null)) {
                importCatalogRows(brand, document, rowsToImport, counters);
            } else {
                importLegacyRows(brand, rowsToImport, counters);
            }
            if (!normalizedUnavailable.isEmpty()) {
                for (Product product : productRepository.findBySkuIn(normalizedUnavailable)) {
                    if (brand.getId().equals(product.getBrand().getId())) {
                        product.setIsAvailable(false);
                        productRepository.save(product);
                    }
                }
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
            if (existing.getBrand() == null || !brand.getId().equals(existing.getBrand().getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "SKU " + existing.getSku()
                                + " already belongs to a different brand; no products were changed.");
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
        CatalogParseResult catalog = parseGenericCatalogRows(document);
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
        return CatalogLineParser.parsePositioned(lines);
    }

    private static void addPositionedLine(List<PositionedTextLine> lines, int pageNumber,
                                          List<TextPosition> positions) {
        if (positions.isEmpty()) {
            return;
        }
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
        Map<LegacyFamilyKey, ProductFamily> families = new LinkedHashMap<>();
        for (CatalogRow row : rows) {
            LegacyFamilyKey familyKey = new LegacyFamilyKey(
                    row.sourcePage(), row.systemName(), row.name(), row.hsnCode());
            ProductFamily family = families.computeIfAbsent(familyKey, ignored ->
                    new ProductFamily(row.name(), row.hsnCode(), new ArrayList<>()));
            family.variants().add(new CatalogVariant(row.sku(), row.size(), row.mrp(),
                    row.material(), row.materialCode(), row.itemCode()));
        }
        for (Map.Entry<LegacyFamilyKey, ProductFamily> entry : families.entrySet()) {
            importFamilies(brand, entry.getKey().systemName(), entry.getKey().pageNumber(),
                    List.of(entry.getValue()), counters);
        }
    }

    private void importCatalogRows(Brand brand, PDDocument document, List<CatalogRow> rows,
                                   ImportCounters counters) throws IOException {
        Map<Integer, List<ProductFamily>> familiesByPage = new LinkedHashMap<>();
        for (CatalogRow row : rows) {
            ProductFamily family = new ProductFamily(row.name(), row.hsnCode(),
                    new ArrayList<>(List.of(new CatalogVariant(row.sku(), null, row.mrp(),
                            row.material(), row.materialCode(), row.itemCode()))));
            familiesByPage.computeIfAbsent(row.sourcePage(), ignored -> new ArrayList<>()).add(family);
        }

        for (Map.Entry<Integer, List<ProductFamily>> entry : familiesByPage.entrySet()) {
            String systemName = detectSystemName(document.getPage(entry.getKey() - 1));
            importFamilies(brand, systemName, entry.getKey(), entry.getValue(), counters);
        }
    }

    private void importFamilies(Brand brand, String systemName, int pageNumber,
                                List<ProductFamily> families, ImportCounters counters) {
        if (families.isEmpty()) {
            return;
        }
        Category category = findOrCreateCategory(systemName);

        for (ProductFamily family : families) {
            for (CatalogVariant variant : family.variants()) {
                Product product = productRepository.findBySku(variant.sku()).orElse(null);
                boolean created = product == null;
                if (created) {
                    product = new Product();
                    product.setSku(variant.sku());
                    product.setStockQuantity(0);
                    product.setReorderLevel(10);
                    product.setUnit("Piece");
                }

                product.setName(limit(family.name(), 200));
                product.setDescription(null);
                product.setSize(variant.size() != null ? limit(variant.size(), 100) : null);
                String specSize = variant.size() != null ? "; Size: " + variant.size() : "";
                product.setSpecifications("Source PDF page: " + pageNumber + specSize);
                product.setBarcode(null);
                product.setPurchasePrice(null);
                product.setGstRate(null);
                product.setColor(null);
                product.setMaterial(variant.material());
                product.setMaterialCode(variant.materialCode());
                product.setItemCode(variant.itemCode());
                product.setBrand(brand);
                product.setCategory(category);
                product.setHsnCode(family.hsnCode());
                product.setMrp(variant.mrp());
                product.setSellingPrice(variant.mrp());
                product.setIsActive(true);
                if (product.getIsFeatured() == null) product.setIsFeatured(false);

                productRepository.save(product);
                if (created) counters.created++;
                else counters.updated++;
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
                    // A malformed commercial value is deliberately not imported.
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

        // Clean prefix like "Size"
        String text = value.replaceAll("(?i)^(size\\s*)+", "").replaceAll("\\s+", " ").trim();

        // Strip up to 2 trailing packaging quantity tokens (Std. Pkg. and Box Qty.)
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
                // Packaging quantities are typically at least 5 (e.g. 5, 10, 15, 25, 50, 100, 1400)
                // Standalone inch sizes like 1, 2, 3, 4 are preserved.
                if (val >= 5) {
                    end--;
                    strippedCount++;
                } else if (strippedCount == 1) {
                    // If Box Qty was already stripped (e.g. "-"), the token before it is Std Pkg
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

        // Check for Compound / Reducer dimensions (e.g., "2.0 x 1.5 ¾ x ½" or "4.0 x 3.2 1½ x 1¼")
        Matcher compoundMatcher = Pattern.compile("^(\\d+(?:\\.\\d+)?\\s*x\\s*\\d+(?:\\.\\d+)?)\\s+(.+)$").matcher(sizeText);
        if (compoundMatcher.matches()) {
            String cmPart = compoundMatcher.group(1).trim();
            String inchPart = compoundMatcher.group(2).trim();
            return inchPart + "\" (" + cmPart + " cm)";
        }

        // Check for Single dimension with both cm and inch (e.g. "1.5 ½" or "2 ¾" or "2.5 1" or "3.2 1¼" or "5 2")
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

    private String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    static final class CatalogLineParser {
        private static final String PRICE_PREFIX = "(?:(?:Rs\\.?|INR|[t₹<$€£?])\\s*)";
        private static final String PRICE_VALUE = "((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?)";
        private static final String PRICE_MARKER = "(?i)(?:\\bRs\\.?|\\bINR\\b|[₹$€£]|"
                + "(?-i:(?<![A-Za-z0-9])t(?=\\s*\\d))|['’]?\\(\\s*(?=\\d))";
        private static final String PRICE_NUMBER = "(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?";
        private static final Pattern PRICE_TOKEN = Pattern.compile(
                PRICE_MARKER + "\\s*" + PRICE_NUMBER + "(?![\\dA-Za-z,.])");
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
                "^([A-Z][A-Z0-9-]{3,20})\\s+(.+)$", Pattern.CASE_INSENSITIVE);
        private static final Pattern NAME_FIRST_PRODUCT = Pattern.compile(
                "^(.+?)\\s+([A-Z][A-Z0-9-]{3,20})$", Pattern.CASE_INSENSITIVE);
        private static final Pattern SKU_FIRST_ROW = Pattern.compile(
                "^([A-Z][A-Z0-9-]{3,20})\\s+(.+?)\\s+" + PRICE_PREFIX + PRICE_VALUE + "$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern NAME_FIRST_ROW = Pattern.compile(
                "^(.+?)\\s+([A-Z][A-Z0-9-]{3,20})\\s+" + PRICE_PREFIX + PRICE_VALUE + "$",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern SKU_TOKEN = Pattern.compile(
                "(?<![A-Z0-9-])[A-Z][A-Z0-9-]{3,20}(?![A-Z0-9-])",
                Pattern.CASE_INSENSITIVE);
        private static final Pattern CURRENCY_MARKER = Pattern.compile(
                "(?i)(?:^|\\s)(?:Rs\\.?|INR|[₹<$€£?]|t)(?=\\s*"
                        + "(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?(?:\\s|$))");
        private static final Pattern LABELED_FIELD = Pattern.compile(
                "(?i)\\b(HSN(?:\\s*CODE)?|MATERIAL\\s*CODE|ITEM\\s*(?:/\\s*PRODUCT\\s*)?CODE|"
                        + "PRODUCT\\s*CODE|MATERIAL)\\s*[:#]\\s*([A-Z0-9][A-Z0-9./-]{0,39})\\b");

        private CatalogLineParser() {
        }

        static CatalogParseResult parsePositioned(List<PositionedTextLine> lines) {
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
                if (isMrpLabel(text)) {
                    continue;
                }
                Matcher mappedRupee = MAPPED_RUPEE_PRICE.matcher(text);
                if (mappedRupee.matches()) {
                    BigDecimal amount = new BigDecimal(mappedRupee.group(1).replace(",", ""));
                    mappedRupeePrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), amount, text));
                    continue;
                }

                List<MatchResult> markers = findMatches(PRICE_MARKER_ONLY, text);
                List<MatchResult> priceTokens = findMatches(PRICE_TOKEN, text);
                if (priceTokens.isEmpty() && isExplanatoryText(text)) {
                    continue;
                }
                ParsedCatalogText parsedText = extractLabeledFields(text);
                List<String> skuCandidates = findSkuCandidates(parsedText.productText());
                ProductText product = parseProductText(parsedText.productText(), markers, parsedText.fields());
                if (product != null) {
                    if (parsedText.ambiguous()) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "one or more labeled product fields had conflicting values"));
                        skippedRows++;
                        continue;
                    }
                    if (!findSkuCandidates(product.name().replaceAll("\\([^)]*\\)", " ")).isEmpty()) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "multiple SKU candidates were present in one visual cell"));
                        skippedRows++;
                        continue;
                    }
                    if (markers.size() > 1 || priceTokens.size() > 1) {
                        warnings.add(skippedRowWarning(line.pageNumber(), text,
                                "multiple price candidates were found in one visual cell"));
                        malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                                line.startX(), line.endX(), null, text));
                        skippedRows++;
                        continue;
                    }
                    products.add(new PositionedProduct(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), product.sku(), product.name(), text,
                            product.fields()));
                } else if (hasSeparatedProductName(text, skuCandidates)) {
                    warnings.add(skippedRowWarning(line.pageNumber(), text,
                            "its SKU and product name could not be separated"));
                    skippedRows++;
                } else if (markers.isEmpty() && priceTokens.isEmpty()) {
                    possibleNameContinuations.add(line);
                }

                if (markers.size() > priceTokens.size()) {
                    malformedPrices.add(new PositionedPrice(line.pageNumber(), line.y(),
                            line.startX(), line.endX(), null, text));
                }
                for (MatchResult token : priceTokens) {
                    try {
                        BigDecimal value = new BigDecimal(token.group(1).replace(",", ""));
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

            products = attachWrappedNames(products, possibleNameContinuations);
            addPositionallySupportedRupeePrices(products, mappedRupeePrices, prices);
            Map<Integer, PositionedPrice> assignedPrices = assignPrices(products, prices);
            assignMrpPrices(products, mrpPrices, assignedPrices);
            List<CatalogRow> rows = new ArrayList<>();
            for (int index = 0; index < products.size(); index++) {
                PositionedProduct product = products.get(index);
                PositionedPrice price = assignedPrices.get(index);
                if (price == null) {
                    PositionedPrice malformed = nearestPrice(product, malformedPrices, 25, 55);
                    String reason = malformed == null
                            ? "no unambiguous price was found in the same row or aligned cell"
                            : "the associated price was malformed";
                    warnings.add(skippedRowWarning(product.pageNumber(), product.raw(), reason));
                    skippedRows++;
                    continue;
                }
                rows.add(new CatalogRow(product.sku().toUpperCase(Locale.ROOT), product.name(),
                        price.value(), product.pageNumber(), null, null, product.fields().hsnCode(),
                        product.fields().material(), product.fields().materialCode(),
                        product.fields().itemCode()));
            }

            return collapseDuplicates(rows, warnings, skippedRows);
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
                BigDecimal amount = new BigDecimal(value.text().replace(",", ""));
                if (amount.signum() > 0) {
                    result.add(new PositionedMrpPrice(header.pageNumber(), header.y(),
                            header.startX(), amount, value.text()));
                }
            }
            return result;
        }

        private static void assignMrpPrices(List<PositionedProduct> products,
                                            List<PositionedMrpPrice> mrpPrices,
                                            Map<Integer, PositionedPrice> assignedPrices) {
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
                    Matcher skuTokens = SKU_TOKEN.matcher(parsedText.productText());
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

            return collapseDuplicates(rows, unsupportedRows, skippedRows);
        }

        private static ProductText parseProductText(String text, List<MatchResult> markers,
                                                   CatalogAttributes fields) {
            String productText = text;
            if (!markers.isEmpty()) {
                productText = text.substring(0, markers.get(0).start()).trim();
            }

            Matcher row = SPLIT_ALPHA_NUMERIC_SKU.matcher(productText);
            if (row.matches()) {
                return productText(row.group(1) + row.group(2) + row.group(3), row.group(4), fields);
            }
            row = SPLIT_NUMERIC_SKU.matcher(productText);
            if (row.matches()) {
                return productText(row.group(1) + row.group(2), row.group(3), fields);
            }
            row = SKU_FIRST_PRODUCT.matcher(productText);
            if (row.matches()) {
                return productText(row.group(1), row.group(2), fields);
            }
            row = NAME_FIRST_PRODUCT.matcher(productText);
            if (row.matches()) {
                return productText(row.group(2), row.group(1), fields);
            }
            return null;
        }

        private static ProductText productText(String sku, String name, CatalogAttributes fields) {
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
                if (!text.matches("(?i)^[A-Za-z][A-Za-z0-9 ,()./'&-]{1,100}$")) {
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
                            || verticalDistance <= 0 || verticalDistance > 11
                            || horizontalDistance > 12) {
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
                    String name = normalizeCatalogText(product.name() + " " + text);
                    if (name.length() <= 200) {
                        result.set(match, new PositionedProduct(product.pageNumber(), product.y(),
                                product.startX(), product.endX(), product.sku(), name,
                                product.raw() + " " + text, product.fields()));
                    }
                }
            }
            return result;
        }

        private static List<String> findSkuCandidates(String text) {
            List<String> candidates = new ArrayList<>();
            Matcher matcher = SKU_TOKEN.matcher(text);
            while (matcher.find()) {
                String candidate = matcher.group();
                if (candidate.matches("(?i)(?=.*[A-Z])(?=.*\\d)[A-Z0-9-]{4,21}")) {
                    candidates.add(candidate);
                }
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
                List<CatalogRow> rows, List<String> warnings, int skippedRows) {
            Map<String, CatalogRow> rowsBySku = new LinkedHashMap<>();
            Set<String> conflictingSkus = new HashSet<>();
            List<String> conflictWarnings = new ArrayList<>();
            for (CatalogRow row : rows) {
                String skuKey = row.sku().toUpperCase(Locale.ROOT);
                if (conflictingSkus.contains(skuKey)) {
                    continue;
                }
                CatalogRow existing = rowsBySku.putIfAbsent(skuKey, row);
                if (existing != null && (!existing.name().equalsIgnoreCase(row.name())
                        || existing.mrp().compareTo(row.mrp()) != 0
                        || !java.util.Objects.equals(existing.hsnCode(), row.hsnCode())
                        || !java.util.Objects.equals(existing.material(), row.material())
                        || !java.util.Objects.equals(existing.materialCode(), row.materialCode())
                        || !java.util.Objects.equals(existing.itemCode(), row.itemCode()))) {
                    rowsBySku.remove(skuKey);
                    conflictingSkus.add(skuKey);
                    conflictWarnings.add("Conflicting catalogue SKU " + row.sku() + " on pages "
                            + existing.sourcePage() + " and " + row.sourcePage() + ": \""
                            + existing.name() + "\" at " + existing.mrp() + " vs \""
                            + row.name() + "\" at " + row.mrp() + ".");
                }
            }
            List<String> allWarnings = new ArrayList<>(warnings);
            allWarnings.addAll(conflictWarnings);
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
                      String systemName, String size, String hsnCode,
                      String material, String materialCode, String itemCode) {
        CatalogRow(String sku, String name, BigDecimal mrp, int sourcePage,
                   String systemName, String size, String hsnCode) {
            this(sku, name, mrp, sourcePage, systemName, size, hsnCode, null, null, null);
        }
    }

    record CatalogParseResult(List<CatalogRow> rows, List<String> warnings, int skippedRows) {
        CatalogParseResult {
            rows = List.copyOf(rows);
            warnings = List.copyOf(warnings);
        }
    }

    private record CatalogVariant(String sku, String size, BigDecimal mrp,
                                  String material, String materialCode, String itemCode) {
        private CatalogVariant(String sku, String size, BigDecimal mrp) {
            this(sku, size, mrp, null, null, null);
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
