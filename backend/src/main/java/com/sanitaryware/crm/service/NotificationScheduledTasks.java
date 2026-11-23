package com.sanitaryware.crm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "notifications.scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationScheduledTasks {

    private final NotificationService notificationService;

    /**
     * Daily morning payment-due reminder scheduler (default 9:30 AM every day)
     */
    @Scheduled(cron = "${notifications.reminders.cron:0 30 9 * * *}")
    public void runDailyPaymentReminders() {
        log.info("Running automated scheduled payment-due reminder task...");
        try {
            notificationService.triggerPaymentDueReminders();
        } catch (Exception e) {
            log.error("Automated payment reminder cron failed safely: {}", e.getMessage());
        }
    }

    /**
     * Daily inventory threshold scanner for low stock warnings (default 10:00 AM every day)
     */
    @Scheduled(cron = "${notifications.low-stock.cron:0 0 10 * * *}")
    public void runDailyLowStockScan() {
        log.info("Running automated scheduled low-stock inventory scan...");
        try {
            notificationService.triggerLowStockAlerts();
        } catch (Exception e) {
            log.error("Automated low-stock inventory scan failed safely: {}", e.getMessage());
        }
    }
}
