package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Quotation;

public interface NotificationService {
    void sendEmail(String to, String subject, String body);
    void sendWhatsApp(String toPhoneNumber, String message);
    void sendOrderConfirmationEmail(Order order);
    void sendOrderConfirmationWhatsApp(Order order);
    void sendQuotationNotification(Quotation quotation);
}
