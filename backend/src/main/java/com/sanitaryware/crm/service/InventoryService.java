package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.OrderItem;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service @RequiredArgsConstructor
public class InventoryService {
    private final ProductRepository productRepository;
    private final EntityManager entityManager;

    public Map<Long, Integer> quantities(List<OrderItem> items) {
        Map<Long, Integer> result = new TreeMap<>();
        if (items == null) return result;
        for (OrderItem item : items) {
            if (item.getProduct() == null || item.getProduct().getId() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new com.sanitaryware.crm.exception.BusinessValidationException("Order items require a product and a positive quantity");
            }
            result.merge(item.getProduct().getId(), item.getQuantity(), InventoryService::addQuantities);
        }
        return result;
    }

    public void changeReservation(Map<Long, Integer> before, Map<Long, Integer> after) {
        Map<Long, Integer> deltas = new TreeMap<>(before);
        after.forEach((id, quantity) -> deltas.merge(id, -quantity, InventoryService::addQuantities));
        changeStock(deltas);
    }

    /** Positive deltas are incoming stock, negative deltas are reservations. */
    public void changeStock(Map<Long, Integer> deltas) {
        // Every stock writer takes product locks in ascending ID order.
        for (Map.Entry<Long, Integer> entry : new TreeMap<>(deltas).entrySet()) {
            int delta = entry.getValue();
            if (delta == 0) continue;
            Product product = productRepository.findByIdForUpdate(entry.getKey())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + entry.getKey()));
            // A mapper may already have loaded this product before the lock was
            // acquired. Refresh under the lock rather than using that stale copy.
            entityManager.refresh(product, LockModeType.PESSIMISTIC_WRITE);
            int available = product.getStockQuantity() == null ? 0 : product.getStockQuantity();
            if ((long) available + delta < 0) {
                throw new com.sanitaryware.crm.exception.BusinessValidationException("Insufficient stock for product " + product.getSku()
                        + ". Available: " + available + ", requested: " + (-delta));
            }
            product.setStockQuantity(addQuantities(available, delta));
            productRepository.save(product);
        }
    }

    static int addQuantities(int first, int second) {
        long result = (long) first + second;
        if (result > Integer.MAX_VALUE || result < Integer.MIN_VALUE) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Combined stock quantity exceeds the supported range");
        }
        return (int) result;
    }
}
