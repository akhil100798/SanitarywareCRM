package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.PurchaseOrder;

import java.time.LocalDate;

public interface ReportService {

    ReportDTO.SalesSummaryReport getSalesSummary(LocalDate startDate, LocalDate endDate, Long customerId, Order.OrderStatus status);

    ReportDTO.CustomerOutstandingReport getCustomerOutstanding(Long customerId);

    ReportDTO.DistributorOutstandingReport getDistributorOutstanding(Long distributorId);

    ReportDTO.PaymentSummaryReport getPaymentSummary(LocalDate startDate, LocalDate endDate, Payment.PaymentMethod paymentMethod);

    ReportDTO.PurchaseSummaryReport getPurchaseSummary(LocalDate startDate, LocalDate endDate, Long distributorId, PurchaseOrder.POStatus status);

    ReportDTO.InventorySummaryReport getInventorySummary(Long categoryId, Long brandId);
}
