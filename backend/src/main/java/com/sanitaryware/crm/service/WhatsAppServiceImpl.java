package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.WhatsAppMessageResponse;
import com.sanitaryware.crm.entity.Payment;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.PaymentRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppServiceImpl implements WhatsAppService {

    private final QuotationRepository quotationRepository;
    private final PaymentRepository paymentRepository;
    private final AccessControlService accessControlService;
    private final AuditService auditService;

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.whatsapp.number:}")
    private String twilioWhatsappNumber;

    @Value("${app.portal.base-url:http://localhost:5173}")
    private String portalBaseUrl;

    @Override
    public boolean isConfigured() {
        return twilioAccountSid != null
                && !twilioAccountSid.trim().isEmpty()
                && !twilioAccountSid.contains("ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
                && twilioAuthToken != null
                && !twilioAuthToken.trim().isEmpty()
                && !twilioAuthToken.contains("your_twilio_auth_token")
                && twilioWhatsappNumber != null
                && !twilioWhatsappNumber.trim().isEmpty();
    }

    @Override
    @Transactional
    public WhatsAppMessageResponse sendQuotation(Long quotationId, String customPhoneNumber) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + quotationId));
        accessControlService.requireQuotationAccess(quotation);

        if (quotation.getShareToken() == null || quotation.getShareToken().isBlank()) {
            quotation.setShareToken(UUID.randomUUID().toString());
            quotation = quotationRepository.save(quotation);
        }

        String recipient = resolvePhoneNumber(customPhoneNumber, quotation.getCustomer() != null ? quotation.getCustomer().getPhoneNumber() : null);
        String customerName = quotation.getCustomer() != null ? quotation.getCustomer().getName() : "Customer";
        String portalLink = portalBaseUrl.replaceAll("/+$", "") + "/portal/quotations/" + quotation.getShareToken();

        String messageText = String.format(
                "Hello %s,\n\n" +
                "Here is your quotation %s from Sanitaryware CRM.\n" +
                "Total Amount: Rs. %s\n" +
                "Valid Until: %s\n\n" +
                "You can view your quotation details and download PDF here:\n%s\n\n" +
                "Thank you for choosing us!",
                customerName,
                quotation.getQuotationNumber(),
                quotation.getTotal(),
                quotation.getValidUntil(),
                portalLink
        );

        WhatsAppMessageResponse response = dispatchMessage(recipient, messageText);
        auditService.logEvent("SEND_WHATSAPP_QUOTATION", "QUOTATION", quotation.getId(),
                "Dispatched WhatsApp quotation to " + recipient + " (Status: " + response.getStatus() + ")");
        return response;
    }

    @Override
    @Transactional
    public WhatsAppMessageResponse sendPaymentReceipt(Long paymentId, String customPhoneNumber) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));
        accessControlService.requirePaymentAccess(payment);

        String customerPhone = payment.getOrder() != null && payment.getOrder().getCustomer() != null
                ? payment.getOrder().getCustomer().getPhoneNumber() : null;
        String customerName = payment.getOrder() != null && payment.getOrder().getCustomer() != null
                ? payment.getOrder().getCustomer().getName() : "Customer";
        String orderNumber = payment.getOrder() != null ? payment.getOrder().getOrderNumber() : "N/A";
        String balance = payment.getOrder() != null ? payment.getOrder().getBalanceAmount().toString() : "0.00";

        String recipient = resolvePhoneNumber(customPhoneNumber, customerPhone);

        String messageText = String.format(
                "Hello %s,\n\n" +
                "Payment of Rs. %s has been successfully recorded for Order %s.\n" +
                "Receipt Number: %s\n" +
                "Payment Method: %s\n" +
                "Payment Date: %s\n" +
                "Remaining Order Balance: Rs. %s\n\n" +
                "Thank you for your business!\nSanitaryware CRM",
                customerName,
                payment.getAmount(),
                orderNumber,
                payment.getPaymentNumber(),
                payment.getPaymentMethod(),
                payment.getPaymentDate(),
                balance
        );

        WhatsAppMessageResponse response = dispatchMessage(recipient, messageText);
        auditService.logEvent("SEND_WHATSAPP_PAYMENT", "PAYMENT", payment.getId(),
                "Dispatched WhatsApp receipt to " + recipient + " (Status: " + response.getStatus() + ")");
        return response;
    }

    @Override
    public WhatsAppMessageResponse sendMessage(String targetPhone, String messageText) {
        if (targetPhone == null || targetPhone.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient phone number is required");
        }
        if (messageText == null || messageText.trim().isEmpty()) {
            throw new IllegalArgumentException("Message text cannot be empty");
        }
        return dispatchMessage(normalizePhoneNumber(targetPhone), messageText);
    }

    private WhatsAppMessageResponse dispatchMessage(String recipient, String messageText) {
        if (!isConfigured()) {
            String simId = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            log.info("Twilio WhatsApp unconfigured or sandbox placeholder. Simulating dispatch to {}: ID={}", recipient, simId);
            return WhatsAppMessageResponse.builder()
                    .status("SIMULATED")
                    .messageId(simId)
                    .recipient(recipient)
                    .message(messageText)
                    .timestamp(LocalDateTime.now())
                    .detail("Twilio credentials not configured in environment. Dispatched successfully in sandbox simulation mode.")
                    .build();
        }

        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);

            String formattedTo = recipient.startsWith("whatsapp:") ? recipient : "whatsapp:" + recipient;
            String formattedFrom = twilioWhatsappNumber.startsWith("whatsapp:") ? twilioWhatsappNumber : "whatsapp:" + twilioWhatsappNumber;

            Message twilioMessage = Message.creator(
                    new PhoneNumber(formattedTo),
                    new PhoneNumber(formattedFrom),
                    messageText
            ).create();

            log.info("Dispatched live WhatsApp message to {} with Twilio SID {}", recipient, twilioMessage.getSid());
            return WhatsAppMessageResponse.builder()
                    .status("SENT")
                    .messageId(twilioMessage.getSid())
                    .recipient(recipient)
                    .message(messageText)
                    .timestamp(LocalDateTime.now())
                    .detail("Message dispatched successfully via Twilio WhatsApp API")
                    .build();
        } catch (Exception ex) {
            log.error("Failed to send WhatsApp message via Twilio to {}: {}", recipient, ex.getMessage(), ex);
            return WhatsAppMessageResponse.builder()
                    .status("FAILED")
                    .recipient(recipient)
                    .message(messageText)
                    .timestamp(LocalDateTime.now())
                    .detail("Twilio transmission failed: " + ex.getMessage())
                    .build();
        }
    }

    private String resolvePhoneNumber(String customPhone, String entityPhone) {
        if (customPhone != null && !customPhone.trim().isEmpty()) {
            return normalizePhoneNumber(customPhone);
        }
        if (entityPhone != null && !entityPhone.trim().isEmpty()) {
            return normalizePhoneNumber(entityPhone);
        }
        throw new IllegalArgumentException("Customer does not have a registered phone number and no recipient number was provided.");
    }

    private String normalizePhoneNumber(String raw) {
        String cleaned = raw.replaceAll("[^0-9+]", "");
        if (!cleaned.startsWith("+")) {
            if (cleaned.length() == 10) {
                cleaned = "+91" + cleaned;
            } else {
                cleaned = "+" + cleaned;
            }
        }
        return cleaned;
    }
}
