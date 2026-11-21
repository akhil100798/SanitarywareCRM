package com.sanitaryware.crm.service.impl;

import com.sanitaryware.crm.dto.ReminderDTO.*;
import com.sanitaryware.crm.dto.WhatsAppMessageResponse;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.ReminderLog;
import com.sanitaryware.crm.entity.SystemSettings;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import com.sanitaryware.crm.repository.ReminderLogRepository;
import com.sanitaryware.crm.repository.SystemSettingsRepository;
import com.sanitaryware.crm.service.AuditService;
import com.sanitaryware.crm.service.ReminderAutomationService;
import com.sanitaryware.crm.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderAutomationServiceImpl implements ReminderAutomationService {

    private final QuotationRepository quotationRepository;
    private final OrderRepository orderRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final WhatsAppService whatsAppService;
    private final SystemSettingsRepository systemSettingsRepository;
    private final AuditService auditService;

    @Value("${app.portal.base-url:http://localhost:5173}")
    private String portalBaseUrl;

    @Value("${app.automation.reminders.enabled:true}")
    private boolean remindersEnabled;

    /**
     * Daily morning automated cron job (runs at 9:00 AM every day)
     */
    @Scheduled(cron = "${app.automation.reminders.cron:0 0 9 * * *}")
    public void runDailyAutomatedReminders() {
        if (!remindersEnabled) {
            log.info("Automated reminders are disabled by configuration.");
            return;
        }
        log.info("Running scheduled daily morning reminder automation...");
        try {
            triggerAllReminders();
        } catch (Exception e) {
            log.error("Error during scheduled reminder automation run: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ReminderPreviewResponseDTO getPendingRemindersPreview() {
        List<PendingReminderDTO> quoteReminders = fetchEligibleQuotationReminders();
        List<PendingReminderDTO> paymentReminders = fetchEligiblePaymentReminders();

        return ReminderPreviewResponseDTO.builder()
                .totalPendingReminders(quoteReminders.size() + paymentReminders.size())
                .quotationExpiryCount(quoteReminders.size())
                .paymentBalanceDueCount(paymentReminders.size())
                .quotationReminders(quoteReminders)
                .paymentReminders(paymentReminders)
                .build();
    }

    @Override
    @Transactional
    public ReminderBatchExecutionResultDTO triggerQuotationExpiryReminders() {
        List<PendingReminderDTO> eligible = fetchEligibleQuotationReminders();
        return executeReminderBatch("QUOTATION_EXPIRY", eligible);
    }

    @Override
    @Transactional
    public ReminderBatchExecutionResultDTO triggerPaymentBalanceReminders() {
        List<PendingReminderDTO> eligible = fetchEligiblePaymentReminders();
        return executeReminderBatch("PAYMENT_BALANCE_DUE", eligible);
    }

    @Override
    @Transactional
    public ReminderBatchExecutionResultDTO triggerAllReminders() {
        List<PendingReminderDTO> allEligible = new ArrayList<>();
        allEligible.addAll(fetchEligibleQuotationReminders());
        allEligible.addAll(fetchEligiblePaymentReminders());

        return executeReminderBatch("ALL_REMINDERS", allEligible);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReminderLogItemDTO> getReminderLogs() {
        List<ReminderLog> logs = reminderLogRepository.findTop50ByOrderBySentAtDesc();
        return logs.stream().map(l -> ReminderLogItemDTO.builder()
                .id(l.getId())
                .reminderType(l.getReminderType())
                .referenceId(l.getReferenceId())
                .referenceNumber(l.getReferenceNumber())
                .recipientPhone(l.getRecipientPhone())
                .recipientName(l.getRecipientName())
                .messageContent(l.getMessageContent())
                .deliveryStatus(l.getDeliveryStatus())
                .errorDetail(l.getErrorDetail())
                .sentAt(l.getSentAt())
                .build()
        ).collect(Collectors.toList());
    }

    private List<PendingReminderDTO> fetchEligibleQuotationReminders() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysAhead = today.plusDays(3);
        List<Quotation> expiringQuotes = quotationRepository.findExpiringQuotations(today, threeDaysAhead);

        LocalDateTime startOfDay = today.atStartOfDay();
        List<PendingReminderDTO> result = new ArrayList<>();

        SystemSettings settings = getSystemSettings();
        String storePhone = settings != null && settings.getPhone() != null ? settings.getPhone() : "+91-98765-43210";
        String cleanBaseUrl = (portalBaseUrl != null ? portalBaseUrl : "http://localhost:5173").replaceAll("/+$", "");

        for (Quotation q : expiringQuotes) {
            String custPhone = q.getCustomer() != null ? q.getCustomer().getPhoneNumber() : null;
            String custName = q.getCustomer() != null ? q.getCustomer().getName() : "Customer";
            if (custPhone == null || custPhone.isBlank()) {
                continue;
            }

            int daysRemaining = (int) ChronoUnit.DAYS.between(today, q.getValidUntil());
            String portalUrl = cleanBaseUrl + "/portal/quotations/" + (q.getShareToken() != null ? q.getShareToken() : "");

            List<ReminderLog> recent = reminderLogRepository.findRecentReminders("QUOTATION_EXPIRY", q.getId(), startOfDay);
            boolean alreadySent = !recent.isEmpty();
            LocalDateTime lastSentAt = alreadySent ? recent.get(0).getSentAt() : null;

            String message = String.format(
                    "Hello %s,\n\n" +
                    "This is a gentle reminder that your Sanitaryware quotation *%s* (Total: Rs. %s) is scheduled to expire in *%d day(s)* on *%s*.\n\n" +
                    "To secure current pricing and guarantee immediate warehouse stock allocation, please view and accept your quote online:\n%s\n\n" +
                    "Need any modifications? Reply directly or call our team at %s.\n\nSanitaryware CRM",
                    custName,
                    q.getQuotationNumber(),
                    q.getTotal(),
                    Math.max(0, daysRemaining),
                    q.getValidUntil(),
                    portalUrl,
                    storePhone
            );

            result.add(PendingReminderDTO.builder()
                    .reminderType("QUOTATION_EXPIRY")
                    .referenceId(q.getId())
                    .referenceNumber(q.getQuotationNumber())
                    .customerName(custName)
                    .customerPhone(custPhone)
                    .amount(q.getTotal())
                    .dueDate(q.getValidUntil())
                    .daysRemaining(daysRemaining)
                    .previewMessage(message)
                    .portalUrl(portalUrl)
                    .alreadySentToday(alreadySent)
                    .lastSentAt(lastSentAt)
                    .build());
        }

        return result;
    }

    private List<PendingReminderDTO> fetchEligiblePaymentReminders() {
        List<Order> pendingOrders = orderRepository.findPendingBalanceOrders();
        LocalDate today = LocalDate.now();
        LocalDateTime threeDaysAgo = today.minusDays(3).atStartOfDay();

        List<PendingReminderDTO> result = new ArrayList<>();
        SystemSettings settings = getSystemSettings();
        String storePhone = settings != null && settings.getPhone() != null ? settings.getPhone() : "+91-98765-43210";
        String upiId = "payments@sanitarywarecrm";

        for (Order o : pendingOrders) {
            String custPhone = o.getCustomer() != null ? o.getCustomer().getPhoneNumber() : null;
            String custName = o.getCustomer() != null ? o.getCustomer().getName() : "Customer";
            if (custPhone == null || custPhone.isBlank() || o.getBalanceAmount() == null || o.getBalanceAmount().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            int daysPending = (int) ChronoUnit.DAYS.between(o.getOrderDate(), today);
            List<ReminderLog> recent = reminderLogRepository.findRecentReminders("PAYMENT_BALANCE_DUE", o.getId(), threeDaysAgo);
            boolean alreadySent = !recent.isEmpty();
            LocalDateTime lastSentAt = alreadySent ? recent.get(0).getSentAt() : null;

            String message = String.format(
                    "Hello %s,\n\n" +
                    "This is a payment status update regarding your Sanitaryware CRM Order *%s*.\n\n" +
                    "* Order Total: Rs. %s\n" +
                    "* Paid Amount: Rs. %s\n" +
                    "* *Remaining Balance Due: Rs. %s*\n\n" +
                    "To ensure smooth dispatch and clear billing, settlement can be transferred via UPI (*%s*) or bank transfer. Contact %s once paid for your receipt.\n\n" +
                    "Thank you for choosing us!\nSanitaryware CRM",
                    custName,
                    o.getOrderNumber(),
                    o.getTotal(),
                    o.getPaidAmount() != null ? o.getPaidAmount() : "0.00",
                    o.getBalanceAmount(),
                    upiId,
                    storePhone
            );

            result.add(PendingReminderDTO.builder()
                    .reminderType("PAYMENT_BALANCE_DUE")
                    .referenceId(o.getId())
                    .referenceNumber(o.getOrderNumber())
                    .customerName(custName)
                    .customerPhone(custPhone)
                    .amount(o.getBalanceAmount())
                    .dueDate(o.getOrderDate())
                    .daysRemaining(-daysPending) // negative denotes days since order
                    .previewMessage(message)
                    .portalUrl("")
                    .alreadySentToday(alreadySent)
                    .lastSentAt(lastSentAt)
                    .build());
        }

        return result;
    }

    private ReminderBatchExecutionResultDTO executeReminderBatch(String batchType, List<PendingReminderDTO> items) {
        int sent = 0;
        int simulated = 0;
        int failed = 0;
        int skipped = 0;
        List<ReminderDispatchDetailDTO> details = new ArrayList<>();

        for (PendingReminderDTO item : items) {
            if (item.isAlreadySentToday()) {
                skipped++;
                details.add(ReminderDispatchDetailDTO.builder()
                        .referenceId(item.getReferenceId())
                        .referenceNumber(item.getReferenceNumber())
                        .recipientPhone(item.getCustomerPhone())
                        .recipientName(item.getCustomerName())
                        .status("SKIPPED")
                        .detail("Reminder already dispatched today. Avoided duplicate notification.")
                        .build());
                continue;
            }

            try {
                WhatsAppMessageResponse response = whatsAppService.sendMessage(item.getCustomerPhone(), item.getPreviewMessage());
                String status = response != null && response.getStatus() != null ? response.getStatus() : "SIMULATED";

                if ("SENT".equalsIgnoreCase(status)) {
                    sent++;
                } else if ("SIMULATED".equalsIgnoreCase(status)) {
                    simulated++;
                } else {
                    failed++;
                }

                // Log into ReminderLog table
                ReminderLog logEntry = ReminderLog.builder()
                        .reminderType(item.getReminderType())
                        .referenceId(item.getReferenceId())
                        .referenceNumber(item.getReferenceNumber())
                        .recipientPhone(item.getCustomerPhone())
                        .recipientName(item.getCustomerName())
                        .messageContent(item.getPreviewMessage())
                        .deliveryStatus(status)
                        .errorDetail(response != null ? response.getDetail() : null)
                        .sentAt(LocalDateTime.now())
                        .build();
                reminderLogRepository.save(logEntry);

                // Audit log
                auditService.logEvent("AUTO_REMINDER_DISPATCHED", item.getReminderType(), item.getReferenceId(),
                        "Dispatched " + item.getReminderType() + " reminder to " + item.getCustomerPhone() + " (Status: " + status + ")");

                details.add(ReminderDispatchDetailDTO.builder()
                        .referenceId(item.getReferenceId())
                        .referenceNumber(item.getReferenceNumber())
                        .recipientPhone(item.getCustomerPhone())
                        .recipientName(item.getCustomerName())
                        .status(status)
                        .detail(response != null ? response.getDetail() : "Dispatched successfully")
                        .build());
            } catch (Exception e) {
                failed++;
                log.error("Failed to send reminder for {}: {}", item.getReferenceNumber(), e.getMessage());

                ReminderLog logEntry = ReminderLog.builder()
                        .reminderType(item.getReminderType())
                        .referenceId(item.getReferenceId())
                        .referenceNumber(item.getReferenceNumber())
                        .recipientPhone(item.getCustomerPhone())
                        .recipientName(item.getCustomerName())
                        .messageContent(item.getPreviewMessage())
                        .deliveryStatus("FAILED")
                        .errorDetail(e.getMessage())
                        .sentAt(LocalDateTime.now())
                        .build();
                reminderLogRepository.save(logEntry);

                details.add(ReminderDispatchDetailDTO.builder()
                        .referenceId(item.getReferenceId())
                        .referenceNumber(item.getReferenceNumber())
                        .recipientPhone(item.getCustomerPhone())
                        .recipientName(item.getCustomerName())
                        .status("FAILED")
                        .detail(e.getMessage())
                        .build());
            }
        }

        return ReminderBatchExecutionResultDTO.builder()
                .reminderType(batchType)
                .totalEligible(items.size())
                .sentCount(sent)
                .simulatedCount(simulated)
                .failedCount(failed)
                .skippedAlreadySentCount(skipped)
                .dispatches(details)
                .build();
    }

    private SystemSettings getSystemSettings() {
        return systemSettingsRepository.findAll().stream().findFirst().orElse(null);
    }
}
