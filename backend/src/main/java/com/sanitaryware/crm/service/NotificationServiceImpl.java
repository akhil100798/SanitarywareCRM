package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.NotificationDispatchLog;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.repository.NotificationDispatchLogRepository;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private final NotificationDispatchLogRepository dispatchLogRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.whatsapp.number:}")
    private String twilioWhatsappNumber;

    @Value("${app.notifications.admin-email:admin@sanitaryware-crm.local}")
    private String adminNotificationEmail;

    private boolean isMailConfigured() {
        return mailSender != null 
                && mailUsername != null 
                && !mailUsername.trim().isEmpty() 
                && !mailUsername.contains("your-email@gmail.com");
    }

    private boolean isTwilioConfigured() {
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
    public void sendEmail(String to, String subject, String body) {
        logEmailDispatch(to, subject, body, "GENERAL", null, null);
    }

    private void logEmailDispatch(String to, String subject, String body, String type, Long refId, String refNumber) {
        if (!isMailConfigured()) {
            log.info("Email notification simulated/skipped (credentials unconfigured): to={}", to);
            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("EMAIL")
                    .recipient(to != null ? to : "unspecified@example.com")
                    .subject(subject)
                    .messageContent(body)
                    .notificationType(type)
                    .deliveryStatus("SIMULATED")
                    .errorDetail("Email service unconfigured; simulated in dev/test sandbox")
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .sentAt(LocalDateTime.now())
                    .build());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email notification successfully dispatched to {}", to);

            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("EMAIL")
                    .recipient(to)
                    .subject(subject)
                    .messageContent(body)
                    .notificationType(type)
                    .deliveryStatus("SENT")
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .sentAt(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            log.error("Email dispatch failed to {}: {}", to, e.getMessage());
            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("EMAIL")
                    .recipient(to != null ? to : "unspecified@example.com")
                    .subject(subject)
                    .messageContent(body)
                    .notificationType(type)
                    .deliveryStatus("FAILED")
                    .errorDetail(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .build());
        }
    }

    @Override
    @Transactional
    public void sendWhatsApp(String toPhoneNumber, String messageText) {
        logWhatsAppDispatch(toPhoneNumber, messageText, "GENERAL", null, null);
    }

    private void logWhatsAppDispatch(String toPhoneNumber, String messageText, String type, Long refId, String refNumber) {
        if (!isTwilioConfigured()) {
            log.info("WhatsApp notification simulated/skipped (Twilio unconfigured): to={}", toPhoneNumber);
            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("WHATSAPP")
                    .recipient(toPhoneNumber != null ? toPhoneNumber : "0000000000")
                    .subject("WhatsApp Alert - " + type)
                    .messageContent(messageText)
                    .notificationType(type)
                    .deliveryStatus("SIMULATED")
                    .errorDetail("Twilio WhatsApp unconfigured; simulated in dev/test sandbox")
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .sentAt(LocalDateTime.now())
                    .build());
            return;
        }

        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            String formattedTo = toPhoneNumber.startsWith("whatsapp:") ? toPhoneNumber : "whatsapp:" + toPhoneNumber;
            String formattedFrom = twilioWhatsappNumber.startsWith("whatsapp:") ? twilioWhatsappNumber : "whatsapp:" + twilioWhatsappNumber;

            Message message = Message.creator(
                    new PhoneNumber(formattedTo),
                    new PhoneNumber(formattedFrom),
                    messageText
            ).create();

            log.info("WhatsApp notification dispatched successfully, SID: {}", message.getSid());
            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("WHATSAPP")
                    .recipient(toPhoneNumber)
                    .subject("WhatsApp Alert - " + type)
                    .messageContent(messageText)
                    .notificationType(type)
                    .deliveryStatus("SENT")
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .sentAt(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            log.error("WhatsApp dispatch failed to {}: {}", toPhoneNumber, e.getMessage());
            dispatchLogRepository.save(NotificationDispatchLog.builder()
                    .channel("WHATSAPP")
                    .recipient(toPhoneNumber != null ? toPhoneNumber : "0000000000")
                    .subject("WhatsApp Alert - " + type)
                    .messageContent(messageText)
                    .notificationType(type)
                    .deliveryStatus("FAILED")
                    .errorDetail(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName())
                    .referenceId(refId)
                    .referenceNumber(refNumber)
                    .build());
        }
    }

    @Override
    @Transactional
    public void sendOrderConfirmationEmail(Order order) {
        if (order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            log.warn("Cannot send order email: Customer email is missing.");
            return;
        }
        String to = order.getCustomer().getEmail();
        String subject = "Order Confirmation - " + order.getOrderNumber();
        String body = String.format("Dear %s,\n\nThank you for your order! Your order %s has been successfully recorded.\n" +
                "Total Amount: Rs. %s\n" +
                "Outstanding Balance: Rs. %s\n\n" +
                "We will notify you once your order is ready for delivery.\n\nBest regards,\nSanitaryware Store CRM",
                order.getCustomer().getName(), order.getOrderNumber(), order.getTotal(), order.getBalanceAmount());

        logEmailDispatch(to, subject, body, "ORDER_CONFIRMATION", order.getId(), order.getOrderNumber());
    }

    @Override
    @Transactional
    public void sendOrderConfirmationWhatsApp(Order order) {
        if (order.getCustomer() == null || order.getCustomer().getPhoneNumber() == null) {
            log.warn("Cannot send order WhatsApp: Customer phone number is missing.");
            return;
        }
        String phone = order.getCustomer().getPhoneNumber();
        String message = String.format("Hi %s, your order %s has been confirmed! Total: Rs. %s. Balance Due: Rs. %s. Thanks for shopping with us!",
                order.getCustomer().getName(), order.getOrderNumber(), order.getTotal(), order.getBalanceAmount());

        logWhatsAppDispatch(phone, message, "ORDER_CONFIRMATION", order.getId(), order.getOrderNumber());
    }

    @Override
    @Transactional
    public void sendQuotationNotification(Quotation quotation) {
        if (quotation.getCustomer() == null || quotation.getCustomer().getEmail() == null) {
            log.warn("Cannot send quotation notification: Customer email is missing.");
            return;
        }
        String to = quotation.getCustomer().getEmail();
        String subject = "New Quotation Generated - " + quotation.getQuotationNumber();
        String body = String.format("Dear %s,\n\nA new quotation %s has been generated for you.\n" +
                "Total Estimate: Rs. %s\n" +
                "Valid Until: %s\n\n" +
                "Please review the attached details or contact us to approve.\n\nBest regards,\nSanitaryware Store CRM",
                quotation.getCustomer().getName(), quotation.getQuotationNumber(), quotation.getTotal(), quotation.getValidUntil());

        logEmailDispatch(to, subject, body, "QUOTATION_SHARE", quotation.getId(), quotation.getQuotationNumber());
    }

    @Override
    @Transactional
    public void sendPaymentDueReminder(Order order) {
        if (order == null || order.getCustomer() == null) return;
        BigDecimal balance = order.getBalanceAmount();
        if (balance == null || balance.compareTo(BigDecimal.ZERO) <= 0) return;

        String custName = order.getCustomer().getName();
        String orderNum = order.getOrderNumber();

        if (order.getCustomer().getEmail() != null && !order.getCustomer().getEmail().isBlank()) {
            String subject = "Payment Reminder: Order " + orderNum + " - Balance Due";
            String body = String.format("Dear %s,\n\nThis is a friendly reminder that an outstanding balance of Rs. %s is pending for order %s.\n" +
                    "Order Date: %s\n" +
                    "Total Invoice: Rs. %s\n\n" +
                    "Kindly arrange for payment at your earliest convenience.\n\nBest regards,\nSanitaryware Store Accounts",
                    custName, balance, orderNum, order.getOrderDate(), order.getTotal());
            logEmailDispatch(order.getCustomer().getEmail(), subject, body, "PAYMENT_DUE", order.getId(), orderNum);
        }

        if (order.getCustomer().getPhoneNumber() != null && !order.getCustomer().getPhoneNumber().isBlank()) {
            String msg = String.format("Dear %s, friendly payment reminder for order %s. Outstanding balance: Rs. %s. Please settle at your earliest convenience. Thank you!",
                    custName, orderNum, balance);
            logWhatsAppDispatch(order.getCustomer().getPhoneNumber(), msg, "PAYMENT_DUE", order.getId(), orderNum);
        }
    }

    @Override
    @Transactional
    public void sendLowStockAlert(Product product) {
        if (product == null) return;
        String subject = "LOW STOCK WARNING: " + product.getName() + " (" + product.getSku() + ")";
        String brand = product.getBrand() != null ? product.getBrand().getName() : "General";
        String category = product.getCategory() != null ? product.getCategory().getName() : "General";
        int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;

        String body = String.format("ALERT: Warehouse inventory is critically low for the following product:\n\n" +
                "Product Name: %s\n" +
                "SKU: %s\n" +
                "Brand: %s\n" +
                "Category: %s\n" +
                "Current Stock: %d units (Threshold: 10 units)\n\n" +
                "Please place a purchase order with the distributor immediately.\n\nAutomated Inventory Monitor",
                product.getName(), product.getSku(), brand, category, currentStock);

        logEmailDispatch(adminNotificationEmail, subject, body, "LOW_STOCK", product.getId(), product.getSku());
    }

    @Override
    @Transactional
    public NotificationDispatchLog retryDispatch(Long dispatchLogId) {
        NotificationDispatchLog entry = dispatchLogRepository.findById(dispatchLogId)
                .orElseThrow(() -> new IllegalArgumentException("Notification dispatch log not found with ID: " + dispatchLogId));

        entry.setRetryCount((entry.getRetryCount() != null ? entry.getRetryCount() : 0) + 1);

        if ("EMAIL".equalsIgnoreCase(entry.getChannel())) {
            if (isMailConfigured()) {
                try {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(mailUsername);
                    message.setTo(entry.getRecipient());
                    message.setSubject(entry.getSubject());
                    message.setText(entry.getMessageContent());
                    mailSender.send(message);
                    entry.setDeliveryStatus("SENT");
                    entry.setErrorDetail(null);
                    entry.setSentAt(LocalDateTime.now());
                } catch (Exception e) {
                    entry.setDeliveryStatus("FAILED");
                    entry.setErrorDetail("Retry " + entry.getRetryCount() + " failed: " + e.getMessage());
                }
            } else {
                entry.setDeliveryStatus("SIMULATED");
                entry.setErrorDetail("Email service unconfigured; simulated in dev/test sandbox");
                entry.setSentAt(LocalDateTime.now());
            }
        } else if ("WHATSAPP".equalsIgnoreCase(entry.getChannel())) {
            if (isTwilioConfigured()) {
                try {
                    Twilio.init(twilioAccountSid, twilioAuthToken);
                    String formattedTo = entry.getRecipient().startsWith("whatsapp:") ? entry.getRecipient() : "whatsapp:" + entry.getRecipient();
                    String formattedFrom = twilioWhatsappNumber.startsWith("whatsapp:") ? twilioWhatsappNumber : "whatsapp:" + twilioWhatsappNumber;
                    Message.creator(new PhoneNumber(formattedTo), new PhoneNumber(formattedFrom), entry.getMessageContent()).create();
                    entry.setDeliveryStatus("SENT");
                    entry.setErrorDetail(null);
                    entry.setSentAt(LocalDateTime.now());
                } catch (Exception e) {
                    entry.setDeliveryStatus("FAILED");
                    entry.setErrorDetail("Retry " + entry.getRetryCount() + " failed: " + e.getMessage());
                }
            } else {
                entry.setDeliveryStatus("SIMULATED");
                entry.setErrorDetail("Twilio WhatsApp unconfigured; simulated in dev/test sandbox");
                entry.setSentAt(LocalDateTime.now());
            }
        }

        return dispatchLogRepository.save(entry);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDispatchLog> getDispatchLogs(String channel, String status, String type, String search, Pageable pageable) {
        String cleanChannel = (channel != null && !channel.isBlank() && !channel.equalsIgnoreCase("ALL")) ? channel : null;
        String cleanStatus = (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) ? status : null;
        String cleanType = (type != null && !type.isBlank() && !type.equalsIgnoreCase("ALL")) ? type : null;
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        return dispatchLogRepository.searchLogs(cleanChannel, cleanStatus, cleanType, cleanSearch, pageable);
    }

    @Override
    @Transactional
    public Map<String, Object> triggerLowStockAlerts() {
        List<Product> lowStockProducts = productRepository.findAll().stream()
                .filter(p -> p.getStockQuantity() != null && p.getStockQuantity() < 10)
                .toList();

        for (Product product : lowStockProducts) {
            sendLowStockAlert(product);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("triggeredAt", LocalDateTime.now());
        result.put("productsChecked", productRepository.count());
        result.put("alertsSent", lowStockProducts.size());
        result.put("lowStockCount", lowStockProducts.size());
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> triggerPaymentDueReminders() {
        List<Order> unpaidOrders = orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != Order.OrderStatus.CANCELLED)
                .filter(o -> o.getBalanceAmount() != null && o.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        for (Order order : unpaidOrders) {
            sendPaymentDueReminder(order);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("triggeredAt", LocalDateTime.now());
        result.put("ordersChecked", orderRepository.count());
        result.put("remindersDispatched", unpaidOrders.size());
        result.put("totalUnpaidOrders", unpaidOrders.size());
        return result;
    }
}
