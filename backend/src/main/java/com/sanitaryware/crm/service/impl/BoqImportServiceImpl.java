package com.sanitaryware.crm.service.impl;

import com.sanitaryware.crm.dto.BoqImportResponseDTO;
import com.sanitaryware.crm.dto.BoqItemCandidateDTO;
import com.sanitaryware.crm.dto.BoqItemMatchDTO;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductImage;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.service.BoqImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class BoqImportServiceImpl implements BoqImportService {

    private final ProductRepository productRepository;

    private static final Pattern SKU_PATTERN = Pattern.compile("(?i)\\b([A-Z0-9]{2,5}[-_]?[0-9A-Z]{3,10})\\b");
    private static final Pattern QTY_PATTERN = Pattern.compile("(?i)\\b(\\d{1,5})\\s*(?:nos|pcs|pieces|units|qty|pk|set)?\\b");

    @Override
    @Transactional(readOnly = true)
    public BoqImportResponseDTO parseAndMatchBoq(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a valid PDF, Excel, or CSV requirement sheet to upload.");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String lower = originalFilename.toLowerCase();

        List<RawRequirementItem> rawItems;
        try {
            if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
                rawItems = parseExcel(file);
            } else if (lower.endsWith(".pdf")) {
                rawItems = parsePdf(file);
            } else if (isImageFile(lower)) {
                rawItems = parseImage(file);
            } else {
                rawItems = parseCsv(file);
            }
        } catch (Exception e) {
            log.error("Failed to parse requirement document: " + originalFilename, e);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Failed to parse document: " + e.getMessage());
        }

        if (rawItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "No requirement line items could be detected in " + originalFilename);
        }

        // Match against database products
        return matchAgainstCatalog(originalFilename, rawItems);
    }

    private static class RawRequirementItem {
        int rowIndex;
        String rawLine;
        String detectedSku;
        String detectedDescription;
        int detectedQty = 1;
        BigDecimal targetPrice;
    }

    private List<RawRequirementItem> parseExcel(MultipartFile file) throws Exception {
        List<RawRequirementItem> items = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) return items;

            int skuCol = -1;
            int descCol = -1;
            int qtyCol = -1;
            int priceCol = -1;
            int startRow = 0;

            // Scan first 10 rows for header
            for (int r = 0; r <= Math.min(10, sheet.getLastRowNum()); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                for (int c = 0; c < row.getLastCellNum(); c++) {
                    String val = getCellString(row.getCell(c)).toLowerCase();
                    if (val.matches(".*(sku|code|part\\s*no|item\\s*code|model).*") && skuCol == -1) {
                        skuCol = c;
                    } else if (val.matches(".*(desc|particular|item\\s*name|name|product).*") && descCol == -1) {
                        descCol = c;
                    } else if (val.matches(".*(qty|quantity|nos|pcs|units|count).*") && qtyCol == -1) {
                        qtyCol = c;
                    } else if (val.matches(".*(rate|price|mrp|cost|unit\\s*price).*") && priceCol == -1) {
                        priceCol = c;
                    }
                }

                if (descCol != -1 || skuCol != -1) {
                    startRow = r + 1;
                    break;
                }
            }

            // Fallback column positions if headers weren't named standardly
            if (skuCol == -1 && descCol == -1) {
                skuCol = 0;
                descCol = 1;
                qtyCol = 2;
                priceCol = 3;
            } else if (descCol == -1 && skuCol != -1) {
                descCol = skuCol == 0 ? 1 : 0;
            }

            int index = 1;
            for (int r = startRow; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String skuVal = skuCol >= 0 ? getCellString(row.getCell(skuCol)).trim() : "";
                String descVal = descCol >= 0 ? getCellString(row.getCell(descCol)).trim() : "";
                String qtyVal = qtyCol >= 0 ? getCellString(row.getCell(qtyCol)).trim() : "1";
                String priceVal = priceCol >= 0 ? getCellString(row.getCell(priceCol)).trim() : "";

                if (skuVal.isBlank() && descVal.isBlank()) continue;

                RawRequirementItem item = new RawRequirementItem();
                item.rowIndex = index++;
                item.rawLine = (skuVal + " " + descVal).trim();
                item.detectedSku = cleanSku(skuVal);
                item.detectedDescription = descVal.isBlank() ? skuVal : descVal;

                try {
                    item.detectedQty = Math.max(1, (int) Double.parseDouble(qtyVal.replaceAll("[^0-9.]", "")));
                } catch (Exception ignored) {
                    item.detectedQty = 1;
                }

                if (!priceVal.isBlank()) {
                    try {
                        item.targetPrice = new BigDecimal(priceVal.replaceAll("[^0-9.]", ""));
                    } catch (Exception ignored) {}
                }

                items.add(item);
            }
        }
        return items;
    }

    private List<RawRequirementItem> parseCsv(MultipartFile file) throws Exception {
        List<RawRequirementItem> items = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int index = 1;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isBlank() || line.startsWith("#")) continue;

                String[] parts = line.split("[,;\\t]");
                if (parts.length == 0) continue;

                RawRequirementItem item = new RawRequirementItem();
                item.rowIndex = index++;
                item.rawLine = line;

                if (parts.length >= 3) {
                    item.detectedSku = cleanSku(parts[0]);
                    item.detectedDescription = parts[1].trim();
                    try {
                        item.detectedQty = Math.max(1, Integer.parseInt(parts[2].replaceAll("[^0-9]", "")));
                    } catch (Exception ignored) {
                        item.detectedQty = 1;
                    }
                } else if (parts.length == 2) {
                    item.detectedSku = cleanSku(parts[0]);
                    item.detectedDescription = parts[1].trim();
                    item.detectedQty = 1;
                } else {
                    item.detectedDescription = parts[0].trim();
                    item.detectedSku = cleanSku(parts[0]);
                    item.detectedQty = 1;
                }
                items.add(item);
            }
        }
        return items;
    }

    private boolean isImageFile(String filename) {
        return filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                || filename.endsWith(".webp") || filename.endsWith(".bmp")
                || filename.endsWith(".tif") || filename.endsWith(".tiff");
    }

    private String runTesseract(Path imagePath) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "tesseract",
                    imagePath.toAbsolutePath().toString(),
                    "stdout",
                    "-l", "eng",
                    "--psm", "6"
            );
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
            }
            boolean finished = process.waitFor(45, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Tesseract OCR process timed out for {}", imagePath);
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Failed to run Tesseract OCR on " + imagePath, e);
            return "";
        }
    }

    private List<RawRequirementItem> parseImage(MultipartFile file) throws Exception {
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "scan.png";
        String ext = ".png";
        int dot = originalFilename.lastIndexOf('.');
        if (dot >= 0) {
            ext = originalFilename.substring(dot);
        }
        Path tempFile = Files.createTempFile("boq-ocr-upload-", ext);
        try {
            file.transferTo(tempFile.toFile());
            String ocrText = runTesseract(tempFile);
            log.info("OCR completed for image {}: extracted {} chars", originalFilename, ocrText.length());
            return parseTextToRawItems(ocrText);
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    private List<RawRequirementItem> parsePdf(MultipartFile file) throws Exception {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String fullText = stripper.getText(document);

            // If PDF is a scanned document without text layer, render pages and run OCR
            if (fullText.trim().length() < 30 && document.getNumberOfPages() > 0) {
                log.info("PDF has minimal text layer ({} chars). Running OCR on {} pages...", fullText.trim().length(), document.getNumberOfPages());
                PDFRenderer renderer = new PDFRenderer(document);
                StringBuilder ocrSb = new StringBuilder();
                int maxPages = Math.min(10, document.getNumberOfPages());
                for (int pageIdx = 0; pageIdx < maxPages; pageIdx++) {
                    BufferedImage bim = renderer.renderImageWithDPI(pageIdx, 200, ImageType.RGB);
                    Path tempPageImg = Files.createTempFile("pdf-page-ocr-", ".png");
                    try {
                        ImageIO.write(bim, "png", tempPageImg.toFile());
                        String pageText = runTesseract(tempPageImg);
                        ocrSb.append(pageText).append("\n");
                    } finally {
                        Files.deleteIfExists(tempPageImg);
                    }
                }
                fullText = ocrSb.toString();
            }

            return parseTextToRawItems(fullText);
        }
    }

    private List<RawRequirementItem> parseTextToRawItems(String fullText) {
        List<RawRequirementItem> items = new ArrayList<>();
        String[] lines = fullText.split("\\r?\\n");

        int index = 1;
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.length() < 3 || isNoiseLine(line)) continue;

            RawRequirementItem item = new RawRequirementItem();
            item.rowIndex = index++;
            item.rawLine = line;

            Matcher skuMatcher = SKU_PATTERN.matcher(line);
            if (skuMatcher.find()) {
                item.detectedSku = skuMatcher.group(1).trim().toUpperCase(Locale.ROOT);
            }

            Matcher qtyMatcher = QTY_PATTERN.matcher(line);
            if (qtyMatcher.find()) {
                try {
                    item.detectedQty = Math.max(1, Integer.parseInt(qtyMatcher.group(1)));
                } catch (Exception ignored) {
                    item.detectedQty = 1;
                }
            } else {
                item.detectedQty = 1;
            }

            item.detectedDescription = line;
            items.add(item);
        }
        return items;
    }

    private BoqImportResponseDTO matchAgainstCatalog(String fileName, List<RawRequirementItem> rawItems) {
        List<BoqItemMatchDTO> resultItems = new ArrayList<>();
        int matched = 0;
        int fuzzy = 0;
        int unmatched = 0;
        BigDecimal estimatedSubtotal = BigDecimal.ZERO;

        // Collect all distinct detected SKUs for batch loading (including OCR 0/O variations)
        Set<String> candidateSkus = new HashSet<>();
        for (RawRequirementItem raw : rawItems) {
            if (raw.detectedSku != null && !raw.detectedSku.isBlank()) {
                String upper = raw.detectedSku.toUpperCase(Locale.ROOT);
                candidateSkus.add(upper);
                candidateSkus.add(upper.replace('O', '0'));
                candidateSkus.add(upper.replace('0', 'O'));
            }
        }

        Map<String, Product> skuMap = new HashMap<>();
        if (!candidateSkus.isEmpty()) {
            for (Product p : productRepository.findBySkuIn(candidateSkus)) {
                skuMap.put(p.getSku().toUpperCase(Locale.ROOT), p);
            }
        }

        for (RawRequirementItem raw : rawItems) {
            BoqItemMatchDTO match = new BoqItemMatchDTO();
            match.setRowIndex(raw.rowIndex);
            match.setRawText(raw.rawLine);
            match.setRequestedSku(raw.detectedSku);
            match.setRequestedDescription(raw.detectedDescription);
            match.setRequestedQuantity(raw.detectedQty);
            match.setTargetPrice(raw.targetPrice);

            Product matchedProduct = null;
            if (raw.detectedSku != null) {
                String upper = raw.detectedSku.toUpperCase(Locale.ROOT);
                if (skuMap.containsKey(upper)) {
                    matchedProduct = skuMap.get(upper);
                } else if (skuMap.containsKey(upper.replace('O', '0'))) {
                    matchedProduct = skuMap.get(upper.replace('O', '0'));
                } else if (skuMap.containsKey(upper.replace('0', 'O'))) {
                    matchedProduct = skuMap.get(upper.replace('0', 'O'));
                }

                if (matchedProduct != null) {
                    match.setMatchStatus("EXACT_MATCH");
                    matched++;
                }
            }

            if (matchedProduct == null && raw.detectedSku != null) {
                // Try barcode lookup
                matchedProduct = productRepository.findByBarcode(raw.detectedSku).orElse(null);
                if (matchedProduct != null) {
                    match.setMatchStatus("EXACT_MATCH");
                    matched++;
                }
            }

            // If still unmatched, attempt fuzzy / keyword matching
            if (matchedProduct == null && raw.detectedDescription != null && !raw.detectedDescription.isBlank()) {
                String cleanQuery = cleanKeywords(raw.detectedDescription);
                if (!cleanQuery.isBlank()) {
                    Page<Product> searchResults = productRepository.searchProducts(cleanQuery, PageRequest.of(0, 5));
                    if (!searchResults.isEmpty()) {
                        matchedProduct = searchResults.getContent().get(0);
                        match.setMatchStatus("FUZZY_MATCH");
                        fuzzy++;

                        List<BoqItemCandidateDTO> candidates = new ArrayList<>();
                        for (Product cand : searchResults.getContent()) {
                            candidates.add(toCandidateDto(cand));
                        }
                        match.setCandidateOptions(candidates);
                    }
                }
            }

            if (matchedProduct != null) {
                populateProductDetails(match, matchedProduct);
                BigDecimal linePrice = matchedProduct.getSellingPrice() != null ? matchedProduct.getSellingPrice() : matchedProduct.getMrp();
                if (linePrice != null) {
                    estimatedSubtotal = estimatedSubtotal.add(linePrice.multiply(BigDecimal.valueOf(raw.detectedQty)));
                }
            } else {
                match.setMatchStatus("UNMATCHED");
                unmatched++;
            }

            resultItems.add(match);
        }

        return BoqImportResponseDTO.builder()
                .fileName(fileName)
                .totalRows(resultItems.size())
                .matchedCount(matched)
                .fuzzyCount(fuzzy)
                .unmatchedCount(unmatched)
                .estimatedSubtotal(estimatedSubtotal)
                .items(resultItems)
                .build();
    }

    private void populateProductDetails(BoqItemMatchDTO dto, Product product) {
        dto.setMatchedProductId(product.getId());
        dto.setMatchedProductName(product.getName());
        dto.setMatchedProductSku(product.getSku());
        dto.setBrandName(product.getBrand() != null ? product.getBrand().getName() : "--");
        dto.setBarcode(product.getBarcode());
        dto.setHsnCode(product.getHsnCode());
        dto.setGstRate(product.getGstRate() != null ? product.getGstRate() : BigDecimal.valueOf(18.0));
        dto.setUnitPrice(product.getSellingPrice() != null ? product.getSellingPrice() : product.getMrp());
        dto.setMrp(product.getMrp());
        dto.setStockQuantity(product.getStockQuantity());

        if (product.getImages() != null && !product.getImages().isEmpty()) {
            ProductImage img = product.getImages().stream().filter(ProductImage::getIsPrimary).findFirst()
                    .orElse(product.getImages().get(0));
            dto.setPrimaryImageUrl(img.getImageUrl());
        }
    }

    private BoqItemCandidateDTO toCandidateDto(Product p) {
        String imgUrl = null;
        if (p.getImages() != null && !p.getImages().isEmpty()) {
            ProductImage img = p.getImages().stream().filter(ProductImage::getIsPrimary).findFirst()
                    .orElse(p.getImages().get(0));
            imgUrl = img.getImageUrl();
        }
        return BoqItemCandidateDTO.builder()
                .id(p.getId())
                .sku(p.getSku())
                .name(p.getName())
                .brandName(p.getBrand() != null ? p.getBrand().getName() : "--")
                .sellingPrice(p.getSellingPrice())
                .mrp(p.getMrp())
                .stockQuantity(p.getStockQuantity())
                .primaryImageUrl(imgUrl)
                .build();
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue().toString();
                }
                double num = cell.getNumericCellValue();
                if (num == Math.floor(num)) {
                    yield String.valueOf((long) num);
                }
                yield String.valueOf(num);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield String.valueOf(cell.getStringCellValue());
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private String cleanSku(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        Matcher m = SKU_PATTERN.matcher(trimmed);
        if (m.find()) {
            return m.group(1).trim().toUpperCase(Locale.ROOT);
        }
        return trimmed.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private String cleanKeywords(String desc) {
        if (desc == null) return "";
        return desc.replaceAll("(?i)\\b(the|with|for|set|mm|inch|cm|pcs|nos|pieces|qty|price|rate|mrp|rs|inr|item|no|code|size|white|black|chrome)\\b", "")
                .replaceAll("[^a-zA-Z0-9\\s]", " ")
                .trim()
                .replaceAll("\\s{2,}", " ");
    }

    private boolean isNoiseLine(String line) {
        String l = line.toLowerCase();
        return l.contains("page ") || l.contains("total") || l.contains("subtotal")
                || l.contains("date:") || l.contains("terms & conditions") || l.contains("authorized signatory");
    }
}
