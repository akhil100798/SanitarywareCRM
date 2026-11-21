package com.sanitaryware.crm.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.junit.jupiter.api.Test;

import java.io.File;

public class PdfCatalogInspector {

    @Test
    void inspectParrywareImages() throws Exception {
        File file = new File("/app/uploads/Parryware Aug 26 Pricelist Searchable.pdf");
        if (!file.exists()) {
            file = new File("C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products\\Parryware Aug 26 Pricelist Searchable.pdf");
        }
        try (PDDocument doc = Loader.loadPDF(file)) {
            org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
            stripper.setSortByPosition(true);
            int[] testPages = {41, 79, 102};
            for (int p : testPages) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                System.out.println("\n================ PAGE " + p + " ================");
                System.out.println(stripper.getText(doc));
            }
        }
    }
}
