package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.TreeSet;

/** Supplier writers share the lock order: distributors, PO, receipt, products. */
@Service @RequiredArgsConstructor
public class PurchaseOrderLockService {
    private final DistributorRepository distributors;
    private final PurchaseOrderRepository purchaseOrders;
    private final EntityManager entityManager;

    public Distributor distributor(Long id) {
        if (id == null) throw new ResourceNotFoundException("Distributor not found");
        Distributor distributor = distributors.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Distributor not found with id: " + id));
        entityManager.refresh(distributor, LockModeType.PESSIMISTIC_WRITE);
        return distributor;
    }

    public PurchaseOrder purchaseOrder(Long id, Long targetDistributorId) {
        Long owner = purchaseOrders.findDistributorIdById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));
        TreeSet<Long> owners = new TreeSet<>();
        owners.add(owner);
        if (targetDistributorId != null) owners.add(targetDistributorId);
        owners.forEach(this::distributor);
        PurchaseOrder order = purchaseOrders.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id: " + id));
        entityManager.refresh(order, LockModeType.PESSIMISTIC_WRITE);
        if (!owner.equals(order.getDistributor().getId())) {
            throw new ConflictException("The purchase order supplier changed. Refresh and retry.");
        }
        return order;
    }
}
