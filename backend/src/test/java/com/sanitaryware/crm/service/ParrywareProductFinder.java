package com.sanitaryware.crm.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.io.File;

public class ParrywareProductFinder {

    @Test
    void findProducts() throws Exception {
        File file = new File("/app/uploads/parryware.pdf");
        try (PDDocument doc = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            for (int p = 15; p <= 45; p += 5) {
                stripper.setStartPage(p);
                stripper.setEndPage(p);
                String text = stripper.getText(doc);
                PDPage page = doc.getPage(p - 1);
                PDResources res = page.getResources();
                int imgCount = 0;
                StringBuilder imgInfo = new StringBuilder();
                if (res != null) {
                    for (var name : res.getXObjectNames()) {
                        var xobj = res.getXObject(name);
                        if (xobj instanceof PDImageXObject img) {
                            imgCount++;
                            imgInfo.append("[").append(img.getWidth()).append("x").append(img.getHeight()).append(" ").append(img.getSuffix()).append("] ");
                        }
                    }
                }
                System.out.println("\n=== PARRYWARE PAGE " + p + " (Images: " + imgCount + " -> " + imgInfo + ") ===");
                String[] lines = text.split("\r?\n");
                for (int i = 0; i < Math.min(lines.length, 15); i++) {
                    System.out.println("  " + lines[i]);
                }
            }
        }
    }
}
