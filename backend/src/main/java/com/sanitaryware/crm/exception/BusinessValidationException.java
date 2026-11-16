package com.sanitaryware.crm.exception;

/** Only deliberate, safe domain messages may use this type. */
public class BusinessValidationException extends IllegalArgumentException {
    public BusinessValidationException(String message) { super(message); }
}
