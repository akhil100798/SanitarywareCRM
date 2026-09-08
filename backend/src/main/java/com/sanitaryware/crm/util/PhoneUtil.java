package com.sanitaryware.crm.util;

public final class PhoneUtil {

    private PhoneUtil() {}

    /**
     * Normalizes and validates a phone number according to system invariants:
     * 1. Permitted presentation characters: spaces, parentheses, hyphens, dots, optional leading '+'.
     * 2. Formatting characters do not count toward phone length.
     * 3. Normalized digit count must be between 10 and 15 digits.
     * 4. Returns the normalized digits string according to the database contract.
     */
    public static String normalizeAndValidate(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }

        String trimmed = rawPhone.trim();

        // Must contain only permitted presentation characters
        if (!trimmed.matches("^\\+?[0-9\\s()\\-.]+$")) {
            throw new IllegalArgumentException("Phone number contains invalid characters");
        }

        // Strip leading '+' and all formatting presentation characters
        String digits = trimmed.replaceAll("^\\+", "").replaceAll("[\\s()\\-.]", "");

        if (digits.isEmpty()) {
            throw new IllegalArgumentException("Phone number must contain numeric digits");
        }

        if (digits.length() < 10) {
            throw new IllegalArgumentException("Phone number must contain at least 10 digits");
        }

        if (digits.length() > 15) {
            throw new IllegalArgumentException("Phone number cannot exceed 15 digits");
        }

        return digits;
    }

    public static boolean isValid(String rawPhone) {
        try {
            normalizeAndValidate(rawPhone);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
