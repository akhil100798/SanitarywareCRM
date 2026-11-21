package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.NotificationDispatchLog;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.Quotation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface NotificationService {
    void sendEmail(String to, String subject, String body);
    void sendWhatsApp(String toPhoneNumber, String message);
    void sendOrderConfirmationEmail(Order order);
    void sendOrderConfirmationWhatsApp(Order order);
    void sendQuotationNotification(Quotation quotation);
    void sendPaymentDueReminder(Order order);
    void sendLowStockAlert(Product product);
    NotificationDispatchLog retryDispatch(Long dispatchLogId);
    Page<NotificationDispatchLog> getDispatchLogs(String channel, String status, String type, String search, Pageable pageable);
    Map<String, Object> triggerLowStockAlerts();
    Map<String, Object> triggerPaymentDueReminders();
}
