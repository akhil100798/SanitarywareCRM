package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.WhatsAppMessageResponse;
import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.repository.PaymentRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppServiceTest {

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private AccessControlService accessControlService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private WhatsAppServiceImpl whatsAppService;

    private Customer testCustomer;
    private Quotation testQuotation;
    private Payment testPayment;

    @BeforeEach
    void setUp() {
        testCustomer = new Customer();
        testCustomer.setId(10L);
        testCustomer.setName("Acme Sanitary");
        testCustomer.setPhoneNumber("9876543210");

        testQuotation = new Quotation();
        testQuotation.setId(100L);
        testQuotation.setQuotationNumber("QT-202611-0001");
        testQuotation.setCustomer(testCustomer);
        testQuotation.setTotal(new BigDecimal("15450.00"));
        testQuotation.setValidUntil(LocalDate.now().plusDays(15));
        testQuotation.setShareToken("token-uuid-1234");

        Order testOrder = new Order();
        testOrder.setId(200L);
        testOrder.setOrderNumber("ORD-202611-0001");
        testOrder.setCustomer(testCustomer);
        testOrder.setBalanceAmount(new BigDecimal("5000.00"));

        testPayment = new Payment();
        testPayment.setId(300L);
        testPayment.setPaymentNumber("REC-202611-0001");
        testPayment.setOrder(testOrder);
        testPayment.setAmount(new BigDecimal("10450.00"));
        testPayment.setPaymentMethod(Payment.PaymentMethod.CASH);
        testPayment.setPaymentDate(LocalDate.now());

        // Default: unconfigured sandbox
        ReflectionTestUtils.setField(whatsAppService, "portalBaseUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(whatsAppService, "twilioAccountSid", "");
        ReflectionTestUtils.setField(whatsAppService, "twilioAuthToken", "");
        ReflectionTestUtils.setField(whatsAppService, "twilioWhatsappNumber", "");
    }

    @Test
    @DisplayName("sendQuotation simulates WhatsApp dispatch when Twilio credentials are blank")
    void testSendQuotation_SimulatedMode() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(testQuotation));

        WhatsAppMessageResponse response = whatsAppService.sendQuotation(100L, null);

        assertNotNull(response);
        assertEquals("SIMULATED", response.getStatus());
        assertEquals("+919876543210", response.getRecipient());
        assertTrue(response.getMessage().contains("QT-202611-0001"));
        assertTrue(response.getMessage().contains("15450.00"));
        assertTrue(response.getMessage().contains("token-uuid-1234"));
        verify(auditService).logEvent(eq("SEND_WHATSAPP_QUOTATION"), eq("QUOTATION"), eq(100L), any());
    }

    @Test
    @DisplayName("sendQuotation uses custom recipient number when supplied")
    void testSendQuotation_CustomRecipient() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(testQuotation));

        WhatsAppMessageResponse response = whatsAppService.sendQuotation(100L, "+919999888877");

        assertNotNull(response);
        assertEquals("SIMULATED", response.getStatus());
        assertEquals("+919999888877", response.getRecipient());
    }

    @Test
    @DisplayName("sendPaymentReceipt simulates receipt dispatch with order details")
    void testSendPaymentReceipt_SimulatedMode() {
        when(paymentRepository.findById(300L)).thenReturn(Optional.of(testPayment));

        WhatsAppMessageResponse response = whatsAppService.sendPaymentReceipt(300L, null);

        assertNotNull(response);
        assertEquals("SIMULATED", response.getStatus());
        assertEquals("+919876543210", response.getRecipient());
        assertTrue(response.getMessage().contains("REC-202611-0001"));
        assertTrue(response.getMessage().contains("10450.00"));
        assertTrue(response.getMessage().contains("ORD-202611-0001"));
        verify(auditService).logEvent(eq("SEND_WHATSAPP_PAYMENT"), eq("PAYMENT"), eq(300L), any());
    }

    @Test
    @DisplayName("isConfigured returns false when SID is placeholder")
    void testIsConfigured_PlaceholderSid() {
        ReflectionTestUtils.setField(whatsAppService, "twilioAccountSid", "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
        assertFalse(whatsAppService.isConfigured());
    }
}
