package com.sanitaryware.crm.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandDTO {
    private Long id;

    @jakarta.validation.constraints.Size(max = 255, message = "Brand name must not exceed 255 characters")
    private String name;

    @jakarta.validation.constraints.Size(max = 1000, message = "Brand description must not exceed 1000 characters")
    private String description;

    @Pattern(regexp = "^$|^(https?://|data:image/).*", message = "Logo URL must start with http://, https://, or data:image/")
    private String logoUrl;
    private String catalogFileName;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
