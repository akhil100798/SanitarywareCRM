package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppMessageResponse {
    private String status; // SENT, SIMULATED, FAILED
    private String messageId;
    private String recipient;
    private String message;
    private LocalDateTime timestamp;
    private String detail;
}
