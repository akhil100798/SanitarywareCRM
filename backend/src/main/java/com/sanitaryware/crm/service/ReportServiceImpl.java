package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final PaymentRepository paymentRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DistributorRepository distributorRepository;
    private final ProductRepository productRepository;

    @Override
    public ReportDTO.SalesSummaryReport getSalesSummary(LocalDate startDate, LocalDate endDate, Long customerId, Order.OrderStatus status) {
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> startDate == null || (o.getOrderDate() != null && !o.getOrderDate().isBefore(startDate)))
                .filter(o -> endDate == null || (o.getOrderDate() != null && !o.getOrderDate().isAfter(endDate)))
                .filter(o -> customerId == null || (o.getCustomer() != null && customerId.equals(o.getCustomer().getId())))
                .filter(o -> status == null || o.getStatus() == status)
                .sorted(Comparator.comparing(Order::getOrderDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        BigDecimal totalSales = orders.stream()
                .map(Order::getTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalTax = orders.stream()
                .map(Order::getTaxAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDiscount = orders.stream()
                .map(Order::getDiscount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgValue = orders.isEmpty() ? BigDecimal.ZERO : totalSales.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP);

        List<ReportDTO.SalesOrderSummary> orderSummaries = orders.stream()
                .map(o -> ReportDTO.SalesOrderSummary.builder()
                        .orderId(o.getId())
                        .orderNumber(o.getOrderNumber())
                        .orderDate(o.getOrderDate())
                        .customerName(o.getCustomer() != null ? o.getCustomer().getName() : "N/A")
                        .subtotal(o.getSubtotal() != null ? o.getSubtotal() : BigDecimal.ZERO)
                        .taxAmount(o.getTaxAmount() != null ? o.getTaxAmount() : BigDecimal.ZERO)
                        .discount(o.getDiscount() != null ? o.getDiscount() : BigDecimal.ZERO)
                        .total(o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO)
                        .status(o.getStatus() != null ? o.getStatus().name() : "N/A")
                        .paymentStatus(o.getPaymentStatus() != null ? o.getPaymentStatus().name() : "N/A")
                        .build())
                .collect(Collectors.toList());

        return ReportDTO.SalesSummaryReport.builder()
                .totalSales(totalSales)
                .totalOrders(orders.size())
                .totalTaxCollected(totalTax)
                .totalDiscountGiven(totalDiscount)
                .averageOrderValue(avgValue)
                .orders(orderSummaries)
                .build();
    }

    @Override
    public ReportDTO.CustomerOutstandingReport getCustomerOutstanding(Long customerId) {
        List<Customer> customers = customerId != null
                ? customerRepository.findById(customerId).map(List::of).orElse(Collections.emptyList())
                : customerRepository.findAll();

        List<ReportDTO.CustomerBalanceSummary> summaries = new ArrayList<>();
        BigDecimal totalOutstanding = BigDecimal.ZERO;

        for (Customer c : customers) {
            List<Order> orders = orderRepository.findByCustomerId(c.getId());
            BigDecimal totalBilled = orders.stream()
                    .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                    .map(Order::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalPaid = orders.stream()
                    .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                    .map(Order::getPaidAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal balance = orders.stream()
                    .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                    .map(Order::getBalanceAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (balance.compareTo(BigDecimal.ZERO) > 0 || customerId != null) {
                summaries.add(ReportDTO.CustomerBalanceSummary.builder()
                        .customerId(c.getId())
                        .customerName(c.getName())
                        .phoneNumber(c.getPhoneNumber())
                        .company(c.getCompany())
                        .totalOrders(orders.size())
                        .totalBilled(totalBilled)
                        .totalPaid(totalPaid)
                        .outstandingBalance(balance)
                        .build());
                totalOutstanding = totalOutstanding.add(balance);
            }
        }

        summaries.sort((a, b) -> b.getOutstandingBalance().compareTo(a.getOutstandingBalance()));

        return ReportDTO.CustomerOutstandingReport.builder()
                .totalOutstanding(totalOutstanding)
                .totalCustomersWithBalance(summaries.size())
                .customers(summaries)
                .build();
    }

    @Override
    public ReportDTO.DistributorOutstandingReport getDistributorOutstanding(Long distributorId) {
        List<Distributor> distributors = distributorId != null
                ? distributorRepository.findById(distributorId).map(List::of).orElse(Collections.emptyList())
                : distributorRepository.findAll();

        List<ReportDTO.DistributorBalanceSummary> summaries = new ArrayList<>();
        BigDecimal totalOutstanding = BigDecimal.ZERO;

        for (Distributor d : distributors) {
            List<PurchaseOrder> pos = purchaseOrderRepository.findByDistributorId(d.getId());
            BigDecimal totalPurchased = pos.stream()
                    .filter(p -> p.getStatus() != PurchaseOrder.POStatus.CANCELLED)
                    .map(PurchaseOrder::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalPaid = pos.stream()
                    .filter(p -> p.getStatus() != PurchaseOrder.POStatus.CANCELLED)
                    .map(PurchaseOrder::getPaidAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal balance = d.getOutstandingBalance() != null ? d.getOutstandingBalance() : BigDecimal.ZERO;

            if (balance.compareTo(BigDecimal.ZERO) > 0 || distributorId != null) {
                summaries.add(ReportDTO.DistributorBalanceSummary.builder()
                        .distributorId(d.getId())
                        .distributorName(d.getName())
                        .contactPerson(d.getContactPerson())
                        .phoneNumber(d.getPhoneNumber())
                        .totalPurchaseOrders(pos.size())
                        .totalPurchased(totalPurchased)
                        .totalPaid(totalPaid)
                        .outstandingBalance(balance)
                        .build());
                totalOutstanding = totalOutstanding.add(balance);
            }
        }

        summaries.sort((a, b) -> b.getOutstandingBalance().compareTo(a.getOutstandingBalance()));

        return ReportDTO.DistributorOutstandingReport.builder()
                .totalOutstanding(totalOutstanding)
                .totalDistributorsWithBalance(summaries.size())
                .distributors(summaries)
                .build();
    }

    @Override
    public ReportDTO.PaymentSummaryReport getPaymentSummary(LocalDate startDate, LocalDate endDate, Payment.PaymentMethod paymentMethod) {
        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> startDate == null || (p.getPaymentDate() != null && !p.getPaymentDate().isBefore(startDate)))
                .filter(p -> endDate == null || (p.getPaymentDate() != null && !p.getPaymentDate().isAfter(endDate)))
                .filter(p -> paymentMethod == null || p.getPaymentMethod() == paymentMethod)
                .sorted(Comparator.comparing(Payment::getPaymentDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        BigDecimal totalReceived = payments.stream()
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> breakdown = new HashMap<>();
        for (Payment.PaymentMethod method : Payment.PaymentMethod.values()) {
            BigDecimal sum = payments.stream()
                    .filter(p -> p.getPaymentMethod() == method)
                    .map(Payment::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            breakdown.put(method.name(), sum);
        }

        List<ReportDTO.PaymentTransactionSummary> transactions = payments.stream()
                .map(p -> ReportDTO.PaymentTransactionSummary.builder()
                        .paymentId(p.getId())
                        .paymentNumber(p.getPaymentNumber())
                        .paymentDate(p.getPaymentDate())
                        .orderNumber(p.getOrder() != null ? p.getOrder().getOrderNumber() : "N/A")
                        .customerName(p.getOrder() != null && p.getOrder().getCustomer() != null ? p.getOrder().getCustomer().getName() : "N/A")
                        .amount(p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                        .paymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "N/A")
                        .referenceNumber(p.getReferenceNumber())
                        .build())
                .collect(Collectors.toList());

        return ReportDTO.PaymentSummaryReport.builder()
                .totalReceived(totalReceived)
                .totalTransactions(payments.size())
                .paymentMethodBreakdown(breakdown)
                .recentTransactions(transactions)
                .build();
    }

    @Override
    public ReportDTO.PurchaseSummaryReport getPurchaseSummary(LocalDate startDate, LocalDate endDate, Long distributorId, PurchaseOrder.POStatus status) {
        List<PurchaseOrder> pos = purchaseOrderRepository.findAll().stream()
                .filter(p -> startDate == null || (p.getOrderDate() != null && !p.getOrderDate().isBefore(startDate)))
                .filter(p -> endDate == null || (p.getOrderDate() != null && !p.getOrderDate().isAfter(endDate)))
                .filter(p -> distributorId == null || (p.getDistributor() != null && distributorId.equals(p.getDistributor().getId())))
                .filter(p -> status == null || p.getStatus() == status)
                .sorted(Comparator.comparing(PurchaseOrder::getOrderDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        BigDecimal totalPurchases = pos.stream()
                .map(PurchaseOrder::getTotal)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaid = pos.stream()
                .map(PurchaseOrder::getPaidAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPayables = pos.stream()
                .map(PurchaseOrder::getBalanceAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long receivedCount = pos.stream()
                .filter(p -> p.getStatus() == PurchaseOrder.POStatus.RECEIVED)
                .count();

        List<ReportDTO.PurchaseOrderSummary> summaries = pos.stream()
                .map(p -> ReportDTO.PurchaseOrderSummary.builder()
                        .poId(p.getId())
                        .poNumber(p.getPoNumber())
                        .orderDate(p.getOrderDate())
                        .distributorName(p.getDistributor() != null ? p.getDistributor().getName() : "N/A")
                        .subtotal(p.getSubtotal() != null ? p.getSubtotal() : BigDecimal.ZERO)
                        .taxAmount(p.getTaxAmount() != null ? p.getTaxAmount() : BigDecimal.ZERO)
                        .total(p.getTotal() != null ? p.getTotal() : BigDecimal.ZERO)
                        .paidAmount(p.getPaidAmount() != null ? p.getPaidAmount() : BigDecimal.ZERO)
                        .balanceAmount(p.getBalanceAmount() != null ? p.getBalanceAmount() : BigDecimal.ZERO)
                        .status(p.getStatus() != null ? p.getStatus().name() : "N/A")
                        .build())
                .collect(Collectors.toList());

        return ReportDTO.PurchaseSummaryReport.builder()
                .totalPurchases(totalPurchases)
                .totalOrders(pos.size())
                .totalPaid(totalPaid)
                .totalPayables(totalPayables)
                .receivedOrdersCount(receivedCount)
                .purchaseOrders(summaries)
                .build();
    }

    @Override
    public ReportDTO.InventorySummaryReport getInventorySummary(Long categoryId, Long brandId) {
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> categoryId == null || (p.getCategory() != null && categoryId.equals(p.getCategory().getId())))
                .filter(p -> brandId == null || (p.getBrand() != null && brandId.equals(p.getBrand().getId())))
                .sorted(Comparator.comparing(Product::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .collect(Collectors.toList());

        long totalStock = 0;
        BigDecimal totalValue = BigDecimal.ZERO;
        long lowStockCount = 0;
        long outOfStockCount = 0;
        long activeCount = 0;

        List<ReportDTO.InventoryItemSummary> items = new ArrayList<>();

        for (Product p : products) {
            int qty = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            totalStock += qty;
            if (Boolean.TRUE.equals(p.getIsActive())) activeCount++;
            if (qty <= 0) outOfStockCount++;
            else if (qty < 10) lowStockCount++;

            BigDecimal unitPrice = p.getPurchasePrice() != null ? p.getPurchasePrice() : (p.getSellingPrice() != null ? p.getSellingPrice() : BigDecimal.ZERO);
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            totalValue = totalValue.add(itemTotal);

            items.add(ReportDTO.InventoryItemSummary.builder()
                    .productId(p.getId())
                    .productName(p.getName())
                    .sku(p.getSku())
                    .barcode(p.getBarcode())
                    .hsnCode(p.getHsnCode())
                    .brandName(p.getBrand() != null ? p.getBrand().getName() : "N/A")
                    .categoryName(p.getCategory() != null ? p.getCategory().getName() : "N/A")
                    .stockQuantity(qty)
                    .purchasePrice(p.getPurchasePrice())
                    .sellingPrice(p.getSellingPrice())
                    .totalValue(itemTotal)
                    .isLowStock(qty < 10)
                    .build());
        }

        return ReportDTO.InventorySummaryReport.builder()
                .totalProducts(products.size())
                .activeProducts(activeCount)
                .totalStockQuantity(totalStock)
                .totalInventoryValue(totalValue)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .items(items)
                .build();
    }
}
