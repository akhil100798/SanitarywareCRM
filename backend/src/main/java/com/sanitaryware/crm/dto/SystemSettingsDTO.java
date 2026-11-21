package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettingsDTO {
    private Long id;
    private String companyName;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String phone;
    private String email;
    private String website;
    private String gstNumber;
    private String currencySymbol;

    @jakarta.validation.constraints.Pattern(
        regexp = "^$|^(https?://|data:image/).*",
        message = "Logo URL must start with http://, https://, or data:image/"
    )
    private String logoUrl;
}
