package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BoqImportResponseDTO;
import org.springframework.web.multipart.MultipartFile;

public interface BoqImportService {
    BoqImportResponseDTO parseAndMatchBoq(MultipartFile file);
}
