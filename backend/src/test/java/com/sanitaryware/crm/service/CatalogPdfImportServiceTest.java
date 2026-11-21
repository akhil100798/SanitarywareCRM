package com.sanitaryware.crm.service;

import com.sanitaryware.crm.repository.CategoryRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class CatalogPdfImportServiceTest {

    @Test
    void dumpPage9() throws Exception {
        java.io.File file = new java.io.File("/app/uploads/brand-catalogs/59/5fd0b788-cd1d-41d2-a49e-9b759ac2c5ed.pdf");
        if (!file.exists()) {
            System.out.println("FILE DOES NOT EXIST");
            return;
        }
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(file)) {
            org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
            stripper.setStartPage(9);
            stripper.setEndPage(9);
            stripper.setSortByPosition(true);
            System.out.println("=== RAW TEXT OF PAGE 9 ===");
            System.out.println(stripper.getText(doc));
            System.out.println("=== END RAW TEXT ===");
        }
    }

    @Test
    void genericCatalogParser_ParsesLeadingSkuAndCurrencyPrice() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                204,
                                "T9830A1 1\" Extension Nipple (Available in Pack of 18 Pieces) t2,500")));

        assertEquals(1, result.rows().size());
        CatalogPdfImportService.CatalogRow row = result.rows().get(0);
        assertEquals("T9830A1", row.sku());
        assertEquals("1\" Extension Nipple (Available in Pack of 18 Pieces)", row.name());
        assertEquals(new BigDecimal("2500"), row.mrp());
        assertEquals(204, row.sourcePage());
    }

    @Test
    void genericCatalogParser_ParsesLeadingSkuAndRupeePrice() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                100, "E8306 Solid Plus Regular Seat Cover ₹6,650")));

        assertEquals(1, result.rows().size());
        assertEquals("E8306", result.rows().get(0).sku());
        assertEquals(new BigDecimal("6650"), result.rows().get(0).mrp());
    }

    @Test
    void genericCatalogParser_ExtractsOnlyExplicitlyLabeledProductDetails() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(12,
                                "E8306 Seat Cover HSN Code:691010 Material:Ceramic "
                                        + "Material Code:MC12 Item Code:IT12 t6,650")));

        assertEquals(1, result.rows().size());
        CatalogPdfImportService.CatalogRow row = result.rows().get(0);
        assertEquals("Seat Cover", row.name());
        assertEquals("691010", row.hsnCode());
        assertEquals("Ceramic", row.material());
        assertEquals("MC12", row.materialCode());
        assertEquals("IT12", row.itemCode());
    }

    @Test
    void genericCatalogParser_RejectsConflictingDuplicateMetadata() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(12,
                                "E8306 Seat Cover Material:Ceramic t6,650"),
                        new CatalogPdfImportService.CatalogPageLine(13,
                                "E8306 Seat Cover Material:Plastic t6,650")));

        assertTrue(result.rows().isEmpty());
        assertTrue(result.warnings().get(0).contains("pages 12 and 13"));
    }

    @Test
    void genericCatalogParser_ParsesNameFirstSkuAndInternationalCurrencyMarker() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                42, "Ceramic Basin Model E8306 INR 6,650")));

        assertEquals(1, result.rows().size());
        assertEquals("Ceramic Basin Model", result.rows().get(0).name());
        assertEquals("E8306", result.rows().get(0).sku());
        assertEquals(new BigDecimal("6650"), result.rows().get(0).mrp());
    }

    @Test
    void genericCatalogParser_RejectsUnmarkedTrailingNumberAsPrice() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                70, "Pluto Kitchen Sink Mixer T9895A 1")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.skippedRows());
        assertTrue(result.warnings().get(0).contains("Page 70"));
    }

    @Test
    void genericCatalogParser_RejectsCurrencyAmountMisreadAsProductName() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                100, "T1,850 G5734A1 Wall Mixer t2,350")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.skippedRows());
        assertTrue(result.warnings().get(0).contains("Page 100"));
    }

    @Test
    void genericCatalogParser_RejectsMalformedPricesWithPageDiagnostic() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                162, "G571XA1 Wall Mixer t5,1x0")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.warnings().size());
        assertTrue(result.warnings().get(0).contains("Page 162"));
        assertTrue(result.warnings().get(0).contains("G571XA1 Wall Mixer t5,1x0"));
    }

    @Test
    void genericCatalogParser_DoesNotPairFieldsSplitAcrossLines() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(100, "C0293 Closet (S-230)"),
                        new CatalogPdfImportService.CatalogPageLine(100, "t6,700")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.warnings().size());
        assertTrue(result.warnings().get(0).contains("Page 100"));
    }

    @Test
    void genericCatalogParser_RejectsSplitSkuAndMultiplePriceCandidates() {
        CatalogPdfImportService.CatalogParseResult splitSku =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                204, "T9831 A 1 1.5\" Extension Nipple '(2,000")));
        CatalogPdfImportService.CatalogParseResult multiplePrices =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                162, "G571XA1 Wall Mixer t5,100 t3,100")));

        assertTrue(splitSku.rows().isEmpty());
        assertTrue(multiplePrices.rows().isEmpty());
        assertEquals(1, splitSku.warnings().size());
        assertEquals(1, multiplePrices.warnings().size());
    }

    @Test
    void positionedParser_SeparatesTwoProductsAndPricesInDistinctColumns() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                100, 109, 168, 232, "C0293 Closet (S-230)"),
                        new CatalogPdfImportService.PositionedTextLine(
                                100, 109, 432, 474, "C022X Closet"),
                        new CatalogPdfImportService.PositionedTextLine(
                                100, 127, 204, 233, "t6,700"),
                        new CatalogPdfImportService.PositionedTextLine(
                                100, 127, 441, 470, "t2,500")));

        assertEquals(2, result.rows().size(), result.warnings().toString());
        assertEquals("C0293", result.rows().get(0).sku());
        assertEquals("Closet (S-230)", result.rows().get(0).name());
        assertEquals(new BigDecimal("6700"), result.rows().get(0).mrp());
        assertEquals("C022X", result.rows().get(1).sku());
        assertEquals(new BigDecimal("2500"), result.rows().get(1).mrp());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void positionedParser_AssociatesPlainDecimalPricesOnlyUnderRepeatedMrpHeadings() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 100, 100, 200, "APCS2 - Straight"),
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 115, 245, 270, "MRP"),
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 132, 250, 280, "392.00"),
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 180, 100, 220, "APC02 - 1.8 cm Offset"),
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 195, 245, 270, "MRP"),
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 212, 250, 280, "448.00")));

        assertEquals(2, result.rows().size(), result.warnings().toString());
        assertEquals("APCS2", result.rows().get(0).sku());
        assertEquals(new BigDecimal("392.00"), result.rows().get(0).mrp());
        assertEquals("APC02", result.rows().get(1).sku());
        assertEquals(new BigDecimal("448.00"), result.rows().get(1).mrp());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void positionedParser_UsesRupeedGlyphArtifactOnlyBesideOneProductRow() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                48, 100, 60, 130, "T3345C Altis Kitchen Mixer"),
                        new CatalogPdfImportService.PositionedTextLine(
                                48, 100, 134, 160, "I 9,570"),
                        new CatalogPdfImportService.PositionedTextLine(
                                48, 160, 400, 440, "I 8,250")));

        assertEquals(1, result.rows().size(), result.warnings().toString());
        assertEquals("T3345C", result.rows().get(0).sku());
        assertEquals(new BigDecimal("9570"), result.rows().get(0).mrp());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void positionedParser_UsesCoordinatesToKeepAdjacentColumnsSeparate() throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(50, 700);
                content.showText("APCS2 - Straight");
                content.newLineAtOffset(90, -15);
                content.showText("MRP");
                content.newLineAtOffset(0, -17);
                content.showText("392.00");
                content.endText();
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(350, 700);
                content.showText("C022X Closet");
                content.newLineAtOffset(80, -15);
                content.showText("MRP");
                content.newLineAtOffset(0, -17);
                content.showText("2,500.00");
                content.endText();
            }

            CatalogPdfImportService service = new CatalogPdfImportService(
                    mock(ProductRepository.class), mock(CategoryRepository.class));
            CatalogPdfImportService.CatalogParseResult result =
                    service.parseGenericCatalogRows(document);

            assertEquals(2, result.rows().size(), result.warnings().toString());
            assertEquals("APCS2", result.rows().get(0).sku());
            assertEquals(new BigDecimal("392.00"), result.rows().get(0).mrp());
            assertEquals("C022X", result.rows().get(1).sku());
            assertEquals(new BigDecimal("2500.00"), result.rows().get(1).mrp());
            assertTrue(result.warnings().isEmpty());
        }
    }

    @Test
    void positionedParser_ReconstructsSplitSkuAndCurrencyArtifact() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 128, 220, 395,
                                "T9831 A 1 1.5 inch Extension Nipple"),
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 128, 444, 472, "'(2,000")));

        assertEquals(1, result.rows().size(), result.warnings().toString());
        assertEquals("T9831A1", result.rows().get(0).sku());
        assertEquals("1.5 inch Extension Nipple", result.rows().get(0).name());
        assertEquals(new BigDecimal("2000"), result.rows().get(0).mrp());
        assertEquals(204, result.rows().get(0).sourcePage());
    }

    @Test
    void positionedParser_AppendsAlignedWrappedNameAndRejectsBadOrMissingPrices() {
        CatalogPdfImportService.CatalogParseResult wrapped =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 128, 220, 395, "T9830A1 Extension"),
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 136, 205, 360, "Nipple 1.5 inch"),
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 136, 444, 472, "t2,500")));
        CatalogPdfImportService.CatalogParseResult malformed =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                162, 100, 100, 310, "G571XA1 Wall Mixer t5,1x0")));
        CatalogPdfImportService.CatalogParseResult missing =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                16, 100, 100, 310, "T9830A1 Extension Nipple")));
        CatalogPdfImportService.CatalogParseResult multiplePrices =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                162, 100, 100, 380, "G571XA1 Wall Mixer t5,100 t5,1x0")));

        assertEquals(1, wrapped.rows().size(), wrapped.warnings().toString());
        assertEquals("Extension Nipple 1.5 inch", wrapped.rows().get(0).name());
        assertEquals(new BigDecimal("2500"), wrapped.rows().get(0).mrp());
        assertTrue(malformed.rows().isEmpty());
        assertTrue(malformed.warnings().get(0).contains("malformed"));
        assertTrue(missing.rows().isEmpty());
        assertTrue(missing.warnings().get(0).contains("no unambiguous price"));
        assertTrue(multiplePrices.rows().isEmpty());
        assertTrue(multiplePrices.warnings().get(0).contains("multiple price candidates"));
    }

    @Test
    void positionedParser_DoesNotPromoteMarketingSkuLikeTextAndHandlesDuplicateConflicts() {
        CatalogPdfImportService.CatalogParseResult falseCandidate =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                9, 100, 100, 310, "lcons2026 Sales Campaign")));
        CatalogPdfImportService.CatalogParseResult duplicates =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 100, 100, 260, "T9830A1 Extension Nipple t2,500"),
                        new CatalogPdfImportService.PositionedTextLine(
                                205, 100, 100, 260, "T9830A1 Extension Nipple t2,500")));
        CatalogPdfImportService.CatalogParseResult conflicts =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                204, 100, 100, 260, "T9830A1 Extension Nipple t2,500"),
                        new CatalogPdfImportService.PositionedTextLine(
                                205, 100, 100, 260, "T9830A1 Extension Nipple t2,700")));

        assertTrue(falseCandidate.rows().isEmpty());
        assertEquals(1, duplicates.rows().size(), duplicates.warnings().toString());
        assertEquals(204, duplicates.rows().get(0).sourcePage());
        assertTrue(conflicts.rows().isEmpty());
        assertTrue(conflicts.warnings().get(0).contains("pages 204 and 205"));
        assertTrue(conflicts.warnings().get(0).contains("2500 vs"));
        assertTrue(conflicts.warnings().get(0).contains("2700"));
        assertEquals(conflicts.warnings().size(), conflicts.skippedRows());
    }

    @Test
    void positionedParser_RejectsOAndZeroIdentifierAlternativesWithoutCorrection() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(
                                37, 100, 100, 260, "APC02 Offset Connector t448.00"),
                        new CatalogPdfImportService.PositionedTextLine(
                                38, 100, 100, 260, "APCO2 Offset Connector t448.00")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.skippedRows());
        assertEquals(1, result.warnings().size());
        assertTrue(result.warnings().get(0).contains("O vs digit 0"));
        assertTrue(result.warnings().get(0).contains("APC02 on page 37"));
        assertTrue(result.warnings().get(0).contains("APCO2 on page 38"));
    }

    @Test
    void positionedParser_IgnoresStandardsAndExplanatoryTextButKeepsUnpricedProductsBlocked() {
        CatalogPdfImportService.CatalogParseResult result =
                CatalogPdfImportService.CatalogLineParser.parsePositioned(List.of(
                        new CatalogPdfImportService.PositionedTextLine(2, 100, 30, 430,
                                "CPVC Pipes are in SDR11 & SDR13.5, Fittings are in SDR11"),
                        new CatalogPdfImportService.PositionedTextLine(19, 100, 30, 430,
                                "*T&C Apply, For more details please visit www.ashirvad.com. "
                                        + "Claim applicable to select viruses excluding COVID-19. "
                                        + "Feature will vary by model."),
                        new CatalogPdfImportService.PositionedTextLine(24, 100, 30, 110, "IS13592"),
                        new CatalogPdfImportService.PositionedTextLine(24, 110, 30, 110, "IS14735"),
                        new CatalogPdfImportService.PositionedTextLine(37, 100, 30, 100, "APCS2"),
                        new CatalogPdfImportService.PositionedTextLine(37, 110, 30, 220,
                                "The straight connector (APCS2) is used when the spigot"),
                        new CatalogPdfImportService.PositionedTextLine(37, 130, 30, 210,
                                "315, 3-110, L-90°"),
                        new CatalogPdfImportService.PositionedTextLine(37, 150, 30, 160,
                                "APCS2 - Straight")));

        assertTrue(result.rows().isEmpty());
        assertEquals(1, result.warnings().size(), result.warnings().toString());
        assertTrue(result.warnings().get(0).contains("APCS2 - Straight"));
        assertTrue(result.warnings().get(0).contains("no unambiguous price"));
    }

    @Test
    void genericCatalogParser_CollapsesExactDuplicatesAndRejectsConflicts() {
        CatalogPdfImportService.CatalogParseResult duplicates =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                204, "T9830A1 Extension Nipple t2,500"),
                        new CatalogPdfImportService.CatalogPageLine(
                                205, "T9830A1 Extension Nipple t2,500")));

        assertEquals(1, duplicates.rows().size());
        assertEquals(204, duplicates.rows().get(0).sourcePage());

        CatalogPdfImportService.CatalogParseResult conflicts =
                CatalogPdfImportService.CatalogLineParser.parse(List.of(
                        new CatalogPdfImportService.CatalogPageLine(
                                204, "T9830A1 Extension Nipple t2,500"),
                        new CatalogPdfImportService.CatalogPageLine(
                                205, "T9830A1 Extension Nipple t2,700")));

        assertTrue(conflicts.rows().isEmpty());
        assertEquals(1, conflicts.skippedRows());
        assertTrue(conflicts.warnings().get(0).contains("pages 204 and 205"));
        assertTrue(conflicts.warnings().get(0).contains("2500 vs \"Extension Nipple\" at 2700"));
    }

    @Test
    void importCatalog_RejectsPdfWithoutSupportedProductRows() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            pdf = output.toByteArray();
        }

        CatalogPdfImportService service = new CatalogPdfImportService(
                mock(ProductRepository.class),
                mock(CategoryRepository.class));
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.importCatalog(brand, file, reviewToken(pdf, brand.getId())));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("No supported product rows"));
    }

    @Test
    void importCatalog_DoesNotWriteAnyProductsWhenCandidateRowsAreAmbiguous() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(40, 740);
                content.showText("E8306 Solid Plus Seat Cover t6,650");
                content.newLineAtOffset(0, -20);
                content.showText("T9830A1 Broken Product t5,1x0");
                content.endText();
            }
            document.save(output);
            pdf = output.toByteArray();
        }

        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "ambiguous.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.importCatalog(brand, file, reviewToken(pdf, brand.getId())));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, exception.getStatusCode());
        assertTrue(exception.getReason().contains("stopped before saving products"));
        assertTrue(exception.getReason().contains("Page 1"));
        verifyNoInteractions(products, categories);
    }

    @Test
    void previewCatalog_IsReadOnlyAndListsProposedCreate() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(40, 740);
                content.showText("E8306 Solid Plus Seat Cover t6,650");
                content.endText();
            }
            document.save(output);
            pdf = output.toByteArray();
        }

        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "catalog.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        var preview = service.previewCatalog(brand, file);

        assertEquals(1, preview.createCount());
        assertEquals(0, preview.updateCount());
        assertTrue(preview.importAllowed());
        assertEquals("E8306", preview.items().get(0).sku());
        assertEquals(new BigDecimal("6650"), preview.items().get(0).proposedMrp());
        assertEquals(1, preview.items().get(0).sourcePage());
        assertNull(preview.items().get(0).material());
        assertNull(preview.items().get(0).materialCode());
        assertNull(preview.items().get(0).itemCode());
        assertTrue(preview.items().get(0).isAvailable());
        verify(products).findBySkuIn(List.of("E8306"));
        verify(products, never()).save(org.mockito.ArgumentMatchers.any());
        verify(categories, never()).save(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(categories);
    }

    @Test
    void importCatalog_RequiresReviewedFileHashBeforeAnyWrites() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            pdf = output.toByteArray();
        }
        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", pdf);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> service.importCatalog(brand(), file, null));

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, exception.getStatusCode());
        verifyNoInteractions(products, categories);
    }

    @Test
    void importCatalog_RejectsUnreviewedSkuSelectionBeforeWrites() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(40, 740);
                content.showText("E8306 Solid Plus Seat Cover t6,650");
                content.endText();
            }
            document.save(output);
            pdf = output.toByteArray();
        }
        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "catalog.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.importCatalog(brand, file, reviewToken(pdf, brand.getId()),
                        List.of("UNREVIEWED-SKU"), java.util.Set.of()));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verifyNoInteractions(products, categories);
    }

    @Test
    void importCatalog_RejectsUnavailableSkuNotSelectedForImportBeforeWrites() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(40, 740);
                content.showText("E8306 Solid Plus Seat Cover t6,650");
                content.endText();
            }
            document.save(output);
            pdf = output.toByteArray();
        }
        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "catalog.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.importCatalog(brand, file, reviewToken(pdf, brand.getId()),
                        List.of("E8306"), java.util.Set.of("UNREVIEWED-SKU")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(products, categories);
    }

    @Test
    void importCatalog_RejectsFileThatDiffersFromReviewedPreviewWithoutWrites() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            pdf = output.toByteArray();
        }
        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand brand = brand();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.importCatalog(brand, file, "0".repeat(64)));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertTrue(exception.getReason().contains("changed after preview"));
        verifyNoInteractions(products, categories);
    }

    @Test
    void importCatalog_RejectsReviewTokenForDifferentBrandWithoutWrites() throws IOException {
        byte[] pdf;
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                content.newLineAtOffset(40, 740);
                content.showText("E8306 Solid Plus Seat Cover t6,650");
                content.endText();
            }
            document.save(output);
            pdf = output.toByteArray();
        }

        ProductRepository products = mock(ProductRepository.class);
        CategoryRepository categories = mock(CategoryRepository.class);
        CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
        MockMultipartFile file = new MockMultipartFile("file", "catalog.pdf", "application/pdf", pdf);
        com.sanitaryware.crm.entity.Brand reviewedBrand = brand();
        com.sanitaryware.crm.entity.Brand differentBrand = brand();
        differentBrand.setId(3L);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.importCatalog(differentBrand, file,
                        reviewToken(pdf, reviewedBrand.getId())));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertTrue(exception.getReason().contains("changed after preview"));
        verifyNoInteractions(products, categories);
    }

    private com.sanitaryware.crm.entity.Brand brand() {
        com.sanitaryware.crm.entity.Brand brand = new com.sanitaryware.crm.entity.Brand();
        brand.setId(2L);
        brand.setName("parryware");
        return brand;
    }

    private String reviewToken(byte[] value, Long brandId) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            digest.update(("brand:" + brandId + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            return java.util.HexFormat.of().formatHex(digest.digest(value));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithStdPkgAndDashBoxQty() {
        // "1.5 ½ 50 -" -> Size (cm) 1.5, Size (inch) ½, Std Pkg 50, Box Qty -
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("1.5 ½ 50 -");
        assertEquals("½\" (1.5 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithFraction() {
        // "2 ¾ 50 -" -> Size (cm) 2, Size (inch) ¾, Std Pkg 50, Box Qty -
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("2 ¾ 50 -");
        assertEquals("¾\" (2 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithWholeInch() {
        // "2.5 1 25 -" -> Size (cm) 2.5, Size (inch) 1, Std Pkg 25, Box Qty -
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("2.5 1 25 -");
        assertEquals("1\" (2.5 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithMixedFraction() {
        // "3.2 1¼ 15 -" -> Size (cm) 3.2, Size (inch) 1¼, Std Pkg 15, Box Qty -
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("3.2 1¼ 15 -");
        assertEquals("1¼\" (3.2 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithIntegerInchAndPkg() {
        // "5 2 10 -" -> Size (cm) 5, Size (inch) 2, Std Pkg 10, Box Qty -
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("5 2 10 -");
        assertEquals("2\" (5 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_SingleDimensionWithNumericBoxQty() {
        // "1.5 ½ 100 1400" -> Size (cm) 1.5, Size (inch) ½, Std Pkg 100, Box Qty 1400
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("1.5 ½ 100 1400");
        assertEquals("½\" (1.5 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_ReducerCompoundDimension() {
        // "2.0 x 1.5 ¾ x ½ 100 700"
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("2.0 x 1.5 ¾ x ½ 100 700");
        assertEquals("¾ x ½\" (2.0 x 1.5 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_ReducerWithMixedFractionInch() {
        // "4.0 x 3.2 1½ x 1¼ 10 100"
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("4.0 x 3.2 1½ x 1¼ 10 100");
        assertEquals("1½ x 1¼\" (4.0 x 3.2 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_ReducerWithIntegerInch() {
        // "5.0 x 4.0 2 x 1½ 5 80"
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("5.0 x 4.0 2 x 1½ 5 80");
        assertEquals("2 x 1½\" (5.0 x 4.0 cm)", result);
    }

    @Test
    void extractSizeIgnoreQuantity_NullAndEmptyHandledGracefully() {
        assertNull(CatalogPdfImportService.extractSizeIgnoreQuantity(null));
        assertNull(CatalogPdfImportService.extractSizeIgnoreQuantity("   "));
    }

    @Test
    void extractSizeIgnoreQuantity_SizeWithoutQuantities() {
        String result = CatalogPdfImportService.extractSizeIgnoreQuantity("1.5 ½");
        assertEquals("½\" (1.5 cm)", result);
    }

    @Test
    void testParrywareCatalog() {
        java.io.File file = new java.io.File("target/parryware.pdf");
        if (!file.exists()) return;
        try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(file)) {
            System.out.println("PARRYWARE PAGES: " + document.getNumberOfPages());
            ProductRepository products = mock(ProductRepository.class);
            CategoryRepository categories = mock(CategoryRepository.class);
            CatalogPdfImportService service = new CatalogPdfImportService(products, categories);
            var result = service.parseGenericCatalogRows(document);
            System.out.println("PARRYWARE ROWS: " + result.rows().size());
            System.out.println("PARRYWARE SKIPPED: " + result.skippedRows());
        } catch (Throwable t) {
            System.err.println("PARRYWARE FAILED WITH: " + t.getClass().getName() + " -> " + t.getMessage());
            t.printStackTrace();
            org.junit.jupiter.api.Assertions.fail(t.getMessage());
        }
    }
}
