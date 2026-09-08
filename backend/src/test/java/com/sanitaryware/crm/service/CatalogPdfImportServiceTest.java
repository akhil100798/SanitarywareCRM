package com.sanitaryware.crm.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CatalogPdfImportServiceTest {

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
}
