package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DistributorDTO {
    private Long id;
    @jakarta.validation.constraints.NotBlank(message = "Distributor name is required")
    private String name;
    private String contactPerson;
    @jakarta.validation.constraints.Email(message = "Please provide a valid email address")
    private String email;
    @jakarta.validation.constraints.Pattern(regexp = "^$|^[0-9+ -]{10,15}$", message = "Phone number must be between 10 and 15 digits")
    private String phoneNumber;
    private String alternatePhone;
    @jakarta.validation.constraints.Pattern(regexp = "^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", message = "Invalid GSTIN format: Must be 15 alphanumeric characters")
    private String gstNumber;
    private String address;
    private String city;
    private String state;
    @jakarta.validation.constraints.Pattern(regexp = "^$|^[1-9][0-9]{5}$", message = "Indian pincodes must be 6 digits")
    private String pincode;
    private String bankName;
    private String bankAccountNumber;
    private String bankIfsc;
    private BigDecimal outstandingBalance;
    private Boolean isActive;
    private String notes;
}
