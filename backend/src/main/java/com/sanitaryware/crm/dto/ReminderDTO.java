package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ReminderDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingReminderDTO {
        private String reminderType; // QUOTATION_EXPIRY, PAYMENT_BALANCE_DUE
        private Long referenceId;
        private String referenceNumber;
        private String customerName;
        private String customerPhone;
        private BigDecimal amount;
        private LocalDate dueDate;
        private Integer daysRemaining; // negative if overdue, positive if future
        private String previewMessage;
        private String portalUrl;
        private boolean alreadySentToday;
        private LocalDateTime lastSentAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReminderPreviewResponseDTO {
        private int totalPendingReminders;
        private int quotationExpiryCount;
        private int paymentBalanceDueCount;
        private List<PendingReminderDTO> quotationReminders;
        private List<PendingReminderDTO> paymentReminders;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReminderBatchExecutionResultDTO {
        private String reminderType;
        private int totalEligible;
        private int sentCount;
        private int simulatedCount;
        private int failedCount;
        private int skippedAlreadySentCount;
        private List<ReminderDispatchDetailDTO> dispatches;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReminderDispatchDetailDTO {
        private Long referenceId;
        private String referenceNumber;
        private String recipientPhone;
        private String recipientName;
        private String status; // SENT, SIMULATED, FAILED, SKIPPED
        private String detail;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReminderLogItemDTO {
        private Long id;
        private String reminderType;
        private Long referenceId;
        private String referenceNumber;
        private String recipientPhone;
        private String recipientName;
        private String messageContent;
        private String deliveryStatus;
        private String errorDetail;
        private LocalDateTime sentAt;
    }
}
