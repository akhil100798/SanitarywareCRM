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

    @Test
    void createPurchaseOrder_WhenUnitCostNull_UsesProductPurchasePrice() {
        Distributor distributor = distributor(1L);
        Product product = product(10L);
        product.setPurchasePrice(new BigDecimal("350.00"));
        product.setSellingPrice(new BigDecimal("500.00"));
        product.setBarcode("8901234567890");
        product.setHsnCode("69101000");

        PurchaseOrderDTO request = purchaseOrderRequest(1L, 10L);
        request.getItems().get(0).setUnitCost(null); // No unit cost supplied

        when(distributorRepository.findById(1L)).thenReturn(Optional.of(distributor));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(purchaseOrderRepository.findByPoNumber(any())).thenReturn(Optional.empty());
        when(purchaseOrderRepository.save(any(PurchaseOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrderDTO result = service.createPurchaseOrder(request);

        assertThat(result.getItems().get(0).getUnitCost()).isEqualByComparingTo(new BigDecimal("350.00"));
        assertThat(result.getItems().get(0).getBarcode()).isEqualTo("8901234567890");
        assertThat(result.getItems().get(0).getHsnCode()).isEqualTo("69101000");
    }

    @Test
    void createPurchaseOrder_WhenUnitCostAndPurchasePriceNull_FallsBackToSellingPrice() {
        Distributor distributor = distributor(1L);
        Product product = product(10L);
        product.setPurchasePrice(null);
        product.setSellingPrice(new BigDecimal("450.00"));

        PurchaseOrderDTO request = purchaseOrderRequest(1L, 10L);
        request.getItems().get(0).setUnitCost(null);

        when(distributorRepository.findById(1L)).thenReturn(Optional.of(distributor));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(purchaseOrderRepository.findByPoNumber(any())).thenReturn(Optional.empty());
        when(purchaseOrderRepository.save(any(PurchaseOrder.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrderDTO result = service.createPurchaseOrder(request);

        assertThat(result.getItems().get(0).getUnitCost()).isEqualByComparingTo(new BigDecimal("450.00"));
    }

    @Test
    void receivePurchaseOrder_IncrementsProductStockAtomically() {
        Distributor distributor = distributor(1L);
        distributor.setOutstandingBalance(new BigDecimal("1000.00"));

        Product product = product(10L);
        product.setStockQuantity(20);

        PurchaseOrder existing = existingPurchaseOrder(55L, distributor);
        existing.setStatus(PurchaseOrder.POStatus.ORDERED);
        existing.setTotal(new BigDecimal("500.00"));
        existing.setPaidAmount(BigDecimal.ZERO);
        existing.setBalanceAmount(new BigDecimal("500.00"));

        com.sanitaryware.crm.entity.PurchaseOrderItem item = new com.sanitaryware.crm.entity.PurchaseOrderItem();
        item.setId(101L);
        item.setPurchaseOrder(existing);
        item.setProduct(product);
        item.setQuantity(15);
        item.setUnitCost(new BigDecimal("30.00"));
        item.calculateLineTotal();
        existing.setItems(List.of(item));

        when(purchaseOrderRepository.findById(55L)).thenReturn(Optional.of(existing));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        PurchaseOrderDTO result = service.receivePurchaseOrder(55L);

        assertThat(result.getStatus()).isEqualTo("RECEIVED");
        assertThat(product.getStockQuantity()).isEqualTo(35); // 20 + 15
        assertThat(product.getPurchasePrice()).isEqualByComparingTo(new BigDecimal("30.00"));
        assertThat(distributor.getOutstandingBalance()).isEqualByComparingTo(new BigDecimal("1500.00"));
        verify(productRepository).save(product);
        verify(distributorRepository).save(distributor);
    }

    @Test
    void receivePurchaseOrder_AlreadyReceived_ThrowsConflictException() {
        PurchaseOrder existing = existingPurchaseOrder(55L, distributor(1L));
        existing.setStatus(PurchaseOrder.POStatus.RECEIVED);

        when(purchaseOrderRepository.findById(55L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.receivePurchaseOrder(55L))
                .isInstanceOf(com.sanitaryware.crm.exception.ConflictException.class)
                .hasMessageContaining("already been received");

        verify(productRepository, never()).save(any());
    }

    @Test
    void receivePurchaseOrder_Cancelled_ThrowsConflictException() {
        PurchaseOrder existing = existingPurchaseOrder(55L, distributor(1L));
        existing.setStatus(PurchaseOrder.POStatus.CANCELLED);

        when(purchaseOrderRepository.findById(55L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.receivePurchaseOrder(55L))
                .isInstanceOf(com.sanitaryware.crm.exception.ConflictException.class)
                .hasMessageContaining("Cannot receive a cancelled Purchase Order");

        verify(productRepository, never()).save(any());
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
