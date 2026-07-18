package com.sanitaryware.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
        int status,
        String error,
        String message,
        Map<String, String> validationErrors
) {
    public ApiErrorResponse(int status, String error, String message) {
        this(status, error, message, null);
    }
}
