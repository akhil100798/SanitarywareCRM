package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Quotation;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${twilio.account.sid:}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token:}")
    private String twilioAuthToken;

    @Value("${twilio.whatsapp.number:}")
    private String twilioWhatsappNumber;

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
    public void sendEmail(String to, String subject, String body) {
        if (!isMailConfigured()) {
            log.warn("Email notification skipped: SMTP username/credentials are unconfigured or placeholder.");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email notification sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}", to, e);
        }
    }

    @Override
    public void sendWhatsApp(String toPhoneNumber, String messageText) {
        if (!isTwilioConfigured()) {
            log.warn("WhatsApp notification skipped: Twilio SID/Auth Token is unconfigured or placeholder.");
            return;
        }
        try {
            // Initialize Twilio client dynamically to avoid issues if static init fails on start
            Twilio.init(twilioAccountSid, twilioAuthToken);
            
            // Format phone number for WhatsApp
            String formattedTo = toPhoneNumber.startsWith("whatsapp:") ? toPhoneNumber : "whatsapp:" + toPhoneNumber;
            String formattedFrom = twilioWhatsappNumber.startsWith("whatsapp:") ? twilioWhatsappNumber : "whatsapp:" + twilioWhatsappNumber;

            Message message = Message.creator(
                    new PhoneNumber(formattedTo),
                    new PhoneNumber(formattedFrom),
                    messageText
            ).create();
            
            log.info("WhatsApp notification sent successfully, SID: {}", message.getSid());
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}", toPhoneNumber, e);
        }
    }

    @Override
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
        
        sendEmail(to, subject, body);
    }

    @Override
    public void sendOrderConfirmationWhatsApp(Order order) {
        if (order.getCustomer() == null || order.getCustomer().getPhoneNumber() == null) {
            log.warn("Cannot send order WhatsApp: Customer phone number is missing.");
            return;
        }
        String phone = order.getCustomer().getPhoneNumber();
        String message = String.format("Hi %s, your order %s has been confirmed! Total: Rs. %s. Balance Due: Rs. %s. Thanks for shopping with us!",
                order.getCustomer().getName(), order.getOrderNumber(), order.getTotal(), order.getBalanceAmount());
        
        sendWhatsApp(phone, message);
    }

    @Override
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
        
        sendEmail(to, subject, body);
    }
}
