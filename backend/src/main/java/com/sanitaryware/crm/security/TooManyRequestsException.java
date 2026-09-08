package com.sanitaryware.crm.security;

public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException() {
        super("Too many requests");
    }
}
