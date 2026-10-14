package com.sanitaryware.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

/** Dashboard-specific projection; financial values are included only for management roles. */
@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardOrderDTO {
    Long id;
    String orderNumber;
    String customerName;
    String status;
    BigDecimal total;
}
