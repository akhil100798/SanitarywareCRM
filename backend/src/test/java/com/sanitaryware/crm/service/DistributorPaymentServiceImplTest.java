package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.DistributorPayment;
import com.sanitaryware.crm.entity.PurchaseOrder;
import com.sanitaryware.crm.mapper.DistributorPaymentMapper;
import com.sanitaryware.crm.repository.DistributorPaymentRepository;
import com.sanitaryware.crm.repository.DistributorRepository;
import com.sanitaryware.crm.repository.PurchaseOrderRepository;
import com.sanitaryware.crm.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DistributorPaymentServiceImplTest {

    @Mock
    private DistributorPaymentRepository paymentRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private DistributorRepository distributorRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DistributorPaymentMapper paymentMapper;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private DistributorPaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("qaadmin", "pass")
        );
    }

    @Test
    void createPayment_AgainstPurchaseOrder_UpdatesPOAndDistributorBalances() {
        DistributorPaymentDTO dto = new DistributorPaymentDTO();
        dto.setAmount(BigDecimal.valueOf(5000));
        dto.setPurchaseOrderId(1L);

        Distributor distributor = new Distributor();
        distributor.setId(10L);
        distributor.setOutstandingBalance(BigDecimal.valueOf(20000));

        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setDistributor(distributor);
        po.setTotal(BigDecimal.valueOf(10000));
        po.setPaidAmount(BigDecimal.ZERO);
        po.setBalanceAmount(BigDecimal.valueOf(10000));

        DistributorPayment payment = new DistributorPayment();
        payment.setAmount(BigDecimal.valueOf(5000));
        payment.setPurchaseOrder(po);

        when(paymentMapper.toEntity(dto)).thenReturn(payment);
        when(paymentRepository.save(any(DistributorPayment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentMapper.toDTO(any())).thenReturn(new DistributorPaymentDTO());

        DistributorPaymentDTO result = paymentService.createPayment(dto);

        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(5000), po.getPaidAmount());
        assertEquals(BigDecimal.valueOf(5000), po.getBalanceAmount());
        assertEquals(BigDecimal.valueOf(15000), distributor.getOutstandingBalance());
        verify(purchaseOrderRepository).save(po);
        verify(distributorRepository).save(distributor);
        verify(paymentRepository).save(payment);
    }

    @Test
    void createPayment_ExceedsPOBalance_ThrowsIllegalArgumentException() {
        DistributorPaymentDTO dto = new DistributorPaymentDTO();
        dto.setAmount(BigDecimal.valueOf(15000));
        dto.setPurchaseOrderId(1L);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(1L);
        po.setBalanceAmount(BigDecimal.valueOf(10000));

        DistributorPayment payment = new DistributorPayment();
        payment.setAmount(BigDecimal.valueOf(15000));
        payment.setPurchaseOrder(po);

        when(paymentMapper.toEntity(dto)).thenReturn(payment);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> paymentService.createPayment(dto));

        assertTrue(ex.getMessage().contains("exceeds the PO balance"));
        verify(paymentRepository, never()).save(any());
    }
}
