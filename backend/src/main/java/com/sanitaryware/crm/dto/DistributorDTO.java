package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DistributorDTO {
    private Long id;
    @NotBlank(message = "Distributor name is required")
    @Size(max = 200)
    private String name;
    private String contactPerson;
    @Email(message = "Enter a valid email address")
    @Size(max = 100)
    private String email;
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9][0-9 ()-]{6,13}$", message = "Enter a valid phone number")
    @Size(max = 15)
    private String phoneNumber;
    private String alternatePhone;
    private String gstNumber;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String bankName;
    private String bankAccountNumber;
    private String bankIfsc;
    private BigDecimal outstandingBalance;
    private Boolean isActive;
    private String notes;
}
