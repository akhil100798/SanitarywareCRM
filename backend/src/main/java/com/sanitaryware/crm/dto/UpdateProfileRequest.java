package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String email;
    private String currentPassword; // Required if changing password
    private String newPassword;
}
