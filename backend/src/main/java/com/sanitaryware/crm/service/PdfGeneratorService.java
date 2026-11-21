package com.sanitaryware.crm.service;

import com.itextpdf.barcodes.BarcodeQRCode;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.xobject.PdfFormXObject;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.SystemSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class PdfGeneratorService {

    @Autowired
    private SystemSettingsRepository systemSettingsRepository;

    @Value("${app.portal.base-url:http://localhost:5173}")
    private String portalBaseUrl;

    // Professional Brand Colors
    private static final DeviceRgb COLOR_PRIMARY = new DeviceRgb(15, 23, 42);      // Slate 900
    private static final DeviceRgb COLOR_ACCENT = new DeviceRgb(37, 99, 235);      // Royal Blue 600
    private static final DeviceRgb COLOR_MUTED = new DeviceRgb(100, 116, 139);     // Slate 500
    private static final DeviceRgb COLOR_BG_LIGHT = new DeviceRgb(248, 250, 252);  // Slate 50
    private static final DeviceRgb COLOR_BG_HEADER = new DeviceRgb(30, 41, 59);   // Slate 800
    private static final DeviceRgb COLOR_BORDER = new DeviceRgb(226, 232, 240);    // Slate 200

    private static final java.text.NumberFormat INDIAN_CURRENCY_FORMAT = java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("en", "IN"));

    public static String formatIndianCurrency(BigDecimal amount) {
        if (amount == null) return "Rs. 0.00";
        try {
            return "Rs. " + String.format(java.util.Locale.US, "%,.2f", amount.setScale(2, RoundingMode.HALF_UP));
        } catch (Exception e) {
            return "Rs. " + amount.setScale(2, RoundingMode.HALF_UP).toString();
        }
    }

    public byte[] generateQuotationPdf(Quotation quotation) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);
        doc.setMargins(28, 28, 28, 28);
        
        SystemSettings settings = systemSettingsRepository.findAll().stream().findFirst().orElse(null);
        String compName = settings != null && settings.getCompanyName() != null ? settings.getCompanyName() : "Sanitaryware Store CRM";
        String compAddr = settings != null && settings.getAddress() != null ? settings.getAddress() : "Main Warehouse Hub";
        String compCityState = (settings != null && settings.getCity() != null ? settings.getCity() : "") +
                (settings != null && settings.getState() != null ? ", " + settings.getState() : "") +
                (settings != null && settings.getPincode() != null ? " - " + settings.getPincode() : "");
        String compPhone = settings != null && settings.getPhone() != null ? settings.getPhone() : "+91-98765-43210";
        String compEmail = settings != null && settings.getEmail() != null ? settings.getEmail() : "billing@sanitaryware.com";
        String compGst = settings != null && settings.getGstNumber() != null ? settings.getGstNumber() : "29ABCDE1234F1Z5";
        String compWeb = settings != null && settings.getWebsite() != null ? settings.getWebsite() : "www.sanitarywarecrm.com";

        // Determine share token & portal verification URL
        String shareToken = quotation.getShareToken();
        if (shareToken == null || shareToken.isBlank()) {
            shareToken = UUID.randomUUID().toString();
        }
        String cleanBaseUrl = (portalBaseUrl != null ? portalBaseUrl : "http://localhost:5173").replaceAll("/+$", "");
        String verificationUrl = cleanBaseUrl + "/portal/quotations/" + shareToken;

        // 1. HEADER SECTION
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        
        // Left Header: Brand details
        Cell brandCell = new Cell().setBorder(Border.NO_BORDER);
        brandCell.add(new Paragraph(compName.toUpperCase()).setBold().setFontSize(16).setFontColor(COLOR_PRIMARY));
        brandCell.add(new Paragraph("PREMIUM SANITARYWARE & BATH DESIGN SOLUTIONS").setFontSize(7).setBold().setFontColor(COLOR_ACCENT));
        String fullAddress = compAddr + (!compCityState.isBlank() ? "\n" + compCityState : "") +
                "\nPhone: " + compPhone + " | Email: " + compEmail +
                "\nGSTIN: " + compGst + " | Web: " + compWeb;
        brandCell.add(new Paragraph(fullAddress).setFontSize(8).setFontColor(COLOR_MUTED).setMarginTop(3));
        headerTable.addCell(brandCell);
        
        // Right Header: Quotation Details
        Cell quoteMetaCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        quoteMetaCell.add(new Paragraph("QUOTATION").setBold().setFontSize(22).setFontColor(COLOR_PRIMARY));
        
        Table metaGrid = new Table(UnitValue.createPercentArray(new float[]{45, 55})).setWidth(UnitValue.createPercentValue(100));
        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Quote No:").setBold().setFontSize(8).setFontColor(COLOR_MUTED)));
        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph(quotation.getQuotationNumber()).setBold().setFontSize(9).setFontColor(COLOR_PRIMARY)));

        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Date:").setFontSize(8).setFontColor(COLOR_MUTED)));
        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph(quotation.getQuotationDate() != null ? quotation.getQuotationDate().toString() : "").setFontSize(8).setFontColor(COLOR_PRIMARY)));

        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Valid Until:").setFontSize(8).setFontColor(COLOR_MUTED)));
        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph(quotation.getValidUntil() != null ? quotation.getValidUntil().toString() : "").setFontSize(8).setFontColor(COLOR_PRIMARY)));

        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Status:").setFontSize(8).setFontColor(COLOR_MUTED)));
        metaGrid.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph(quotation.getStatus() != null ? quotation.getStatus().name() : "DRAFT")
                        .setBold().setFontSize(8).setFontColor(COLOR_ACCENT)));

        quoteMetaCell.add(metaGrid);
        headerTable.addCell(quoteMetaCell);
        
        doc.add(headerTable);
        doc.add(new Paragraph("").setMarginBottom(10));

        // 2. CUSTOMER / BILL TO & SHIP TO SECTION
        Customer customer = quotation.getCustomer();
        Table billTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        
        // Customer Bill-To Box
        Cell billToCell = new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.75f))
                .setBackgroundColor(COLOR_BG_LIGHT)
                .setPadding(8);
        billToCell.add(new Paragraph("CUSTOMER / BILL TO:").setBold().setFontSize(8).setFontColor(COLOR_ACCENT));
        if (customer != null) {
            billToCell.add(new Paragraph(customer.getName()).setBold().setFontSize(10).setFontColor(COLOR_PRIMARY));
            if (customer.getCompany() != null && !customer.getCompany().isBlank()) {
                billToCell.add(new Paragraph(customer.getCompany()).setFontSize(8).setFontColor(COLOR_MUTED));
            }
            String custAddr = (customer.getBillingAddress() != null ? customer.getBillingAddress() + "\n" : "") +
                    (customer.getCity() != null ? customer.getCity() : "") +
                    (customer.getState() != null ? ", " + customer.getState() : "") +
                    (customer.getPincode() != null ? " - " + customer.getPincode() : "");
            billToCell.add(new Paragraph(custAddr).setFontSize(8).setFontColor(COLOR_PRIMARY));
            billToCell.add(new Paragraph("Phone: " + (customer.getPhoneNumber() != null ? customer.getPhoneNumber() : "N/A") +
                    " | Email: " + (customer.getEmail() != null ? customer.getEmail() : "N/A")).setFontSize(8).setFontColor(COLOR_MUTED));
        } else {
            billToCell.add(new Paragraph("Walk-in Customer").setFontSize(9).setFontColor(COLOR_PRIMARY));
        }
        billTable.addCell(billToCell);

        // Verification & Quick Action Header Box
        Cell portalBox = new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.75f))
                .setBackgroundColor(COLOR_BG_LIGHT)
                .setPadding(8);
        portalBox.add(new Paragraph("DIGITAL VERIFICATION & ACCEPTANCE").setBold().setFontSize(8).setFontColor(COLOR_ACCENT));
        portalBox.add(new Paragraph("This quotation is digitally signed and registered on the Sanitaryware CRM Portal.\n" +
                "Scan the dynamic QR code below or visit the link to confirm acceptance or order online.")
                .setFontSize(7.5f).setFontColor(COLOR_MUTED).setMarginTop(3));
        portalBox.add(new Paragraph("Portal Link: " + verificationUrl)
                .setFontSize(7).setBold().setFontColor(COLOR_PRIMARY).setMarginTop(4));
        billTable.addCell(portalBox);

        doc.add(billTable);
        doc.add(new Paragraph("").setMarginBottom(10));

        // 3. ITEMIZED PRODUCTS TABLE
        // Columns: [#, Description & SKU, HSN, Qty, Unit Price, Disc%, Total]
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{5, 45, 12, 8, 10, 8, 12})).useAllAvailableWidth();
        
        // Table Header
        String[] headers = new String[]{"#", "Product & Specifications", "HSN / Code", "Qty", "Rate (Rs)", "Disc", "Total (Rs)"};
        for (int i = 0; i < headers.length; i++) {
            Cell th = new Cell().setBackgroundColor(COLOR_BG_HEADER)
                    .setBorder(new SolidBorder(COLOR_BG_HEADER, 0.5f))
                    .setPadding(5);
            Paragraph p = new Paragraph(headers[i]).setBold().setFontSize(8).setFontColor(ColorConstants.WHITE);
            if (i >= 3) {
                p.setTextAlignment(TextAlignment.RIGHT);
            }
            th.add(p);
            itemsTable.addHeaderCell(th);
        }

        int itemIdx = 1;
        BigDecimal calculatedTaxable = BigDecimal.ZERO;
        if (quotation.getItems() != null) {
            for (QuotationItem item : quotation.getItems()) {
                DeviceRgb rowBg = (itemIdx % 2 == 0) ? COLOR_BG_LIGHT : new DeviceRgb(255, 255, 255);
                
                // Index
                itemsTable.addCell(new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5)
                        .add(new Paragraph(String.valueOf(itemIdx++)).setFontSize(8).setFontColor(COLOR_MUTED)));

                // Product Description & Specs
                Cell descCell = new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5);
                String prodName = item.getProduct() != null ? item.getProduct().getName() : "Item";
                String prodSku = item.getProduct() != null ? item.getProduct().getSku() : "";
                String brand = item.getProduct() != null && item.getProduct().getBrand() != null ? item.getProduct().getBrand().getName() : "";
                String color = item.getProduct() != null && item.getProduct().getColor() != null ? item.getProduct().getColor() : "";
                String material = item.getProduct() != null && item.getProduct().getMaterial() != null ? item.getProduct().getMaterial() : "";
                String size = item.getProduct() != null && item.getProduct().getSize() != null ? item.getProduct().getSize() : "";

                descCell.add(new Paragraph(prodName).setBold().setFontSize(8.5f).setFontColor(COLOR_PRIMARY));
                StringBuilder details = new StringBuilder();
                if (!prodSku.isBlank()) details.append("SKU: ").append(prodSku);
                if (!brand.isBlank()) details.append(" | Brand: ").append(brand);
                if (!color.isBlank()) details.append(" | Color: ").append(color);
                if (!material.isBlank()) details.append(" | Material: ").append(material);
                if (!size.isBlank()) details.append(" | Size: ").append(size);
                if (details.length() > 0) {
                    descCell.add(new Paragraph(details.toString()).setFontSize(7).setFontColor(COLOR_MUTED));
                }
                itemsTable.addCell(descCell);

                // HSN / Barcode
                Cell hsnCell = new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5);
                String hsn = item.getHsnCode() != null && !item.getHsnCode().isBlank() ? item.getHsnCode() : "69101000";
                hsnCell.add(new Paragraph(hsn).setFontSize(7.5f).setFontColor(COLOR_MUTED));
                if (item.getBarcode() != null && !item.getBarcode().isBlank()) {
                    hsnCell.add(new Paragraph("BC: " + item.getBarcode()).setFontSize(6.5f).setFontColor(COLOR_MUTED));
                }
                itemsTable.addCell(hsnCell);

                // Quantity
                itemsTable.addCell(new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .add(new Paragraph(String.valueOf(item.getQuantity())).setFontSize(8).setFontColor(COLOR_PRIMARY)));

                // Unit Price
                BigDecimal up = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                itemsTable.addCell(new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .add(new Paragraph(up.setScale(2, RoundingMode.HALF_UP).toString()).setFontSize(8).setFontColor(COLOR_PRIMARY)));

                // Discount %
                BigDecimal disc = item.getDiscountPercentage() != null ? item.getDiscountPercentage() : BigDecimal.ZERO;
                itemsTable.addCell(new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .add(new Paragraph(disc.compareTo(BigDecimal.ZERO) > 0 ? disc + "%" : "-").setFontSize(8).setFontColor(COLOR_MUTED)));

                // Line Total
                BigDecimal lt = item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO;
                calculatedTaxable = calculatedTaxable.add(lt);
                itemsTable.addCell(new Cell().setBackgroundColor(rowBg).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(5)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .add(new Paragraph(lt.setScale(2, RoundingMode.HALF_UP).toString()).setBold().setFontSize(8.5f).setFontColor(COLOR_PRIMARY)));
            }
        }
        doc.add(itemsTable);
        doc.add(new Paragraph("").setMarginBottom(10));

        // 4. BOTTOM SECTION: TAX BREAKDOWN, QR CODE VERIFICATION & FINANCIAL SUMMARY
        Table bottomTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        
        // --- Left Column: GST Breakdown + Bank Details + QR Code Verification ---
        Cell leftCol = new Cell().setBorder(Border.NO_BORDER).setPaddingRight(8);
        
        // GST Tax Breakdown Table
        BigDecimal taxRate = quotation.getTaxPercentage() != null ? quotation.getTaxPercentage() : BigDecimal.valueOf(18.0);
        BigDecimal halfRate = taxRate.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal totalTaxAmount = quotation.getTaxAmount() != null ? quotation.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal halfTaxAmount = totalTaxAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);

        String storeGst = settings != null && settings.getGstNumber() != null ? settings.getGstNumber().trim() : "";
        String storeState = settings != null && settings.getState() != null ? settings.getState().trim() : "";
        String storeStateCode = storeGst.length() >= 2 ? storeGst.substring(0, 2) : "";

        Customer cust = quotation.getCustomer();
        String custGst = cust != null && cust.getGstNumber() != null ? cust.getGstNumber().trim() : "";
        String custState = cust != null && cust.getState() != null ? cust.getState().trim() : "";
        String custStateCode = custGst.length() >= 2 ? custGst.substring(0, 2) : "";

        boolean isInterState = false;
        if (!storeStateCode.isEmpty() && !custStateCode.isEmpty()) {
            isInterState = !storeStateCode.equalsIgnoreCase(custStateCode);
        } else if (!storeState.isEmpty() && !custState.isEmpty()) {
            isInterState = !storeState.equalsIgnoreCase(custState);
        }

        Table gstTable = new Table(UnitValue.createPercentArray(new float[]{30, 20, 25, 25})).useAllAvailableWidth();
        gstTable.addHeaderCell(new Cell().setBackgroundColor(COLOR_BG_LIGHT).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3)
                .add(new Paragraph("Tax Type").setBold().setFontSize(7).setFontColor(COLOR_PRIMARY)));
        gstTable.addHeaderCell(new Cell().setBackgroundColor(COLOR_BG_LIGHT).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Rate").setBold().setFontSize(7).setFontColor(COLOR_PRIMARY)));
        gstTable.addHeaderCell(new Cell().setBackgroundColor(COLOR_BG_LIGHT).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Taxable Val").setBold().setFontSize(7).setFontColor(COLOR_PRIMARY)));
        gstTable.addHeaderCell(new Cell().setBackgroundColor(COLOR_BG_LIGHT).setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Tax Amount").setBold().setFontSize(7).setFontColor(COLOR_PRIMARY)));

        if (isInterState) {
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).add(new Paragraph("Integrated GST (IGST)").setFontSize(7).setFontColor(COLOR_MUTED)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph(taxRate + "%").setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + quotation.getSubtotal()).setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + totalTaxAmount).setFontSize(7).setFontColor(COLOR_PRIMARY)));
        } else {
            // CGST
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).add(new Paragraph("Central GST (CGST)").setFontSize(7).setFontColor(COLOR_MUTED)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph(halfRate + "%").setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + quotation.getSubtotal()).setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + halfTaxAmount).setFontSize(7).setFontColor(COLOR_PRIMARY)));

            // SGST
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).add(new Paragraph("State GST (SGST)").setFontSize(7).setFontColor(COLOR_MUTED)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph(halfRate + "%").setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + quotation.getSubtotal()).setFontSize(7).setFontColor(COLOR_PRIMARY)));
            gstTable.addCell(new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.RIGHT).add(new Paragraph("Rs. " + halfTaxAmount).setFontSize(7).setFontColor(COLOR_PRIMARY)));
        }

        leftCol.add(new Paragraph("GST TAX DISTRIBUTION").setBold().setFontSize(7.5f).setFontColor(COLOR_ACCENT));
        leftCol.add(gstTable);
        leftCol.add(new Paragraph("").setMarginBottom(6));

        // Bank & Payment Information
        Table bankBox = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Cell bankCell = new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setBackgroundColor(COLOR_BG_LIGHT).setPadding(6);
        bankCell.add(new Paragraph("BANK & SETTLEMENT DETAILS").setBold().setFontSize(7.5f).setFontColor(COLOR_ACCENT));
        bankCell.add(new Paragraph("Account Name: " + compName + "\n" +
                "Bank: HDFC Bank Ltd | Account No: 50200088992211\n" +
                "IFSC: HDFC0001234 | Branch: Commercial City Hub\n" +
                "UPI ID: payments@sanitarywarecrm.com").setFontSize(7).setFontColor(COLOR_MUTED));
        bankBox.addCell(bankCell);
        leftCol.add(bankBox);
        leftCol.add(new Paragraph("").setMarginBottom(6));

        // Terms & Conditions
        String terms = quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().isBlank()
                ? org.springframework.web.util.HtmlUtils.htmlUnescape(quotation.getTermsAndConditions())
                : "1. Prices are valid for 7 days from the quote date.\n" +
                  "2. Delivery: 2-4 business days subject to stock availability.\n" +
                  "3. Breakages / damages must be reported upon physical receipt.";
        leftCol.add(new Paragraph("TERMS & CONDITIONS").setBold().setFontSize(7.5f).setFontColor(COLOR_ACCENT));
        for (String termLine : terms.split("\\r?\\n")) {
            if (!termLine.trim().isEmpty()) {
                leftCol.add(new Paragraph(termLine.trim()).setFontSize(6.5f).setFontColor(COLOR_MUTED).setMarginBottom(1.5f));
            }
        }

        bottomTable.addCell(leftCol);

        // --- Right Column: Financial Totals + Dynamic QR Code Verification Card ---
        Cell rightCol = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(8);
        
        // Amount Summary Table
        Table amountTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        
        amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(3)
                .add(new Paragraph("Taxable Subtotal:").setFontSize(8.5f).setFontColor(COLOR_MUTED)));
        amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(3)
                .add(new Paragraph("Rs. " + (quotation.getSubtotal() != null ? quotation.getSubtotal().setScale(2, RoundingMode.HALF_UP) : "0.00")).setFontSize(8.5f).setFontColor(COLOR_PRIMARY)));

        if (quotation.getDiscount() != null && quotation.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(3)
                    .add(new Paragraph("Special Discount (-):").setFontSize(8.5f).setFontColor(new DeviceRgb(220, 38, 38))));
            amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(3)
                    .add(new Paragraph("- Rs. " + quotation.getDiscount().setScale(2, RoundingMode.HALF_UP)).setFontSize(8.5f).setFontColor(new DeviceRgb(220, 38, 38))));
        }

        amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(3)
                .add(new Paragraph("GST (" + taxRate + "%):").setFontSize(8.5f).setFontColor(COLOR_MUTED)));
        amountTable.addCell(new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(3)
                .add(new Paragraph("Rs. " + (quotation.getTaxAmount() != null ? quotation.getTaxAmount().setScale(2, RoundingMode.HALF_UP) : "0.00")).setFontSize(8.5f).setFontColor(COLOR_PRIMARY)));

        // Grand Total Row with highlight
        Cell grandLabel = new Cell().setBorder(new SolidBorder(COLOR_ACCENT, 1f))
                .setBackgroundColor(COLOR_BG_HEADER)
                .setPadding(6)
                .add(new Paragraph("GRAND TOTAL:").setBold().setFontSize(10).setFontColor(ColorConstants.WHITE));
        Cell grandVal = new Cell().setBorder(new SolidBorder(COLOR_ACCENT, 1f))
                .setBackgroundColor(COLOR_BG_HEADER)
                .setTextAlignment(TextAlignment.RIGHT)
                .setPadding(6)
                .add(new Paragraph("Rs. " + (quotation.getTotal() != null ? quotation.getTotal().setScale(2, RoundingMode.HALF_UP) : "0.00"))
                        .setBold().setFontSize(11).setFontColor(ColorConstants.WHITE));
        amountTable.addCell(grandLabel);
        amountTable.addCell(grandVal);

        rightCol.add(amountTable);
        rightCol.add(new Paragraph("").setMarginBottom(10));

        // Dynamic QR Code Verification Card
        Table qrCard = new Table(UnitValue.createPercentArray(new float[]{35, 65})).useAllAvailableWidth();
        qrCard.setBorder(new SolidBorder(COLOR_ACCENT, 0.75f));
        qrCard.setBackgroundColor(COLOR_BG_LIGHT);

        try {
            BarcodeQRCode qrCode = new BarcodeQRCode(verificationUrl);
            PdfFormXObject qrXObject = qrCode.createFormXObject(new DeviceRgb(15, 23, 42), pdfDoc);
            Image qrImage = new Image(qrXObject).setWidth(68).setHeight(68).setHorizontalAlignment(HorizontalAlignment.CENTER);
            
            Cell qrImgCell = new Cell().setBorder(Border.NO_BORDER)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(6);
            qrImgCell.add(qrImage);
            qrCard.addCell(qrImgCell);

            Cell qrTextCell = new Cell().setBorder(Border.NO_BORDER)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .setPadding(6);
            qrTextCell.add(new Paragraph("SCAN TO VERIFY / ACCEPT").setBold().setFontSize(7.5f).setFontColor(COLOR_ACCENT));
            qrTextCell.add(new Paragraph("Scan with phone camera or WhatsApp to inspect authenticity or accept quote online.")
                    .setFontSize(6.5f).setFontColor(COLOR_MUTED).setMarginTop(2));
            qrTextCell.add(new Paragraph("1-Click Acceptance Portal").setFontSize(6.5f).setBold().setFontColor(COLOR_PRIMARY).setMarginTop(3));
            qrCard.addCell(qrTextCell);
        } catch (Exception e) {
            Cell fallback = new Cell(1, 2).setBorder(Border.NO_BORDER).setPadding(6);
            fallback.add(new Paragraph("Verification Link: " + verificationUrl).setFontSize(7).setFontColor(COLOR_MUTED));
            qrCard.addCell(fallback);
        }

        rightCol.add(qrCard);
        rightCol.add(new Paragraph("").setMarginBottom(12));

        // Authorized Signature Block
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Cell sigCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPaddingTop(15);
        sigCell.add(new Paragraph("For " + compName.toUpperCase()).setBold().setFontSize(8).setFontColor(COLOR_PRIMARY));
        sigCell.add(new Paragraph("\n\n___________________________________\nAuthorized Signatory").setFontSize(7.5f).setFontColor(COLOR_MUTED));
        sigTable.addCell(sigCell);
        rightCol.add(sigTable);

        bottomTable.addCell(rightCol);
        doc.add(bottomTable);

        doc.close();
        return baos.toByteArray();
    }

    public byte[] generateOrderInvoicePdf(Order order) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);
        
        SystemSettings settings = systemSettingsRepository.findAll().stream().findFirst().orElse(null);
        String compName = (settings != null && settings.getCompanyName() != null && !settings.getCompanyName().isBlank()) 
                ? settings.getCompanyName() : "Sanitaryware CRM Store";
        String compAddr = (settings != null && settings.getAddress() != null && !settings.getAddress().isBlank()) 
                ? settings.getAddress() : "123 CRM Commercial Hub, MG Road, Bengaluru, Karnataka 560001";
        String compPhone = (settings != null && settings.getPhone() != null && !settings.getPhone().isBlank()) 
                ? settings.getPhone() : "+91 80 2345 6789";
        String compEmail = (settings != null && settings.getEmail() != null && !settings.getEmail().isBlank()) 
                ? settings.getEmail() : "billing@sanitarywarecrm.com";
        String compGst = (settings != null && settings.getGstNumber() != null && !settings.getGstNumber().isBlank()) 
                ? settings.getGstNumber() : "29ABCDE1234F1Z5";

        Customer customer = order.getCustomer();
        String placeOfSupply = (customer != null && customer.getState() != null && !customer.getState().isBlank())
                ? customer.getState()
                : "Karnataka";

        // Header Table
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        headerTable.addCell(new Cell().add(new Paragraph(compName).setBold().setFontSize(18))
                .add(new Paragraph(compAddr + "\nPhone: " + compPhone + " | Email: " + compEmail + "\nGSTIN: " + compGst).setFontSize(9))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        String orderDateStr = order.getOrderDate() != null
                ? order.getOrderDate().toString()
                : (order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate().toString() : LocalDate.now().toString());

        headerTable.addCell(new Cell().add(new Paragraph("TAX INVOICE").setBold().setFontSize(20).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Invoice #: " + order.getOrderNumber()).setBold().setFontSize(10).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Date: " + orderDateStr).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Place of Supply: " + placeOfSupply).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Reverse Charge: No").setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Status: " + order.getStatus().name()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(headerTable);
        doc.add(new Paragraph("\n"));

        // Customer Info Table
        Table customerTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Cell customerCell = new Cell().setPadding(8);
        customerCell.add(new Paragraph("BILL TO:").setBold().setFontSize(10));
        if (customer != null) {
            customerCell.add(new Paragraph(customer.getName() != null ? customer.getName() : "Customer").setBold().setFontSize(11));
            
            StringBuilder addr = new StringBuilder();
            if (customer.getCompany() != null && !customer.getCompany().isBlank()) {
                addr.append(customer.getCompany()).append("\n");
            }
            if (customer.getBillingAddress() != null && !customer.getBillingAddress().isBlank()) {
                addr.append(customer.getBillingAddress()).append("\n");
            }
            StringBuilder cityStatePin = new StringBuilder();
            if (customer.getCity() != null && !customer.getCity().isBlank()) {
                cityStatePin.append(customer.getCity());
            }
            if (customer.getState() != null && !customer.getState().isBlank()) {
                if (cityStatePin.length() > 0) cityStatePin.append(", ");
                cityStatePin.append(customer.getState());
            }
            if (customer.getPincode() != null && !customer.getPincode().isBlank() && !customer.getPincode().equalsIgnoreCase("null")) {
                if (cityStatePin.length() > 0) cityStatePin.append(" - ");
                cityStatePin.append(customer.getPincode());
            }
            if (cityStatePin.length() > 0) {
                addr.append(cityStatePin).append("\n");
            }
            addr.append("Phone: ").append(customer.getPhoneNumber() != null ? customer.getPhoneNumber() : "N/A")
                .append(" | Email: ").append(customer.getEmail() != null ? customer.getEmail() : "N/A");
            customerCell.add(new Paragraph(addr.toString()).setFontSize(9));

            if (customer.getGstNumber() != null && !customer.getGstNumber().isBlank()) {
                customerCell.add(new Paragraph("GSTIN: " + customer.getGstNumber()).setFontSize(9));
            }
            customerCell.add(new Paragraph("Place of Supply: " + placeOfSupply).setFontSize(9));
        } else {
            customerCell.add(new Paragraph("Walk-in Customer\nPlace of Supply: " + placeOfSupply).setFontSize(9));
        }
        customerTable.addCell(customerCell);
        
        doc.add(customerTable);
        doc.add(new Paragraph("\n"));

        // Items Table
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{40, 15, 15, 15, 15})).useAllAvailableWidth();
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Product / SKU").setBold()).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Qty").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Unit Price").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Disc %").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));

        for (OrderItem item : order.getItems()) {
            StringBuilder desc = new StringBuilder(item.getProduct().getName());
            desc.append("\nSKU: ").append(item.getProduct().getSku());
            if (item.getHsnCode() != null && !item.getHsnCode().isBlank()) {
                desc.append(" | HSN: ").append(item.getHsnCode());
            }
            if (item.getGstRate() != null) {
                desc.append(" | GST: ").append(item.getGstRate()).append("%");
            }
            if (item.getBarcode() != null && !item.getBarcode().isBlank()) {
                desc.append(" | Barcode: ").append(item.getBarcode());
            }
            if (item.getProduct() != null && item.getProduct().getBinLocation() != null && !item.getProduct().getBinLocation().isBlank()) {
                desc.append(" | Bin: ").append(item.getProduct().getBinLocation());
            }
            Cell descCell = new Cell().add(new Paragraph(desc.toString()).setFontSize(8).setMultipliedLeading(1.15f))
                    .setPadding(4f);
            itemsTable.addCell(descCell);
            itemsTable.addCell(new Cell().add(new Paragraph(String.valueOf(item.getQuantity())).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9).setPadding(4f));
            itemsTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(item.getUnitPrice()))).setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setPadding(4f));
            itemsTable.addCell(new Cell().add(new Paragraph(item.getDiscountPercentage() + "%")).setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setPadding(4f));
            itemsTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(item.getLineTotal()))).setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setPadding(4f));
        }
        doc.add(itemsTable);
        doc.add(new Paragraph("\n"));

        // Totals Table (BUG-115: Prevent page break splits)
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        totalsTable.setKeepTogether(true);
        Cell notesAndBankCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
        notesAndBankCell.add(new Paragraph("Notes:\n" + (order.getNotes() != null ? org.springframework.web.util.HtmlUtils.htmlUnescape(order.getNotes()) : "Thank you for your business!")).setFontSize(8));
        
        Table bankBox = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Cell bankCell = new Cell().setBorder(new SolidBorder(COLOR_BORDER, 0.5f)).setBackgroundColor(COLOR_BG_LIGHT).setPadding(5).setMarginTop(8);
        bankCell.add(new Paragraph("BANK & REMITTANCE DETAILS").setBold().setFontSize(7.5f).setFontColor(COLOR_ACCENT));
        bankCell.add(new Paragraph("Bank: HDFC Bank Ltd | Account No: 50200088992211\n" +
                "IFSC: HDFC0001234 | Branch: Commercial City Hub\n" +
                "UPI ID: billing@sanitarywarecrm.com").setFontSize(7).setFontColor(COLOR_MUTED));
        bankBox.addCell(bankCell);
        notesAndBankCell.add(bankBox);
        totalsTable.addCell(notesAndBankCell);
        
        Table amountTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        amountTable.addCell(new Cell().add(new Paragraph("Subtotal:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getSubtotal()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Tax (" + order.getTaxPercentage() + "%):")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getTaxAmount()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Discount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getDiscount()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Shipping Charge:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getShippingCharge()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));

        amountTable.addCell(new Cell().add(new Paragraph("Grand Total:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getTotal()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Paid Amount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getPaidAmount()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Balance Due:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());
        amountTable.addCell(new Cell().add(new Paragraph(formatIndianCurrency(order.getBalanceAmount()))).setTextAlignment(TextAlignment.RIGHT).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());

        totalsTable.addCell(new Cell().add(amountTable).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(totalsTable);

        // Authorized Signature Block (BUG-114: Text fallback without broken image box)
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        Cell emptySigCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
        Cell sigCell = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        sigCell.add(new Paragraph("\n\n___________________________________\nAuthorized Signatory for " + compName)
                .setFontSize(8f).setFontColor(COLOR_MUTED));
        sigTable.addCell(emptySigCell);
        sigTable.addCell(sigCell);
        sigTable.setKeepTogether(true);
        doc.add(new Paragraph("\n"));
        doc.add(sigTable);

        doc.close();
        return baos.toByteArray();
    }

    public byte[] generatePurchaseOrderPdf(PurchaseOrder po) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc);
        
        SystemSettings settings = systemSettingsRepository.findAll().stream().findFirst().orElse(null);
        String compName = settings != null && settings.getCompanyName() != null ? settings.getCompanyName() : "Sanitaryware Store CRM";
        String compAddr = settings != null && settings.getAddress() != null ? settings.getAddress() : "Main Warehouse Hub";
        String compPhone = settings != null && settings.getPhone() != null ? settings.getPhone() : "+91-98765-43210";
        String compEmail = settings != null && settings.getEmail() != null ? settings.getEmail() : "billing@sanitaryware.com";
        String compGst = settings != null && settings.getGstNumber() != null ? settings.getGstNumber() : "N/A";

        // Header Table
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        headerTable.addCell(new Cell().add(new Paragraph(compName).setBold().setFontSize(18))
                .add(new Paragraph(compAddr + "\nPhone: " + compPhone + " | Email: " + compEmail + "\nGSTIN: " + compGst).setFontSize(9))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        headerTable.addCell(new Cell().add(new Paragraph("PURCHASE ORDER").setBold().setFontSize(20).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("PO #: " + po.getPoNumber()).setBold().setFontSize(10).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Date: " + po.getOrderDate().toString()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Status: " + po.getStatus().name()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(headerTable);
        doc.add(new Paragraph("\n"));

        // Distributor Info Table
        Table distTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Distributor distributor = po.getDistributor();
        String distName = distributor != null ? distributor.getName() : "N/A";
        String distContact = distributor != null && distributor.getContactPerson() != null ? distributor.getContactPerson() : "";
        String distPhone = distributor != null && distributor.getPhoneNumber() != null ? distributor.getPhoneNumber() : "";
        String distEmail = distributor != null && distributor.getEmail() != null ? distributor.getEmail() : "";
        String distAddr = distributor != null && distributor.getAddress() != null ? distributor.getAddress() : "";
        String distGst = distributor != null && distributor.getGstNumber() != null ? distributor.getGstNumber() : "";

        distTable.addCell(new Cell().add(new Paragraph("VENDOR / DISTRIBUTOR:").setBold().setFontSize(10))
                .add(new Paragraph(distName).setBold().setFontSize(11))
                .add(new Paragraph((!distContact.isBlank() ? "Attn: " + distContact + "\n" : "") +
                        (!distAddr.isBlank() ? distAddr + "\n" : "") +
                        "Phone: " + distPhone + " | Email: " + distEmail +
                        (!distGst.isBlank() ? " | GSTIN: " + distGst : "")).setFontSize(9))
                .setPadding(8));
        
        doc.add(distTable);
        doc.add(new Paragraph("\n"));

        // Items Table
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{40, 15, 15, 15, 15})).useAllAvailableWidth();
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Product / SKU").setBold()).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Ordered").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Unit Cost").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("GST %").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));

        if (po.getItems() != null) {
            for (PurchaseOrderItem item : po.getItems()) {
                String prodName = item.getProduct() != null ? item.getProduct().getName() : "Item";
                String prodSku = item.getProduct() != null ? item.getProduct().getSku() : "";
                StringBuilder desc = new StringBuilder(prodName);
                if (!prodSku.isBlank()) desc.append("\nSKU: ").append(prodSku);
                if (item.getHsnCode() != null && !item.getHsnCode().isBlank()) {
                    desc.append(" | HSN: ").append(item.getHsnCode());
                }
                if (item.getBarcode() != null && !item.getBarcode().isBlank()) {
                    desc.append(" | Barcode: ").append(item.getBarcode());
                }
                itemsTable.addCell(new Cell().add(new Paragraph(desc.toString())).setFontSize(8));
                itemsTable.addCell(new Cell().add(new Paragraph(String.valueOf(item.getQuantity())).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
                itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getUnitCost()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
                itemsTable.addCell(new Cell().add(new Paragraph((item.getGstRate() != null ? item.getGstRate() + "%" : "0%")).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
                itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getLineTotal()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            }
        }
        doc.add(itemsTable);
        doc.add(new Paragraph("\n"));

        // Totals Table
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        totalsTable.addCell(new Cell().add(new Paragraph("Notes / Delivery Terms:\n" + (po.getNotes() != null ? org.springframework.web.util.HtmlUtils.htmlUnescape(po.getNotes()) : "Standard delivery within 7 business days.")).setFontSize(8))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        Table amountTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        amountTable.addCell(new Cell().add(new Paragraph("Subtotal:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + po.getSubtotal()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Tax (" + po.getTaxPercentage() + "%):")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + po.getTaxAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));

        amountTable.addCell(new Cell().add(new Paragraph("Grand Total:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + po.getTotal()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Paid Amount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + po.getPaidAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Balance Due:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + po.getBalanceAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());

        totalsTable.addCell(new Cell().add(amountTable).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(totalsTable);

        // Terms and conditions clause (BUG-148)
        doc.add(new Paragraph("\n"));
        Table termsTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        termsTable.addCell(new Cell().add(new Paragraph("DISTRIBUTOR TERMS & PAYMENT CONDITIONS:").setBold().setFontSize(9))
                .add(new Paragraph("1. Payment Terms: Net 30 Days from invoice receipt unless otherwise contracted.\n" +
                        "2. Inspection & Acceptance: Goods subject to count and quality verification at destination warehouse.\n" +
                        "3. Damaged / Defective Stock: Discrepancies debited against supplier payable balance.\n" +
                        "4. Delivery Window: Monday through Saturday 9:00 AM - 5:00 PM.").setFontSize(8).setFontColor(COLOR_MUTED))
                .setPadding(6)
                .setBackgroundColor(COLOR_BG_LIGHT)
                .setBorder(new SolidBorder(COLOR_BORDER, 0.5f)));
        doc.add(termsTable);

        doc.close();
        return baos.toByteArray();
    }
}
