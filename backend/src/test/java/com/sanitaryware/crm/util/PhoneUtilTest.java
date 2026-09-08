package com.sanitaryware.crm.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class PhoneUtilTest {

    @ParameterizedTest
    @CsvSource({
            "9876543210, 9876543210",
            "+919876543210, 919876543210",
            "98765 43210, 9876543210",
            "'(040) 1234567', 0401234567",
            "'+91 98765-43210', 919876543210",
            "'+91 (040) 123-4567', 910401234567"
    })
    void normalizeAndValidate_ValidInputs_ReturnsNormalizedDigits(String rawPhone, String expectedNormalized) {
        String result = PhoneUtil.normalizeAndValidate(rawPhone);
        assertEquals(expectedNormalized, result);
        assertTrue(PhoneUtil.isValid(rawPhone));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "555",
            "12345-----",
            "----------",
            "()()()()()",
            "          ",
            "abc1234567",
            "1234 567",
            "++9876543210",
            "98+76543210",
            "1234567890123456" // 16 digits (exceeds max 15)
    })
    void normalizeAndValidate_InvalidInputs_ThrowsIllegalArgumentException(String invalidRaw) {
        assertThrows(IllegalArgumentException.class, () -> PhoneUtil.normalizeAndValidate(invalidRaw));
        assertFalse(PhoneUtil.isValid(invalidRaw));
    }

    @Test
    void normalizeAndValidate_NullInput_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> PhoneUtil.normalizeAndValidate(null));
        assertFalse(PhoneUtil.isValid(null));
    }
}
