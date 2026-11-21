package com.sanitaryware.crm.util;

public final class CsvFormulaSanitizer {

    private CsvFormulaSanitizer() {}

    /**
     * Sanitizes spreadsheet cell content to prevent CSV/Excel Formula Injection (CWE-1236).
     * If text begins with '=', '+', '-', or '@', it is prepended with a single quote (').
     */
    public static String sanitize(Object value) {
        if (value == null) {
            return "";
        }
        String str = value.toString().trim();
        if (str.isEmpty()) {
            return "";
        }
        char first = str.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@') {
            return "'" + str;
        }
        return str;
    }
}
