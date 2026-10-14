package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.entity.Category;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.CatalogueImageCleanupTaskRepository;
import com.sanitaryware.crm.repository.ProductImageRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.contentstream.PDFStreamEngine;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.contentstream.operator.DrawObject;
import org.apache.pdfbox.contentstream.operator.state.Concatenate;
import org.apache.pdfbox.contentstream.operator.state.Restore;
import org.apache.pdfbox.contentstream.operator.state.Save;
import org.apache.pdfbox.contentstream.operator.state.SetMatrix;
import org.apache.pdfbox.cos.COSBase;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CatalogPdfImportService {

    private static final Pattern ROW_PATTERN = Pattern.compile("^(.*?)\\s+(\\d{7,10})\\s+([\\d,]+\\.\\d{2})$");
    private static final Pattern HSN_PATTERN = Pattern.compile("(?i)HSN\\s*CODE\\s*[:\\s]+([0-9]{4,10})");
    private static final int MAX_WARNINGS = 100;

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CatalogueImageCleanupTaskRepository catalogueImageCleanupTaskRepository;
    private final ProductImageRepository productImageRepository;
    private final FileUploadService fileUploadService;

    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file) {
        return importCatalog(brand, file, null);
    }

    public BulkUploadResponse importCatalog(Brand brand, MultipartFile file, String requestedBatchId) {
        validatePdf(file);
        String batchId = requestedBatchId == null || requestedBatchId.isBlank()
                ? UUID.randomUUID().toString()
                : requestedBatchId.trim();
        if (!batchId.matches("[A-Za-z0-9_-]{1,64}")) {
            throw new IllegalArgumentException("Catalogue import batchId must contain only letters, numbers, '_' or '-'");
        }
        ImportCounters counters = new ImportCounters();
        List<String> warnings = new ArrayList<>();
        Set<String> generatedImageUrls = new HashSet<>();

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
                PDPage page = document.getPage(pageIndex);
                String systemName = detectSystemName(page);
                List<ImagePlacement> images = extractProductImages(page);
                float middle = page.getMediaBox().getWidth() / 2f;

                importColumn(brand, systemName, pageIndex + 1,
                        extractColumn(page, "left", 0, middle),
                        images.stream().filter(image -> image.x() < middle).toList(), counters, warnings, batchId,
                        generatedImageUrls);
                importColumn(brand, systemName, pageIndex + 1,
                        extractColumn(page, "right", middle, page.getMediaBox().getWidth() - middle),
                        images.stream().filter(image -> image.x() >= middle).toList(), counters, warnings, batchId,
                        generatedImageUrls);
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("The catalogue PDF could not be read", exception);
        }

        cleanupUnlinkedCatalogueImages(batchId, generatedImageUrls, warnings);

        return BulkUploadResponse.builder()
                .batchId(batchId)
                .createdCount(counters.created)
                .updatedCount(counters.updated)
                .totalProcessed(counters.created + counters.updated)
                .imagesLinkedCount(counters.imagesLinked)
                .imageLinkFailures(counters.imageLinkFailures)
                .skippedCount(counters.skipped)
                .errors(warnings)
                .build();
    }

    private void importColumn(Brand brand, String systemName, int pageNumber, String text,
                              List<ImagePlacement> images, ImportCounters counters, List<String> warnings, String batchId,
                              Set<String> generatedImageUrls) {
        List<ProductFamily> families = parseFamilies(text, pageNumber);
        Category category = findOrCreateCategory(systemName);
        List<ImagePlacement> orderedImages = images.stream()
                .sorted(Comparator.comparingDouble(ImagePlacement::y).reversed())
                .toList();

        for (int familyIndex = 0; familyIndex < families.size(); familyIndex++) {
            ProductFamily family = families.get(familyIndex);
            ImagePlacement familyImage = familyIndex < orderedImages.size() ? orderedImages.get(familyIndex) : null;
            String sharedImageUrl = null;
            boolean imageStorageAttempted = false;

            for (CatalogVariant variant : family.variants()) {
                Product saved;
                boolean created;
                try {
                    if (!isPersistablePrice(variant.mrp())) {
                        counters.skipped++;
                        addWarning(warnings, "Page " + pageNumber + ", SKU " + variant.sku()
                                + ": price is outside the supported product range");
                        continue;
                    }
                    Product product = productRepository.findBySku(variant.sku()).orElse(null);
                    created = product == null;
                    if (created) {
                        product = new Product();
                        product.setSku(variant.sku());
                        product.setStockQuantity(0);
                        product.setReorderLevel(10);
                        product.setUnit("Piece");
                        product.setCatalogueImportBatchId(batchId);
                    }

                    product.setName(limit(family.name(), 200));
                    String descSize = variant.size() != null ? ". Size: " + variant.size() + "." : ".";
                    product.setDescription(systemName + " product from the " + brand.getName() + " catalogue. "
                            + "Family: " + family.name() + descSize);
                    product.setSize(variant.size() != null ? limit(variant.size(), 100) : null);
                    String specSize = variant.size() != null ? "; Size: " + variant.size() : "";
                    product.setSpecifications("Catalogue system: " + systemName + "; Product family: " + family.name()
                            + specSize + "; Source PDF page: " + pageNumber + "; MRP inclusive of all taxes.");
                    product.setMaterial(inferMaterial(systemName));
                    product.setBrand(brand);
                    product.setCategory(category);
                    product.setHsnCode(family.hsnCode());
                    product.setMrp(variant.mrp());
                    product.setSellingPrice(variant.mrp());
                    product.setIsActive(true);
                    if (product.getIsFeatured() == null) product.setIsFeatured(false);

                    saved = productRepository.save(product);
                } catch (RuntimeException exception) {
                    counters.skipped++;
                    addWarning(warnings, "Page " + pageNumber + ", SKU " + variant.sku() + ": " + exception.getMessage());
                    continue;
                }

                if (created) counters.created++; else counters.updated++;

                try {
                    if (familyImage == null || !productImageRepository
                            .findByProductIdOrderByDisplayOrderAsc(saved.getId()).isEmpty()) continue;
                    if (!imageStorageAttempted) {
                        sharedImageUrl = storeCatalogueImage(familyImage, warnings, pageNumber, family.name());
                        imageStorageAttempted = true;
                        if (sharedImageUrl != null) generatedImageUrls.add(sharedImageUrl);
                    }
                    if (sharedImageUrl == null) {
                        counters.imageLinkFailures++;
                        continue;
                    }
                    ProductImage image = new ProductImage();
                    image.setProduct(saved);
                    image.setImageUrl(sharedImageUrl);
                    image.setIsPrimary(true);
                    image.setDisplayOrder(0);
                    image.setCatalogueImportBatchId(batchId);
                    productImageRepository.save(image);
                    counters.imagesLinked++;
                } catch (RuntimeException exception) {
                    counters.imageLinkFailures++;
                    addWarning(warnings, "Page " + pageNumber + ", SKU " + variant.sku()
                            + ": catalogue image could not be linked");
                }
            }
        }
    }

    private void cleanupUnlinkedCatalogueImages(String batchId, Set<String> generatedImageUrls, List<String> warnings) {
        String prefix = "/api/files/download/";
        for (String imageUrl : generatedImageUrls) {
            try {
                if (imageUrl.startsWith(prefix) && !productImageRepository.existsByImageUrl(imageUrl)) {
                    fileUploadService.deleteFile(imageUrl.substring(prefix.length()));
                }
            } catch (RuntimeException exception) {
                try {
                    if (!catalogueImageCleanupTaskRepository.existsByBatchIdAndImageUrl(batchId, imageUrl)) {
                        var cleanupTask = new com.sanitaryware.crm.entity.CatalogueImageCleanupTask();
                        cleanupTask.setBatchId(batchId);
                        cleanupTask.setImageUrl(imageUrl);
                        catalogueImageCleanupTaskRepository.save(cleanupTask);
                    }
                    addWarning(warnings, "An unlinked catalogue image could not be removed automatically; batch cleanup will retry it");
                } catch (RuntimeException taskException) {
                    addWarning(warnings, "An unlinked catalogue image needs manual storage cleanup");
                }
            }
        }
    }

    private boolean isPersistablePrice(BigDecimal price) {
        return price != null && price.signum() >= 0
                && price.scale() <= 2
                && price.compareTo(new BigDecimal("99999999.99")) <= 0;
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

    private List<ImagePlacement> extractProductImages(PDPage page) throws IOException {
        ImageLocationEngine engine = new ImageLocationEngine();
        engine.processPage(page);
        return engine.images.stream()
                .filter(image -> image.image().getWidth() >= 35 && image.image().getHeight() >= 35)
                .filter(image -> image.image().getWidth() < 800 && image.image().getHeight() < 800)
                .filter(this::isLikelyProductImage)
                .toList();
    }

    private boolean isLikelyProductImage(ImagePlacement placement) {
        try {
            return placement.image().getSoftMask() != null || placement.image().getHeight() >= 80;
        } catch (IOException exception) {
            return placement.image().getHeight() >= 80;
        }
    }

    private String storeCatalogueImage(ImagePlacement placement, List<String> warnings,
                                       int pageNumber, String familyName) {
        try {
            BufferedImage image = placement.image().getImage();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            String stored = fileUploadService.storeGeneratedFile(output.toByteArray(), ".png", "products/catalogue");
            return "/api/files/download/" + stored;
        } catch (IOException | RuntimeException exception) {
            addWarning(warnings, "Page " + pageNumber + ", " + familyName + ": image could not be stored");
            return null;
        }
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
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("A catalogue PDF is required");
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new IllegalArgumentException("Only PDF catalogues are supported");
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

    private String inferMaterial(String systemName) {
        String upper = systemName.toUpperCase(Locale.ROOT);
        if (upper.contains("CPVC")) return "CPVC";
        if (upper.contains("UPVC")) return "uPVC";
        if (upper.contains("SWR")) return "uPVC";
        return null;
    }

    private String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private void addWarning(List<String> warnings, String warning) {
        if (warnings.size() < MAX_WARNINGS) warnings.add(warning);
    }

    private record CatalogVariant(String sku, String size, BigDecimal mrp) { }

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

    private record ImagePlacement(PDImageXObject image, float x, float y) { }

    private static final class ImportCounters {
        private int created;
        private int updated;
        private int imagesLinked;
        private int imageLinkFailures;
        private int skipped;
    }

    private static final class ImageLocationEngine extends PDFStreamEngine {
        private final List<ImagePlacement> images = new ArrayList<>();

        private ImageLocationEngine() {
            addOperator(new Concatenate(this));
            addOperator(new DrawObject(this));
            addOperator(new SetMatrix(this));
            addOperator(new Save(this));
            addOperator(new Restore(this));
        }

        @Override
        protected void processOperator(Operator operator, List<COSBase> operands) throws IOException {
            if ("Do".equals(operator.getName())) {
                COSName objectName = (COSName) operands.get(0);
                PDXObject object = getResources().getXObject(objectName);
                if (object instanceof PDImageXObject image) {
                    Matrix matrix = getGraphicsState().getCurrentTransformationMatrix();
                    images.add(new ImagePlacement(image, matrix.getTranslateX(), matrix.getTranslateY()));
                    return;
                }
                if (object instanceof PDFormXObject form) {
                    showForm(form);
                    return;
                }
            }
            super.processOperator(operator, operands);
        }
    }
}
