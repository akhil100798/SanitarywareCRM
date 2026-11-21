package com.sanitaryware.crm.service.impl;

import com.sanitaryware.crm.dto.BackToBackPoPreviewDTO;
import com.sanitaryware.crm.dto.GenerateBackToBackPoRequestDTO;
import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.*;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import com.sanitaryware.crm.service.AuditService;
import com.sanitaryware.crm.service.BackToBackPoService;
import com.sanitaryware.crm.service.PurchaseOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BackToBackPoServiceImpl implements BackToBackPoService {

    private final QuotationRepository quotationRepository;
    private final DistributorRepository distributorRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public BackToBackPoPreviewDTO getBackToBackPreview(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));

        List<Distributor> activeDistributors = distributorRepository.findByIsActiveTrue();

        Map<String, List<QuotationItem>> brandGroups = new LinkedHashMap<>();
        Map<String, Long> brandIdMap = new HashMap<>();

        for (QuotationItem item : quotation.getItems()) {
            Product product = item.getProduct();
            String brandName = (product != null && product.getBrand() != null && product.getBrand().getName() != null)
                    ? product.getBrand().getName()
                    : "General / Multi-Brand";
            Long brandId = (product != null && product.getBrand() != null) ? product.getBrand().getId() : 0L;

            brandGroups.computeIfAbsent(brandName, k -> new ArrayList<>()).add(item);
            brandIdMap.putIfAbsent(brandName, brandId);
        }

        List<BackToBackPoPreviewDTO.SupplierPoGroupDTO> supplierGroups = new ArrayList<>();
        int totalDeficitCount = 0;
        BigDecimal grandProcurementTotal = BigDecimal.ZERO;

        for (Map.Entry<String, List<QuotationItem>> entry : brandGroups.entrySet()) {
            String brandName = entry.getKey();
            List<QuotationItem> itemsInGroup = entry.getValue();

            // Find best matching distributor for this brand
            Distributor matchedDistributor = null;
            for (Distributor d : activeDistributors) {
                if (d.getName() != null && (d.getName().toLowerCase().contains(brandName.toLowerCase()) || brandName.toLowerCase().contains(d.getName().toLowerCase()))) {
                    matchedDistributor = d;
                    break;
                }
            }
            if (matchedDistributor == null && !activeDistributors.isEmpty()) {
                matchedDistributor = activeDistributors.get(0);
            }

            BigDecimal groupSubtotal = BigDecimal.ZERO;
            List<BackToBackPoPreviewDTO.BackToBackItemDTO> itemDTOs = new ArrayList<>();

            for (QuotationItem item : itemsInGroup) {
                Product product = item.getProduct();
                int requestedQty = item.getQuantity() != null ? item.getQuantity() : 1;
                int currentStock = (product != null && product.getStockQuantity() != null) ? product.getStockQuantity() : 0;
                int deficit = Math.max(0, requestedQty - currentStock);
                int recommendedOrderQty = deficit > 0 ? deficit : requestedQty;

                if (deficit > 0) {
                    totalDeficitCount++;
                }

                BigDecimal unitCost = BigDecimal.ZERO;
                if (product != null) {
                    if (product.getPurchasePrice() != null && product.getPurchasePrice().compareTo(BigDecimal.ZERO) > 0) {
                        unitCost = product.getPurchasePrice();
                    } else if (product.getMrp() != null && product.getMrp().compareTo(BigDecimal.ZERO) > 0) {
                        unitCost = product.getMrp().multiply(new BigDecimal("0.70"));
                    } else if (product.getSellingPrice() != null) {
                        unitCost = product.getSellingPrice().multiply(new BigDecimal("0.75"));
                    }
                }

                BigDecimal lineProcurementCost = unitCost.multiply(BigDecimal.valueOf(recommendedOrderQty));
                groupSubtotal = groupSubtotal.add(lineProcurementCost);

                String primaryImage = null;
                if (product != null && product.getImages() != null && !product.getImages().isEmpty()) {
                    primaryImage = product.getImages().get(0).getImageUrl();
                }

                itemDTOs.add(BackToBackPoPreviewDTO.BackToBackItemDTO.builder()
                        .quotationItemId(item.getId())
                        .productId(product != null ? product.getId() : null)
                        .productSku(product != null ? product.getSku() : item.getBarcode())
                        .productName(product != null ? product.getName() : "Item #" + item.getId())
                        .brandName(brandName)
                        .requestedQuantity(requestedQty)
                        .currentStock(currentStock)
                        .deficitQuantity(deficit)
                        .recommendedOrderQuantity(recommendedOrderQty)
                        .unitCost(unitCost)
                        .sellingPrice(item.getUnitPrice())
                        .gstRate(item.getGstRate() != null ? item.getGstRate() : (product != null ? product.getGstRate() : new BigDecimal("18.0")))
                        .hsnCode(item.getHsnCode() != null ? item.getHsnCode() : (product != null ? product.getHsnCode() : null))
                        .barcode(item.getBarcode() != null ? item.getBarcode() : (product != null ? product.getBarcode() : null))
                        .primaryImageUrl(primaryImage)
                        .build());
            }

            grandProcurementTotal = grandProcurementTotal.add(groupSubtotal);

            supplierGroups.add(BackToBackPoPreviewDTO.SupplierPoGroupDTO.builder()
                    .brandId(brandIdMap.get(brandName))
                    .brandName(brandName)
                    .suggestedDistributorId(matchedDistributor != null ? matchedDistributor.getId() : null)
                    .suggestedDistributorName(matchedDistributor != null ? matchedDistributor.getName() : "Select Supplier")
                    .items(itemDTOs)
                    .estimatedGroupSubtotal(groupSubtotal)
                    .build());
        }

        return BackToBackPoPreviewDTO.builder()
                .quotationId(quotation.getId())
                .quotationNumber(quotation.getQuotationNumber())
                .customerId(quotation.getCustomer() != null ? quotation.getCustomer().getId() : null)
                .customerName(quotation.getCustomer() != null ? quotation.getCustomer().getName() : "Customer")
                .quotationStatus(quotation.getStatus() != null ? quotation.getStatus().name() : "DRAFT")
                .totalLineItems(quotation.getItems().size())
                .totalDeficitItems(totalDeficitCount)
                .estimatedTotalProcurementCost(grandProcurementTotal)
                .supplierGroups(supplierGroups)
                .build();
    }

    @Override
    @Transactional
    public List<PurchaseOrderDTO> generatePurchaseOrders(Long quotationId, GenerateBackToBackPoRequestDTO request) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));

        List<PurchaseOrderDTO> createdOrders = new ArrayList<>();

        for (GenerateBackToBackPoRequestDTO.PoGroupRequestDTO group : request.getGroups()) {
            if (group.getItems() == null || group.getItems().isEmpty()) {
                continue;
            }

            PurchaseOrderDTO poDto = new PurchaseOrderDTO();
            poDto.setDistributorId(group.getDistributorId());
            poDto.setOrderDate(group.getOrderDate() != null ? group.getOrderDate() : LocalDate.now());
            poDto.setExpectedDeliveryDate(group.getExpectedDeliveryDate() != null ? group.getExpectedDeliveryDate() : LocalDate.now().plusDays(5));
            poDto.setStatus(group.getStatus() != null && !group.getStatus().isBlank() ? group.getStatus() : "DRAFT");

            String defaultNotes = "Back-to-back procurement for Quotation " + quotation.getQuotationNumber()
                    + " (Customer: " + (quotation.getCustomer() != null ? quotation.getCustomer().getName() : "Client") + ")";
            poDto.setNotes((group.getNotes() != null && !group.getNotes().isBlank()) ? group.getNotes() : defaultNotes);
            poDto.setItems(group.getItems());

            PurchaseOrderDTO savedPo = purchaseOrderService.createPurchaseOrder(poDto);
            createdOrders.add(savedPo);
        }

        String poNumbers = createdOrders.stream()
                .map(PurchaseOrderDTO::getPoNumber)
                .collect(Collectors.joining(", "));

        log.info("Successfully generated {} Back-to-Back Purchase Orders ({}) for Quotation {}",
                createdOrders.size(), poNumbers, quotation.getQuotationNumber());

        auditService.logEvent("GENERATE_PO", "QUOTATION", quotationId,
                "Generated " + createdOrders.size() + " Back-to-Back Purchase Orders: " + poNumbers);

        return createdOrders;
    }
}
