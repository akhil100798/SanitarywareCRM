package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.entity.PurchaseOrderItem;
import com.sanitaryware.crm.mapper.PurchaseOrderMapper;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        PurchaseOrder po = purchaseOrderMapper.toEntity(dto);
        
        if (po.getPoNumber() == null || po.getPoNumber().isEmpty()) {
            po.setPoNumber(generatePoNumber());
        }

        if (po.getOrderDate() == null) {
            po.setOrderDate(LocalDate.now());
        }

        if (dto.getItems() != null) {
            List<PurchaseOrderItem> items = dto.getItems().stream()
                    .map(itemDTO -> purchaseOrderMapper.toItemEntity(itemDTO, po))
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
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with id: " + id));

        purchaseOrderMapper.updateEntity(existingPo, dto);

        if (dto.getItems() != null) {
            existingPo.getItems().clear();
            List<PurchaseOrderItem> updatedItems = dto.getItems().stream()
                    .map(itemDTO -> purchaseOrderMapper.toItemEntity(itemDTO, existingPo))
                    .collect(Collectors.toList());
            existingPo.getItems().addAll(updatedItems);
        }

        existingPo.calculateTotal();
        PurchaseOrder updatedPo = purchaseOrderRepository.save(existingPo);
        return purchaseOrderMapper.toDTO(updatedPo);
    }

    @Override
    public PurchaseOrderDTO getPurchaseOrderById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with id: " + id));
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
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with id: " + id));
        
        purchaseOrderRepository.delete(po);
    }

    @Override
    @Transactional
    public PurchaseOrderDTO updateStatus(Long id, String statusString) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Order not found with id: " + id));
        
        PurchaseOrder.POStatus newStatus = PurchaseOrder.POStatus.valueOf(statusString.toUpperCase());
        PurchaseOrder.POStatus oldStatus = po.getStatus();
        
        // Stock Update Logic when moving to RECEIVED
        if ((newStatus == PurchaseOrder.POStatus.RECEIVED || newStatus == PurchaseOrder.POStatus.PARTIALLY_RECEIVED) 
            && oldStatus != PurchaseOrder.POStatus.RECEIVED && oldStatus != PurchaseOrder.POStatus.PARTIALLY_RECEIVED) {
            
            // Iterate over items and increase product stock, also update purchase price
            for (PurchaseOrderItem item : po.getItems()) {
                Product product = item.getProduct();
                if (item.getReceivedQuantity() < 0) {
                    throw new IllegalArgumentException("Received quantity cannot be negative for product: " + product.getName());
                }
                int incomingQty = item.getReceivedQuantity() > 0 ? item.getReceivedQuantity() : item.getQuantity();
                
                product.setStockQuantity(product.getStockQuantity() + incomingQty);
                
                // Update purchase price based on this latest PO
                if (item.getUnitCost() != null) {
                    product.setPurchasePrice(item.getUnitCost());
                }
                
                item.setReceivedQuantity(incomingQty);
                productRepository.save(product);
            }
            
            if (po.getReceivedDate() == null) {
                po.setReceivedDate(LocalDate.now());
            }

            // Update Distributor outstanding balance
            Distributor distributor = po.getDistributor();
            
            // Need to update the total outstanding balance for this distributor based on this new bill
            // The balance will increase by the new PO total
            distributor.setOutstandingBalance(distributor.getOutstandingBalance().add(po.getBalanceAmount()));
            distributorRepository.save(distributor);
        }
        
        po.setStatus(newStatus);
        return purchaseOrderMapper.toDTO(purchaseOrderRepository.save(po));
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
}
