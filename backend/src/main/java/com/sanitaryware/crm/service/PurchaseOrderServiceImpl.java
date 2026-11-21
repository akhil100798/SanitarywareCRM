package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.entity.PurchaseOrderItem;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.PurchaseOrderMapper;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DistributorRepository distributorRepository;
    private final ProductRepository productRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PdfGeneratorService pdfGeneratorService;
    private final AuditService auditService;
    private final PurchaseOrderLockService locks;
    private final InventoryService inventoryService;
    private final FinancialConsistencyService financialConsistency;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PurchaseOrderDTO createPurchaseOrder(PurchaseOrderDTO dto) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("Purchase order must contain at least one item line");
        }
        if (dto.getExpectedDeliveryDate() != null && dto.getOrderDate() != null) {
            if (dto.getExpectedDeliveryDate().isBefore(dto.getOrderDate())) {
                throw new IllegalArgumentException("Expected delivery date cannot precede order date");
            }
        }
        Distributor distributor = resolveDistributor(dto.getDistributorId());
        PurchaseOrder po = purchaseOrderMapper.toEntity(dto);
        po.setDistributor(distributor);
        PurchaseOrder.POStatus requestedStatus = requestedStatus(dto.getStatus(), po.getStatus());
        if (requestedStatus == PurchaseOrder.POStatus.RECEIVED) po.setStatus(PurchaseOrder.POStatus.DRAFT);
        
        if (po.getPoNumber() == null || po.getPoNumber().isEmpty()) {
            po.setPoNumber(generatePoNumber());
        }

        if (po.getOrderDate() == null) {
            po.setOrderDate(LocalDate.now());
        }

        if (dto.getItems() != null) {
            List<PurchaseOrderItem> items = dto.getItems().stream()
                    .map(itemDTO -> {
                        Product product = resolveProduct(itemDTO.getProductId());
                        if (itemDTO.getUnitCost() == null) {
                            BigDecimal defaultCost = product.getPurchasePrice() != null
                                    ? product.getPurchasePrice()
                                    : product.getSellingPrice();
                            itemDTO.setUnitCost(defaultCost != null ? defaultCost : BigDecimal.ZERO);
                        }
                        PurchaseOrderItem item = purchaseOrderMapper.toItemEntity(itemDTO, po);
                        item.setProduct(product);
                        if (item.getBarcode() == null) item.setBarcode(product.getBarcode());
                        if (item.getHsnCode() == null) item.setHsnCode(product.getHsnCode());
                        if (item.getGstRate() == null) item.setGstRate(product.getGstRate());
                        return item;
                    })
                    .collect(Collectors.toList());
            po.setItems(items);
        }

        po.calculateTotal();
        PurchaseOrder savedPo = purchaseOrderRepository.save(po);
        if (requestedStatus == PurchaseOrder.POStatus.RECEIVED) {
            purchaseOrderRepository.flush();
            return receivePurchaseOrder(savedPo.getId());
        }

        auditService.logEvent("CREATE", "PURCHASE_ORDER", savedPo.getId(),
                "Created Purchase Order " + savedPo.getPoNumber() + " with total Rs. " + savedPo.getTotal());

        return purchaseOrderMapper.toDTO(savedPo);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PurchaseOrderDTO updatePurchaseOrder(Long id, PurchaseOrderDTO dto) {
        PurchaseOrder existingPo = locks.purchaseOrder(id, dto.getDistributorId());
        financialConsistency.requireConsistent(existingPo);

        if (existingPo.getStatus() == PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot update an already received Purchase Order");
        }
        if (existingPo.getStatus() == PurchaseOrder.POStatus.CANCELLED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot update a cancelled Purchase Order");
        }
        if (dto.getExpectedDeliveryDate() != null && dto.getOrderDate() != null) {
            if (dto.getExpectedDeliveryDate().isBefore(dto.getOrderDate())) {
                throw new IllegalArgumentException("Expected delivery date cannot precede order date");
            }
        }

        Distributor distributor = dto.getDistributorId() == null
                ? existingPo.getDistributor()
                : resolveDistributor(dto.getDistributorId());
        if (!distributor.getId().equals(existingPo.getDistributor().getId()) && existingPo.getPaidAmount().signum() > 0) {
            throw new com.sanitaryware.crm.exception.ConflictException("Reverse purchase order payments before changing its supplier.");
        }
        PurchaseOrder.POStatus oldStatus = existingPo.getStatus();
        PurchaseOrder.POStatus targetStatus = requestedStatus(dto.getStatus(), oldStatus);
        requireCancellable(existingPo, targetStatus);

        List<PurchaseOrderItem> updatedItems = null;
        if (dto.getItems() != null) {
            updatedItems = dto.getItems().stream()
                    .map(itemDTO -> {
                        Product product = resolveProduct(itemDTO.getProductId());
                        if (itemDTO.getUnitCost() == null) {
                            BigDecimal defaultCost = product.getPurchasePrice() != null
                                    ? product.getPurchasePrice()
                                    : product.getSellingPrice();
                            itemDTO.setUnitCost(defaultCost != null ? defaultCost : BigDecimal.ZERO);
                        }
                        PurchaseOrderItem item = purchaseOrderMapper.toItemEntity(itemDTO, existingPo);
                        item.setProduct(product);
                        if (item.getBarcode() == null) item.setBarcode(product.getBarcode());
                        if (item.getHsnCode() == null) item.setHsnCode(product.getHsnCode());
                        if (item.getGstRate() == null) item.setGstRate(product.getGstRate());
                        return item;
                    })
                    .collect(Collectors.toList());
        }

        purchaseOrderMapper.updateEntity(existingPo, dto);
        existingPo.setStatus(targetStatus == PurchaseOrder.POStatus.RECEIVED ? oldStatus : targetStatus);
        existingPo.setDistributor(distributor);

        if (updatedItems != null) {
            existingPo.getItems().clear();
            existingPo.getItems().addAll(updatedItems);
        }

        existingPo.calculateTotal();
        financialConsistency.requirePayableTotal(existingPo.getTotal(), existingPo.getPaidAmount());
        PurchaseOrder updatedPo = purchaseOrderRepository.save(existingPo);
        if (targetStatus == PurchaseOrder.POStatus.RECEIVED) {
            purchaseOrderRepository.flush();
            return receivePurchaseOrder(updatedPo.getId());
        }

        auditService.logEvent("UPDATE", "PURCHASE_ORDER", updatedPo.getId(),
                "Updated Purchase Order " + updatedPo.getPoNumber() + " (total Rs. " + updatedPo.getTotal() + ")");

        return purchaseOrderMapper.toDTO(updatedPo);
    }

    @Override
    public PurchaseOrderDTO getPurchaseOrderById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));
        return purchaseOrderMapper.toDTO(po);
    }

    @Override
    public Page<PurchaseOrderDTO> getAllPurchaseOrders(Pageable pageable) {
        return purchaseOrderRepository.findAll(pageable).map(purchaseOrderMapper::toDTO);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void deletePurchaseOrder(Long id) {
        PurchaseOrder po = locks.purchaseOrder(id, null);
        financialConsistency.requireConsistent(po);
        if (po.getPaidAmount().signum() > 0) {
            throw new com.sanitaryware.crm.exception.ConflictException("Reverse purchase order payments before deleting it.");
        }
        
        if (po.getStatus() == PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot delete an already received Purchase Order");
        }

        purchaseOrderRepository.delete(po);

        auditService.logEvent("DELETE", "PURCHASE_ORDER", id,
                "Deleted Purchase Order " + po.getPoNumber());
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PurchaseOrderDTO updateStatus(Long id, String statusString) {
        if (statusString == null || statusString.trim().isEmpty()) {
            throw new IllegalArgumentException("Status string cannot be empty");
        }

        PurchaseOrder.POStatus newStatus;
        try {
            newStatus = PurchaseOrder.POStatus.valueOf(statusString.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + statusString);
        }

        if (newStatus == PurchaseOrder.POStatus.RECEIVED) {
            return receivePurchaseOrder(id);
        }

        PurchaseOrder po = locks.purchaseOrder(id, null);
        financialConsistency.requireConsistent(po);

        if (po.getStatus() == PurchaseOrder.POStatus.RECEIVED && newStatus != PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot change status of an already received Purchase Order");
        }

        if (po.getStatus() == PurchaseOrder.POStatus.CANCELLED && newStatus != PurchaseOrder.POStatus.CANCELLED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot change status of a cancelled Purchase Order");
        }
        requireCancellable(po, newStatus);
        po.setStatus(newStatus);
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        auditService.logEvent("STATUS_CHANGE", "PURCHASE_ORDER", id,
                "Changed status of Purchase Order " + po.getPoNumber() + " to " + newStatus);

        return purchaseOrderMapper.toDTO(saved);
    }

    @Override
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PurchaseOrderDTO receivePurchaseOrder(Long id) {
        PurchaseOrder po = locks.purchaseOrder(id, null);
        financialConsistency.requireConsistent(po);

        if (po.getStatus() == PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Purchase Order has already been received");
        }
        if (po.getStatus() == PurchaseOrder.POStatus.CANCELLED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot receive a cancelled Purchase Order");
        }
        if (po.getItems() == null || po.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot receive Purchase Order without line items");
        }

        Map<Long, Integer> incoming = new TreeMap<>();
        for (PurchaseOrderItem item : po.getItems()) {
            Product product = item.getProduct();
            if (product == null) {
                throw new ResourceNotFoundException("Product reference missing on line item");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new IllegalArgumentException("Invalid quantity for product: " + product.getName());
            }
            if (item.getReceivedQuantity() != null && item.getReceivedQuantity() < 0) {
                throw new IllegalArgumentException("Received quantity cannot be negative for product: " + product.getName());
            }
            int incomingQty = (item.getReceivedQuantity() != null && item.getReceivedQuantity() > 0)
                    ? item.getReceivedQuantity()
                    : item.getQuantity();
            if (incomingQty > item.getQuantity()) {
                throw new IllegalArgumentException("Received quantity cannot exceed the ordered quantity");
            }
            incoming.merge(product.getId(), incomingQty, InventoryService::addQuantities);
            item.setReceivedQuantity(incomingQty);
        }
        inventoryService.changeStock(incoming);
        for (PurchaseOrderItem item : po.getItems()) {
            Product product = item.getProduct();
            if (item.getUnitCost() != null && item.getUnitCost().signum() >= 0) product.setPurchasePrice(item.getUnitCost());
        }

        if (po.getReceivedDate() == null) {
            po.setReceivedDate(LocalDate.now());
        }

        Distributor distributor = po.getDistributor();
        if (distributor != null) {
            BigDecimal currentBalance = distributor.getOutstandingBalance() != null ? distributor.getOutstandingBalance() : BigDecimal.ZERO;
            distributor.setOutstandingBalance(currentBalance.add(po.getTotal()));
            distributorRepository.save(distributor);
        }

        po.setStatus(PurchaseOrder.POStatus.RECEIVED);
        PurchaseOrder savedPo = purchaseOrderRepository.save(po);

        auditService.logEvent("RECEIVE_PO", "PURCHASE_ORDER", savedPo.getId(),
                "Received Purchase Order " + savedPo.getPoNumber() + " with total Rs. " + savedPo.getTotal() + " (updated stock and distributor balance)");

        return purchaseOrderMapper.toDTO(savedPo);
    }

    @Override
    public List<PurchaseOrderDTO> getPurchaseOrdersByDistributor(Long distributorId) {
        return purchaseOrderRepository.findByDistributorId(distributorId).stream()
                .map(purchaseOrderMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public byte[] getPurchaseOrderPdf(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));
        return pdfGeneratorService.generatePurchaseOrderPdf(po);
    }

    @Override
    public String generatePoNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "PO-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempts = 0; attempts < 10; attempts++) {
            String random = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String candidate = prefix + "-" + random;
            if (purchaseOrderRepository.findByPoNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + now.format(DateTimeFormatter.ofPattern("HHmmssSSS"));
    }

    private Distributor resolveDistributor(Long distributorId) {
        if (distributorId == null) {
            throw new ResourceNotFoundException("Distributor not found");
        }
        return locks.distributor(distributorId);
    }

    private PurchaseOrder.POStatus requestedStatus(String status, PurchaseOrder.POStatus fallback) {
        return status == null || status.isBlank() ? fallback : PurchaseOrder.POStatus.valueOf(status.trim().toUpperCase(java.util.Locale.ROOT));
    }

    private void requireCancellable(PurchaseOrder order, PurchaseOrder.POStatus target) {
        if (target == PurchaseOrder.POStatus.CANCELLED && order.getPaidAmount().signum() > 0) {
            throw new com.sanitaryware.crm.exception.ConflictException("Reverse purchase order payments before cancelling it.");
        }
    }

    private Product resolveProduct(Long productId) {
        if (productId == null) {
            throw new ResourceNotFoundException("Product not found");
        }
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with id: " + productId));
    }
}
