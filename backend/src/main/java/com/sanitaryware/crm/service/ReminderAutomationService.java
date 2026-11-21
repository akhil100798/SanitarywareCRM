package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.ReminderDTO.PendingReminderDTO;
import com.sanitaryware.crm.dto.ReminderDTO.ReminderBatchExecutionResultDTO;
import com.sanitaryware.crm.dto.ReminderDTO.ReminderLogItemDTO;
import com.sanitaryware.crm.dto.ReminderDTO.ReminderPreviewResponseDTO;

import java.util.List;

public interface ReminderAutomationService {

    ReminderPreviewResponseDTO getPendingRemindersPreview();

    ReminderBatchExecutionResultDTO triggerQuotationExpiryReminders();

    ReminderBatchExecutionResultDTO triggerPaymentBalanceReminders();

    ReminderBatchExecutionResultDTO triggerAllReminders();

    List<ReminderLogItemDTO> getReminderLogs();
}
