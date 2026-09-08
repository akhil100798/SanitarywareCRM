package com.sanitaryware.crm.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ValidPhoneNumberValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPhoneNumber {
    String message() default "Phone number must contain between 10 and 15 digits and valid formatting";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
