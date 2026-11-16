package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.WhatsAppMessageResponse;

public interface WhatsAppService {
    WhatsAppMessageResponse sendQuotation(Long quotationId, String customPhoneNumber);
    WhatsAppMessageResponse sendPaymentReceipt(Long paymentId, String customPhoneNumber);
    WhatsAppMessageResponse sendMessage(String targetPhone, String messageText);
    boolean isConfigured();
}
