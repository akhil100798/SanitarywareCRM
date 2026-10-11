package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.entity.DistributorPayment;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class DistributorPaymentMapperTest {
    @Test
    void toDto_DirectDistributorPayment_DoesNotDereferenceMissingPurchaseOrder() {
        Distributor distributor = new Distributor();
        distributor.setId(7L);
        distributor.setName("Direct Distributor");
        DistributorPayment payment = new DistributorPayment();
        payment.setDistributor(distributor);
        payment.setPaymentNumber("DPAY-1");
        payment.setPaymentMethod(DistributorPayment.PaymentMethod.CASH);

        DistributorPaymentMapper mapper = new DistributorPaymentMapper();
        assertDoesNotThrow(() -> {
            var dto = mapper.toDTO(payment);
            assertEquals(7L, dto.getDistributorId());
            assertEquals("Direct Distributor", dto.getDistributorName());
        });
    }
}
