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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DistributorRepository distributorRepository;
    private final ProductRepository productRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public PurchaseOrderDTO createPurchaseOrder(PurchaseOrderDTO dto) {
        Distributor distributor = resolveDistributor(dto.getDistributorId());
        PurchaseOrder po = purchaseOrderMapper.toEntity(dto);
        po.setDistributor(distributor);
        
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
        return purchaseOrderMapper.toDTO(savedPo);
    }

    @Override
    @Transactional
    public PurchaseOrderDTO updatePurchaseOrder(Long id, PurchaseOrderDTO dto) {
        PurchaseOrder existingPo = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));

        Distributor distributor = dto.getDistributorId() == null
                ? existingPo.getDistributor()
                : resolveDistributor(dto.getDistributorId());

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
        existingPo.setDistributor(distributor);

        if (updatedItems != null) {
            existingPo.getItems().clear();
            existingPo.getItems().addAll(updatedItems);
        }

        existingPo.calculateTotal();
        PurchaseOrder updatedPo = purchaseOrderRepository.save(existingPo);
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
    @Transactional
    public void deletePurchaseOrder(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));
        
        purchaseOrderRepository.delete(po);
    }

    @Override
    @Transactional
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

        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));

        if (po.getStatus() == PurchaseOrder.POStatus.RECEIVED && newStatus != PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot change status of an already received Purchase Order");
        }

        po.setStatus(newStatus);
        return purchaseOrderMapper.toDTO(purchaseOrderRepository.save(po));
    }

    @Override
    @Transactional
    public PurchaseOrderDTO receivePurchaseOrder(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));

        if (po.getStatus() == PurchaseOrder.POStatus.RECEIVED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Purchase Order has already been received");
        }
        if (po.getStatus() == PurchaseOrder.POStatus.CANCELLED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot receive a cancelled Purchase Order");
        }
        if (po.getItems() == null || po.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cannot receive Purchase Order without line items");
        }

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

            int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            product.setStockQuantity(currentStock + incomingQty);

            if (item.getUnitCost() != null && item.getUnitCost().compareTo(BigDecimal.ZERO) >= 0) {
                product.setPurchasePrice(item.getUnitCost());
            }

            item.setReceivedQuantity(incomingQty);
            productRepository.save(product);
        }

        if (po.getReceivedDate() == null) {
            po.setReceivedDate(LocalDate.now());
        }

        Distributor distributor = po.getDistributor();
        if (distributor != null) {
            BigDecimal currentBalance = distributor.getOutstandingBalance() != null ? distributor.getOutstandingBalance() : BigDecimal.ZERO;
            BigDecimal poBalance = po.getBalanceAmount() != null ? po.getBalanceAmount() : BigDecimal.ZERO;
            distributor.setOutstandingBalance(currentBalance.add(poBalance));
            distributorRepository.save(distributor);
        }

        po.setStatus(PurchaseOrder.POStatus.RECEIVED);
        PurchaseOrder savedPo = purchaseOrderRepository.save(po);
        return purchaseOrderMapper.toDTO(savedPo);
    }

    @Override
    public List<PurchaseOrderDTO> getPurchaseOrdersByDistributor(Long distributorId) {
        return purchaseOrderRepository.findByDistributorId(distributorId).stream()
                .map(purchaseOrderMapper::toDTO)
                .collect(Collectors.toList());
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
        return distributorRepository.findById(distributorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Distributor not found with id: " + distributorId));
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
