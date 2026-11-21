package com.sanitaryware.crm.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerateBackToBackPoRequestDTO {

    @NotEmpty(message = "At least one purchase order group must be specified")
    @Valid
    private List<PoGroupRequestDTO> groups;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PoGroupRequestDTO {
        @NotNull(message = "Distributor is required for purchase order")
        private Long distributorId;
        private LocalDate orderDate;
        private LocalDate expectedDeliveryDate;
        private String notes;
        private String status;

        @NotEmpty(message = "At least one item must be ordered")
        @Valid
        private List<PurchaseOrderDTO.PurchaseOrderItemDTO> items;
    }
}
