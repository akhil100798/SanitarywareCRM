package com.sanitaryware.crm.dto;

import com.sanitaryware.crm.entity.User;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserAccessRequest {

    @NotNull
    private User.UserRole role;

    @NotNull
    private Boolean active;
}
