package com.sanitaryware.crm.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.SystemSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;

@Service
public class PdfGeneratorService {

    @Autowired
    private SystemSettingsRepository systemSettingsRepository;

    public byte[] generateQuotationPdf(Quotation quotation) {
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
        
        headerTable.addCell(new Cell().add(new Paragraph("QUOTATION").setBold().setFontSize(20).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Quote #: " + quotation.getQuotationNumber()).setBold().setFontSize(10).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Date: " + quotation.getQuotationDate().toString()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Valid Until: " + quotation.getValidUntil().toString()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(headerTable);
        doc.add(new Paragraph("\n"));

        // Customer Info Table
        Table customerTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Customer customer = quotation.getCustomer();
        customerTable.addCell(new Cell().add(new Paragraph("BILL TO:").setBold().setFontSize(10))
                .add(new Paragraph(customer.getName()).setBold().setFontSize(11))
                .add(new Paragraph((customer.getCompany() != null ? customer.getCompany() + "\n" : "") +
                        customer.getBillingAddress() + "\n" +
                        customer.getCity() + ", " + customer.getState() + " - " + customer.getPincode() + "\n" +
                        "Phone: " + customer.getPhoneNumber() + " | Email: " + (customer.getEmail() != null ? customer.getEmail() : "")).setFontSize(9))
                .setPadding(8));
        
        doc.add(customerTable);
        doc.add(new Paragraph("\n"));

        // Items Table
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{40, 15, 15, 15, 15})).useAllAvailableWidth();
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Product / SKU").setBold()).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Qty").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Unit Price").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Disc %").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));

        for (QuotationItem item : quotation.getItems()) {
            itemsTable.addCell(new Cell().add(new Paragraph(item.getProduct().getName() + "\nSKU: " + item.getProduct().getSku()).setFontSize(9)));
            itemsTable.addCell(new Cell().add(new Paragraph(String.valueOf(item.getQuantity())).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getUnitPrice()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph(item.getDiscountPercentage() + "%").setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getLineTotal()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        }
        doc.add(itemsTable);
        doc.add(new Paragraph("\n"));

        // Totals Table
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        totalsTable.addCell(new Cell().add(new Paragraph("Notes:\n" + (quotation.getNotes() != null ? quotation.getNotes() : "") + 
                "\n\nTerms & Conditions:\n" + (quotation.getTermsAndConditions() != null ? quotation.getTermsAndConditions() : "Prices valid for 7 days.")).setFontSize(8))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        Table amountTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        amountTable.addCell(new Cell().add(new Paragraph("Subtotal:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + quotation.getSubtotal()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Tax (" + quotation.getTaxPercentage() + "%):")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + quotation.getTaxAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Discount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + quotation.getDiscount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Grand Total:").setBold()).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + quotation.getTotal()).setBold().setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11));

        totalsTable.addCell(new Cell().add(amountTable).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(totalsTable);

        doc.close();
        return baos.toByteArray();
    }

    public byte[] generateOrderInvoicePdf(Order order) {
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
        
        headerTable.addCell(new Cell().add(new Paragraph("TAX INVOICE").setBold().setFontSize(20).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Invoice #: " + order.getOrderNumber()).setBold().setFontSize(10).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Date: " + order.getOrderDate().toString()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .add(new Paragraph("Status: " + order.getStatus().name()).setFontSize(9).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(headerTable);
        doc.add(new Paragraph("\n"));

        // Customer Info Table
        Table customerTable = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        Customer customer = order.getCustomer();
        customerTable.addCell(new Cell().add(new Paragraph("BILL TO:").setBold().setFontSize(10))
                .add(new Paragraph(customer.getName()).setBold().setFontSize(11))
                .add(new Paragraph((customer.getCompany() != null ? customer.getCompany() + "\n" : "") +
                        customer.getBillingAddress() + "\n" +
                        customer.getCity() + ", " + customer.getState() + " - " + customer.getPincode() + "\n" +
                        "Phone: " + customer.getPhoneNumber() + " | Email: " + (customer.getEmail() != null ? customer.getEmail() : "")).setFontSize(9))
                .setPadding(8));
        
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
            itemsTable.addCell(new Cell().add(new Paragraph(item.getProduct().getName() + "\nSKU: " + item.getProduct().getSku()).setFontSize(9)));
            itemsTable.addCell(new Cell().add(new Paragraph(String.valueOf(item.getQuantity())).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getUnitPrice()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph(item.getDiscountPercentage() + "%").setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
            itemsTable.addCell(new Cell().add(new Paragraph("Rs. " + item.getLineTotal()).setTextAlignment(TextAlignment.RIGHT)).setFontSize(9));
        }
        doc.add(itemsTable);
        doc.add(new Paragraph("\n"));

        // Totals Table
        Table totalsTable = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
        totalsTable.addCell(new Cell().add(new Paragraph("Notes:\n" + (order.getNotes() != null ? order.getNotes() : "")).setFontSize(8))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        Table amountTable = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        amountTable.addCell(new Cell().add(new Paragraph("Subtotal:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getSubtotal()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Tax (" + order.getTaxPercentage() + "%):")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getTaxAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Discount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getDiscount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        
        amountTable.addCell(new Cell().add(new Paragraph("Shipping Charge:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getShippingCharge()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(9));

        amountTable.addCell(new Cell().add(new Paragraph("Grand Total:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getTotal()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Paid Amount:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getPaidAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(10).setBold());

        amountTable.addCell(new Cell().add(new Paragraph("Balance Due:")).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());
        amountTable.addCell(new Cell().add(new Paragraph("Rs. " + order.getBalanceAmount()).setTextAlignment(TextAlignment.RIGHT)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setFontSize(11).setBold());

        totalsTable.addCell(new Cell().add(amountTable).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
        
        doc.add(totalsTable);

        doc.close();
        return baos.toByteArray();
    }
}
