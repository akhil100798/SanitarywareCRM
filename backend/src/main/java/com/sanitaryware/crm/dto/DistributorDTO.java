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
    private String name;
    private String contactPerson;
    private String email;
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
