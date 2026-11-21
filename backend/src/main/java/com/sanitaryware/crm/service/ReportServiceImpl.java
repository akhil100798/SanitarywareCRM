package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.repository.*;
import com.sanitaryware.crm.util.CsvFormulaSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
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

            BigDecimal unitPrice = (p.getPurchasePrice() != null && p.getPurchasePrice().compareTo(BigDecimal.ZERO) >= 0)
                    ? p.getPurchasePrice()
                    : BigDecimal.ZERO;
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

    @Override
    public ReportDTO.GstTaxSummaryReport getGstTaxSummary(LocalDate startDate, LocalDate endDate) {
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                .filter(o -> startDate == null || (o.getOrderDate() != null && !o.getOrderDate().isBefore(startDate)))
                .filter(o -> endDate == null || (o.getOrderDate() != null && !o.getOrderDate().isAfter(endDate)))
                .sorted(Comparator.comparing(Order::getOrderDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalInvoiceAmt = BigDecimal.ZERO;

        Map<String, ReportDTO.GstHsnBreakdown> hsnMap = new HashMap<>();
        List<ReportDTO.GstInvoiceItem> invoiceItems = new ArrayList<>();

        for (Order o : orders) {
            BigDecimal invTaxable = o.getSubtotal() != null ? o.getSubtotal() : BigDecimal.ZERO;
            BigDecimal invTax = o.getTaxAmount() != null ? o.getTaxAmount() : BigDecimal.ZERO;
            BigDecimal invTotal = o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO;

            totalTaxable = totalTaxable.add(invTaxable);
            totalTax = totalTax.add(invTax);
            totalInvoiceAmt = totalInvoiceAmt.add(invTotal);

            BigDecimal invCgst = invTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal invSgst = invTax.subtract(invCgst);

            String gstin = (o.getCustomer() != null && o.getCustomer().getGstNumber() != null)
                    ? o.getCustomer().getGstNumber() : "URP";

            invoiceItems.add(ReportDTO.GstInvoiceItem.builder()
                    .invoiceNumber(o.getOrderNumber())
                    .invoiceDate(o.getOrderDate())
                    .customerName(o.getCustomer() != null ? o.getCustomer().getName() : "Direct Customer")
                    .gstin(gstin)
                    .taxableAmount(invTaxable)
                    .cgstAmount(invCgst)
                    .sgstAmount(invSgst)
                    .igstAmount(BigDecimal.ZERO)
                    .totalTax(invTax)
                    .invoiceTotal(invTotal)
                    .build());

            if (o.getItems() != null) {
                for (OrderItem item : o.getItems()) {
                    String hsn = (item.getHsnCode() != null && !item.getHsnCode().isBlank())
                            ? item.getHsnCode()
                            : (item.getProduct() != null && item.getProduct().getHsnCode() != null
                            ? item.getProduct().getHsnCode() : "6910");

                    BigDecimal itemTaxable = item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO;
                    BigDecimal rate = item.getGstRate() != null ? item.getGstRate() : BigDecimal.valueOf(18.0);
                    BigDecimal itemTax = itemTaxable.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    BigDecimal itemCgst = itemTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    BigDecimal itemSgst = itemTax.subtract(itemCgst);

                    hsnMap.compute(hsn, (k, existing) -> {
                        if (existing == null) {
                            return ReportDTO.GstHsnBreakdown.builder()
                                    .hsnCode(k)
                                    .description("Sanitaryware Ceramic Products")
                                    .taxRate(rate)
                                    .taxableAmount(itemTaxable)
                                    .cgstAmount(itemCgst)
                                    .sgstAmount(itemSgst)
                                    .igstAmount(BigDecimal.ZERO)
                                    .totalTax(itemTax)
                                    .build();
                        } else {
                            existing.setTaxableAmount(existing.getTaxableAmount().add(itemTaxable));
                            existing.setCgstAmount(existing.getCgstAmount().add(itemCgst));
                            existing.setSgstAmount(existing.getSgstAmount().add(itemSgst));
                            existing.setTotalTax(existing.getTotalTax().add(itemTax));
                            return existing;
                        }
                    });
                }
            }
        }

        BigDecimal totalCgst = totalTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal totalSgst = totalTax.subtract(totalCgst);

        return ReportDTO.GstTaxSummaryReport.builder()
                .totalTaxableAmount(totalTaxable)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .totalIgst(BigDecimal.ZERO)
                .totalTax(totalTax)
                .totalInvoiceAmount(totalInvoiceAmt)
                .totalInvoices(orders.size())
                .hsnBreakdowns(new ArrayList<>(hsnMap.values()))
                .invoices(invoiceItems)
                .build();
    }

    @Override
    public byte[] exportGstTaxSummary(LocalDate startDate, LocalDate endDate, String format) {
        ReportDTO.GstTaxSummaryReport report = getGstTaxSummary(startDate, endDate);
        boolean isExcel = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);

        if (isExcel) {
            try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                Sheet sheet = workbook.createSheet("GST_Tax_Summary");
                Row header = sheet.createRow(0);
                String[] columns = {"Invoice No", "Date", "Customer Name", "GSTIN", "Taxable (INR)", "CGST (INR)", "SGST (INR)", "Total Tax (INR)", "Invoice Total (INR)"};
                for (int i = 0; i < columns.length; i++) {
                    Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                }

                int rowIdx = 1;
                for (ReportDTO.GstInvoiceItem item : report.getInvoices()) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(CsvFormulaSanitizer.sanitize(item.getInvoiceNumber()));
                    row.createCell(1).setCellValue(CsvFormulaSanitizer.sanitize(item.getInvoiceDate()));
                    row.createCell(2).setCellValue(CsvFormulaSanitizer.sanitize(item.getCustomerName()));
                    row.createCell(3).setCellValue(CsvFormulaSanitizer.sanitize(item.getGstin()));
                    row.createCell(4).setCellValue(item.getTaxableAmount() != null ? item.getTaxableAmount().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getCgstAmount() != null ? item.getCgstAmount().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getSgstAmount() != null ? item.getSgstAmount().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getTotalTax() != null ? item.getTotalTax().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(item.getInvoiceTotal() != null ? item.getInvoiceTotal().doubleValue() : 0.0);
                }

                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
                workbook.write(out);
                return out.toByteArray();
            } catch (IOException e) {
                log.error("Failed to generate Excel GST report", e);
                throw new RuntimeException("Excel export failed", e);
            }
        } else {
            StringBuilder sb = new StringBuilder();
            sb.append("Invoice No,Date,Customer Name,GSTIN,Taxable (INR),CGST (INR),SGST (INR),Total Tax (INR),Invoice Total (INR)\r\n");
            for (ReportDTO.GstInvoiceItem item : report.getInvoices()) {
                sb.append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getInvoiceNumber()))).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getInvoiceDate()))).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getCustomerName()))).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getGstin()))).append(",")
                        .append(item.getTaxableAmount()).append(",")
                        .append(item.getCgstAmount()).append(",")
                        .append(item.getSgstAmount()).append(",")
                        .append(item.getTotalTax()).append(",")
                        .append(item.getInvoiceTotal()).append("\r\n");
            }
            return sb.toString().getBytes(StandardCharsets.UTF_8);
        }
    }

    @Override
    public ReportDTO.PaymentAgingReport getPaymentAgingReport(String customerType) {
        LocalDate today = LocalDate.now();
        List<Customer> customers = customerRepository.findAll().stream()
                .filter(c -> customerType == null || customerType.isBlank() || customerType.equalsIgnoreCase("ALL")
                        || (c.getCustomerType() != null && c.getCustomerType().name().equalsIgnoreCase(customerType)))
                .toList();

        List<Order> allOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                .toList();

        List<Payment> allPayments = paymentRepository.findAll();

        BigDecimal grandTotalOutstanding = BigDecimal.ZERO;
        BigDecimal grandB0To30 = BigDecimal.ZERO;
        BigDecimal grandB31To60 = BigDecimal.ZERO;
        BigDecimal grandB61To90 = BigDecimal.ZERO;
        BigDecimal grandB90Plus = BigDecimal.ZERO;

        List<ReportDTO.CustomerAgingItem> agingItems = new ArrayList<>();

        for (Customer c : customers) {
            List<Order> customerOrders = allOrders.stream()
                    .filter(o -> o.getCustomer() != null && o.getCustomer().getId().equals(c.getId()))
                    .sorted(Comparator.comparing(Order::getOrderDate, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();

            BigDecimal billed = customerOrders.stream()
                    .map(Order::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal paid = customerOrders.stream()
                    .map(Order::getPaidAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal balance = billed.subtract(paid);
            if (balance.compareTo(BigDecimal.ZERO) > 0) {

                BigDecimal b0To30 = BigDecimal.ZERO;
                BigDecimal b31To60 = BigDecimal.ZERO;
                BigDecimal b61To90 = BigDecimal.ZERO;
                BigDecimal b90Plus = BigDecimal.ZERO;

                BigDecimal remainingUnpaid = balance;
                LocalDate oldestUnpaid = null;

                // Allocate balance to buckets according to order age
                for (Order o : customerOrders) {
                    if (remainingUnpaid.compareTo(BigDecimal.ZERO) <= 0) break;
                    LocalDate oDate = o.getOrderDate() != null ? o.getOrderDate() : today;
                    if (oldestUnpaid == null) {
                        oldestUnpaid = oDate;
                    }
                    long days = ChronoUnit.DAYS.between(oDate, today);
                    BigDecimal chunk = o.getTotal() != null ? o.getTotal().min(remainingUnpaid) : remainingUnpaid;

                    if (days <= 30) {
                        b0To30 = b0To30.add(chunk);
                    } else if (days <= 60) {
                        b31To60 = b31To60.add(chunk);
                    } else if (days <= 90) {
                        b61To90 = b61To90.add(chunk);
                    } else {
                        b90Plus = b90Plus.add(chunk);
                    }
                    remainingUnpaid = remainingUnpaid.subtract(chunk);
                }

                if (remainingUnpaid.compareTo(BigDecimal.ZERO) > 0) {
                    b90Plus = b90Plus.add(remainingUnpaid);
                }

                grandTotalOutstanding = grandTotalOutstanding.add(balance);
                grandB0To30 = grandB0To30.add(b0To30);
                grandB31To60 = grandB31To60.add(b31To60);
                grandB61To90 = grandB61To90.add(b61To90);
                grandB90Plus = grandB90Plus.add(b90Plus);

                agingItems.add(ReportDTO.CustomerAgingItem.builder()
                        .customerId(c.getId())
                        .customerName(c.getName())
                        .phoneNumber(c.getPhoneNumber())
                        .customerType(c.getCustomerType() != null ? c.getCustomerType().name() : "RETAIL")
                        .totalOutstanding(balance)
                        .bucket0To30(b0To30)
                        .bucket31To60(b31To60)
                        .bucket61To90(b61To90)
                        .bucket90Plus(b90Plus)
                        .oldestUnpaidInvoiceDate(oldestUnpaid)
                        .build());
            }
        }

        agingItems.sort(Comparator.comparing(ReportDTO.CustomerAgingItem::getTotalOutstanding).reversed());

        return ReportDTO.PaymentAgingReport.builder()
                .totalOutstanding(grandTotalOutstanding)
                .totalCustomers(agingItems.size())
                .bucket0To30(grandB0To30)
                .bucket31To60(grandB31To60)
                .bucket61To90(grandB61To90)
                .bucket90Plus(grandB90Plus)
                .items(agingItems)
                .build();
    }

    @Override
    public byte[] exportPaymentAgingReport(String customerType, String format) {
        ReportDTO.PaymentAgingReport report = getPaymentAgingReport(customerType);
        boolean isExcel = "xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format);

        if (isExcel) {
            try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                Sheet sheet = workbook.createSheet("Payment_Aging_Report");
                Row header = sheet.createRow(0);
                String[] columns = {"Customer Name", "Phone", "Type", "Total Balance (INR)", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Oldest Due Date"};
                for (int i = 0; i < columns.length; i++) {
                    Cell cell = header.createCell(i);
                    cell.setCellValue(columns[i]);
                }

                int rowIdx = 1;
                for (ReportDTO.CustomerAgingItem item : report.getItems()) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(CsvFormulaSanitizer.sanitize(item.getCustomerName()));
                    row.createCell(1).setCellValue(CsvFormulaSanitizer.sanitize(item.getPhoneNumber()));
                    row.createCell(2).setCellValue(CsvFormulaSanitizer.sanitize(item.getCustomerType()));
                    row.createCell(3).setCellValue(item.getTotalOutstanding() != null ? item.getTotalOutstanding().doubleValue() : 0.0);
                    row.createCell(4).setCellValue(item.getBucket0To30() != null ? item.getBucket0To30().doubleValue() : 0.0);
                    row.createCell(5).setCellValue(item.getBucket31To60() != null ? item.getBucket31To60().doubleValue() : 0.0);
                    row.createCell(6).setCellValue(item.getBucket61To90() != null ? item.getBucket61To90().doubleValue() : 0.0);
                    row.createCell(7).setCellValue(item.getBucket90Plus() != null ? item.getBucket90Plus().doubleValue() : 0.0);
                    row.createCell(8).setCellValue(CsvFormulaSanitizer.sanitize(item.getOldestUnpaidInvoiceDate()));
                }

                for (int i = 0; i < columns.length; i++) {
                    sheet.autoSizeColumn(i);
                }
                workbook.write(out);
                return out.toByteArray();
            } catch (IOException e) {
                log.error("Failed to generate Excel Aging report", e);
                throw new RuntimeException("Excel export failed", e);
            }
        } else {
            StringBuilder sb = new StringBuilder();
            sb.append("Customer Name,Phone,Type,Total Balance (INR),0-30 Days,31-60 Days,61-90 Days,90+ Days,Oldest Due Date\r\n");
            for (ReportDTO.CustomerAgingItem item : report.getItems()) {
                sb.append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getCustomerName()))).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getPhoneNumber()))).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getCustomerType()))).append(",")
                        .append(item.getTotalOutstanding()).append(",")
                        .append(item.getBucket0To30()).append(",")
                        .append(item.getBucket31To60()).append(",")
                        .append(item.getBucket61To90()).append(",")
                        .append(item.getBucket90Plus()).append(",")
                        .append(escapeCsv(CsvFormulaSanitizer.sanitize(item.getOldestUnpaidInvoiceDate()))).append("\r\n");
            }
            return sb.toString().getBytes(StandardCharsets.UTF_8);
        }
    }

    @Override
    public ReportDTO.DeadStockReport getDeadStockReport(Integer dormantDaysThreshold) {
        int threshold = (dormantDaysThreshold != null && dormantDaysThreshold > 0) ? dormantDaysThreshold : 60;
        LocalDate cutoff = LocalDate.now().minusDays(threshold);
        LocalDate today = LocalDate.now();

        List<Product> products = productRepository.findAll();
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                .toList();

        Map<Long, LocalDate> lastSaleDates = new HashMap<>();
        for (Order o : orders) {
            LocalDate oDate = o.getOrderDate();
            if (oDate != null && o.getItems() != null) {
                for (OrderItem oi : o.getItems()) {
                    if (oi.getProduct() != null) {
                        Long pId = oi.getProduct().getId();
                        lastSaleDates.merge(pId, oDate, (d1, d2) -> d1.isAfter(d2) ? d1 : d2);
                    }
                }
            }
        }

        List<ReportDTO.DeadStockItem> items = new ArrayList<>();
        long totalStock = 0;
        BigDecimal totalVal = BigDecimal.ZERO;

        for (Product p : products) {
            int qty = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            if (qty <= 0) continue; // Only report items with physical stock sitting in warehouse

            LocalDate lastSale = lastSaleDates.get(p.getId());
            boolean isDormant = (lastSale == null) || lastSale.isBefore(cutoff);

            if (isDormant) {
                long days = lastSale != null ? ChronoUnit.DAYS.between(lastSale, today) : 999;
                BigDecimal unitPrice = p.getPurchasePrice() != null ? p.getPurchasePrice() : p.getSellingPrice();
                if (unitPrice == null) unitPrice = BigDecimal.ZERO;
                BigDecimal stockValue = unitPrice.multiply(BigDecimal.valueOf(qty));

                totalStock += qty;
                totalVal = totalVal.add(stockValue);

                items.add(ReportDTO.DeadStockItem.builder()
                        .productId(p.getId())
                        .productName(p.getName())
                        .sku(p.getSku())
                        .brandName(p.getBrand() != null ? p.getBrand().getName() : "Generic")
                        .categoryName(p.getCategory() != null ? p.getCategory().getName() : "General")
                        .currentStock(qty)
                        .unitPrice(unitPrice)
                        .stockValue(stockValue)
                        .lastSaleDate(lastSale)
                        .daysDormant(days)
                        .build());
            }
        }

        items.sort(Comparator.comparing(ReportDTO.DeadStockItem::getStockValue).reversed());

        return ReportDTO.DeadStockReport.builder()
                .totalDormantProducts(items.size())
                .totalDormantStock(totalStock)
                .totalDormantValue(totalVal)
                .items(items)
                .build();
    }

    @Override
    public ReportDTO.BrandMarginReport getBrandMarginReport(LocalDate startDate, LocalDate endDate) {
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                .filter(o -> startDate == null || (o.getOrderDate() != null && !o.getOrderDate().isBefore(startDate)))
                .filter(o -> endDate == null || (o.getOrderDate() != null && !o.getOrderDate().isAfter(endDate)))
                .toList();

        Map<String, BrandAggregator> brandMap = new HashMap<>();

        for (Order o : orders) {
            if (o.getItems() != null) {
                for (OrderItem oi : o.getItems()) {
                    String brandName = (oi.getProduct() != null && oi.getProduct().getBrand() != null)
                            ? oi.getProduct().getBrand().getName()
                            : "Unbranded / General";
                    Long brandId = (oi.getProduct() != null && oi.getProduct().getBrand() != null)
                            ? oi.getProduct().getBrand().getId() : 0L;

                    int qty = oi.getQuantity() != null ? oi.getQuantity() : 1;
                    BigDecimal rev = oi.getLineTotal() != null ? oi.getLineTotal() : BigDecimal.ZERO;

                    BigDecimal costPerUnit = (oi.getProduct() != null && oi.getProduct().getPurchasePrice() != null)
                            ? oi.getProduct().getPurchasePrice()
                            : rev.multiply(BigDecimal.valueOf(0.70)).divide(BigDecimal.valueOf(Math.max(qty, 1)), 2, RoundingMode.HALF_UP);
                    BigDecimal totalCost = costPerUnit.multiply(BigDecimal.valueOf(qty));

                    brandMap.compute(brandName, (k, agg) -> {
                        if (agg == null) {
                            return new BrandAggregator(brandId, k, qty, rev, totalCost);
                        } else {
                            agg.unitsSold += qty;
                            agg.revenue = agg.revenue.add(rev);
                            agg.cost = agg.cost.add(totalCost);
                            return agg;
                        }
                    });
                }
            }
        }

        BigDecimal grandRev = BigDecimal.ZERO;
        BigDecimal grandCost = BigDecimal.ZERO;
        List<ReportDTO.BrandMarginItem> items = new ArrayList<>();

        for (BrandAggregator agg : brandMap.values()) {
            BigDecimal margin = agg.revenue.subtract(agg.cost);
            BigDecimal marginPct = agg.revenue.compareTo(BigDecimal.ZERO) > 0
                    ? margin.multiply(BigDecimal.valueOf(100)).divide(agg.revenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            grandRev = grandRev.add(agg.revenue);
            grandCost = grandCost.add(agg.cost);

            items.add(ReportDTO.BrandMarginItem.builder()
                    .brandId(agg.brandId)
                    .brandName(agg.brandName)
                    .unitsSold(agg.unitsSold)
                    .revenue(agg.revenue)
                    .costOfGoodsSold(agg.cost)
                    .grossMargin(margin)
                    .marginPercentage(marginPct)
                    .build());
        }

        items.sort(Comparator.comparing(ReportDTO.BrandMarginItem::getGrossMargin).reversed());

        BigDecimal grandMargin = grandRev.subtract(grandCost);
        BigDecimal grandPct = grandRev.compareTo(BigDecimal.ZERO) > 0
                ? grandMargin.multiply(BigDecimal.valueOf(100)).divide(grandRev, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return ReportDTO.BrandMarginReport.builder()
                .totalRevenue(grandRev)
                .totalCost(grandCost)
                .totalGrossMargin(grandMargin)
                .overallMarginPercentage(grandPct)
                .items(items)
                .build();
    }

    private static class BrandAggregator {
        Long brandId;
        String brandName;
        long unitsSold;
        BigDecimal revenue;
        BigDecimal cost;

        BrandAggregator(Long brandId, String brandName, long unitsSold, BigDecimal revenue, BigDecimal cost) {
            this.brandId = brandId;
            this.brandName = brandName;
            this.unitsSold = unitsSold;
            this.revenue = revenue;
            this.cost = cost;
        }
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
