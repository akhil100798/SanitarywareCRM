package com.sanitaryware.crm.dto;

import com.sanitaryware.crm.entity.User;
import java.time.LocalDateTime;

public record UserAdminDTO(
        Long id,
        String username,
        String email,
        String fullName,
        String phoneNumber,
        String role,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastLogin
) {
    public static UserAdminDTO from(User user) {
        return new UserAdminDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getRole().name(),
                Boolean.TRUE.equals(user.getIsActive()),
                user.getCreatedAt(),
                user.getLastLogin()
        );
    }
}
