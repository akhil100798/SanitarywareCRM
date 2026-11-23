package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.SalesSummaryReport> getSalesSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Order.OrderStatus status) {
        return ResponseEntity.ok(reportService.getSalesSummary(startDate, endDate, customerId, status));
    }

    @GetMapping("/customer-outstanding")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.CustomerOutstandingReport> getCustomerOutstanding(
            @RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(reportService.getCustomerOutstanding(customerId));
    }

    @GetMapping("/distributor-outstanding")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.DistributorOutstandingReport> getDistributorOutstanding(
            @RequestParam(required = false) Long distributorId) {
        return ResponseEntity.ok(reportService.getDistributorOutstanding(distributorId));
    }

    @GetMapping("/payment-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.PaymentSummaryReport> getPaymentSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Payment.PaymentMethod paymentMethod) {
        return ResponseEntity.ok(reportService.getPaymentSummary(startDate, endDate, paymentMethod));
    }

    @GetMapping("/purchase-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.PurchaseSummaryReport> getPurchaseSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long distributorId,
            @RequestParam(required = false) PurchaseOrder.POStatus status) {
        return ResponseEntity.ok(reportService.getPurchaseSummary(startDate, endDate, distributorId, status));
    }

    @GetMapping("/inventory-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.InventorySummaryReport> getInventorySummary(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId) {
        return ResponseEntity.ok(reportService.getInventorySummary(categoryId, brandId));
    }

    @GetMapping("/gst-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.GstTaxSummaryReport> getGstTaxSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getGstTaxSummary(startDate, endDate));
    }

    @GetMapping("/gst-summary/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> exportGstTaxSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "xlsx") String format) {
        byte[] content = reportService.exportGstTaxSummary(startDate, endDate, format);
        boolean isExcel = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);
        String contentType = isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
        String ext = isExcel ? "xlsx" : "csv";
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"gst_tax_summary." + ext + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                .body(content);
    }

    @GetMapping("/payment-aging")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.PaymentAgingReport> getPaymentAging(
            @RequestParam(required = false) String customerType) {
        return ResponseEntity.ok(reportService.getPaymentAgingReport(customerType));
    }

    @GetMapping("/payment-aging/export")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<byte[]> exportPaymentAging(
            @RequestParam(required = false) String customerType,
            @RequestParam(defaultValue = "xlsx") String format) {
        byte[] content = reportService.exportPaymentAgingReport(customerType, format);
        boolean isExcel = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);
        String contentType = isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
        String ext = isExcel ? "xlsx" : "csv";
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payment_aging_report." + ext + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                .body(content);
    }

    @GetMapping("/dead-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.DeadStockReport> getDeadStock(
            @RequestParam(required = false, defaultValue = "60") Integer dormantDays) {
        return ResponseEntity.ok(reportService.getDeadStockReport(dormantDays));
    }

    @GetMapping("/brand-margins")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ReportDTO.BrandMarginReport> getBrandMargins(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getBrandMarginReport(startDate, endDate));
    }
}
