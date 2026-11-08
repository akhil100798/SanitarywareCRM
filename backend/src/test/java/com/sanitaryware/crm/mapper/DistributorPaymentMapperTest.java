package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.DistributorPaymentDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.DistributorPayment;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DistributorPaymentMapperTest {

    private final DistributorPaymentMapper mapper = new DistributorPaymentMapper();

    @Test
    void toDTO_mapsIndependentPaymentWithoutPurchaseOrder() {
        Distributor distributor = new Distributor();
        distributor.setId(42L);
        distributor.setName("QA Supplier");

        DistributorPayment payment = new DistributorPayment();
        payment.setDistributor(distributor);
        payment.setPaymentNumber("DPAY-QA-001");
        payment.setPaymentDate(LocalDate.of(2026, 10, 15));
        payment.setAmount(new BigDecimal("1000.00"));
        payment.setPaymentMethod(DistributorPayment.PaymentMethod.CASH);

        DistributorPaymentDTO dto = mapper.toDTO(payment);

        assertNull(dto.getPurchaseOrderId());
        assertNull(dto.getPoNumber());
        assertEquals(42L, dto.getDistributorId());
        assertEquals("QA Supplier", dto.getDistributorName());
        assertEquals("DPAY-QA-001", dto.getPaymentNumber());
    }
}
