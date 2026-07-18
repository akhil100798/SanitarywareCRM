package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.PurchaseOrderDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.PurchaseOrderMapper;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceImplTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private DistributorRepository distributorRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private PurchaseOrderMapper purchaseOrderMapper;

    private PurchaseOrderServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PurchaseOrderServiceImpl(
                purchaseOrderRepository, distributorRepository, productRepository, purchaseOrderMapper);
    }

    @Test
    void createPurchaseOrder_WithMissingDistributor_ThrowsResourceNotFound_AndDoesNotSave() {
        PurchaseOrderDTO request = purchaseOrderRequest(999L, 10L);
        when(distributorRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createPurchaseOrder(request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(purchaseOrderRepository, never()).save(any(PurchaseOrder.class));
        verify(productRepository, never()).findById(any());
    }

    @Test
    void createPurchaseOrder_WithMissingProduct_ThrowsResourceNotFound_AndDoesNotSave() {
        Distributor distributor = distributor(1L);
        PurchaseOrderDTO request = purchaseOrderRequest(1L, 999L);
        when(distributorRepository.findById(1L)).thenReturn(Optional.of(distributor));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createPurchaseOrder(request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(purchaseOrderRepository, never()).save(any(PurchaseOrder.class));
    }

    @Test
    void updatePurchaseOrder_WithMissingDistributor_ThrowsResourceNotFound_AndDoesNotSave() {
        PurchaseOrder existing = existingPurchaseOrder(55L, distributor(1L));
        PurchaseOrderDTO request = purchaseOrderRequest(999L, 10L);
        request.setItems(null);
        when(purchaseOrderRepository.findById(55L)).thenReturn(Optional.of(existing));
        when(distributorRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updatePurchaseOrder(55L, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(purchaseOrderRepository, never()).save(any(PurchaseOrder.class));
    }

    @Test
    void updatePurchaseOrder_WithMissingProduct_ThrowsResourceNotFound_AndDoesNotSave() {
        Distributor distributor = distributor(1L);
        PurchaseOrder existing = existingPurchaseOrder(55L, distributor);
        PurchaseOrderDTO request = purchaseOrderRequest(1L, 999L);
        when(purchaseOrderRepository.findById(55L)).thenReturn(Optional.of(existing));
        when(distributorRepository.findById(1L)).thenReturn(Optional.of(distributor));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updatePurchaseOrder(55L, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(purchaseOrderRepository, never()).save(any(PurchaseOrder.class));
    }

    @Test
    void validPurchaseOrder_ResolvesDistributorAndProducts_AndSaves() {
        Distributor distributor = distributor(1L);
        Product product = product(10L);
        PurchaseOrderDTO request = purchaseOrderRequest(1L, 10L);
        when(distributorRepository.findById(1L)).thenReturn(Optional.of(distributor));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(purchaseOrderRepository.findByPoNumber(any())).thenReturn(Optional.empty());
        when(purchaseOrderRepository.save(any(PurchaseOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrderDTO result = service.createPurchaseOrder(request);

        ArgumentCaptor<PurchaseOrder> captor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(captor.capture());
        PurchaseOrder saved = captor.getValue();
        assertThat(saved.getDistributor()).isSameAs(distributor);
        assertThat(saved.getItems()).hasSize(1);
        assertThat(saved.getItems().get(0).getProduct()).isSameAs(product);
        assertThat(result.getDistributorId()).isEqualTo(1L);
        assertThat(result.getItems().get(0).getProductId()).isEqualTo(10L);
    }

    private PurchaseOrderDTO purchaseOrderRequest(Long distributorId, Long productId) {
        PurchaseOrderDTO.PurchaseOrderItemDTO item = new PurchaseOrderDTO.PurchaseOrderItemDTO();
        item.setProductId(productId);
        item.setQuantity(2);
        item.setUnitCost(new BigDecimal("150.00"));

        PurchaseOrderDTO request = new PurchaseOrderDTO();
        request.setDistributorId(distributorId);
        request.setTaxPercentage(BigDecimal.ZERO);
        request.setItems(List.of(item));
        return request;
    }

    private PurchaseOrder existingPurchaseOrder(Long id, Distributor distributor) {
        PurchaseOrder purchaseOrder = new PurchaseOrder();
        purchaseOrder.setId(id);
        purchaseOrder.setPoNumber("PO-EXISTING");
        purchaseOrder.setDistributor(distributor);
        purchaseOrder.setItems(new ArrayList<>());
        return purchaseOrder;
    }

    private Distributor distributor(Long id) {
        Distributor distributor = new Distributor();
        distributor.setId(id);
        distributor.setName("Reference Distributor");
        distributor.setPhoneNumber("9000000000");
        return distributor;
    }

    private Product product(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setName("Reference Product");
        product.setSku("REF-001");
        return product;
    }
}
