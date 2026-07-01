package com.sanitaryware.crm.dto;

import com.sanitaryware.crm.entity.Customer.CustomerType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {
    private Long id;
    
    @NotBlank(message = "Customer name is required")
    private String name;
    
    private String email;
    
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;
    
    private String alternatePhone;
    private String company;
    private String gstNumber;
    private CustomerType customerType;
    private String billingAddress;
    private String shippingAddress;
    private String city;
    private String state;
    private String pincode;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
