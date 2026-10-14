package com.sanitaryware.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUploadResponse {
    private String batchId;
    private int createdCount;
    private int updatedCount;
    private int totalProcessed;
    private int imagesLinkedCount;
    private int imageLinkFailures;
    private int skippedCount;
    private List<String> errors;
}
