package com.sanitaryware.crm.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {
    String storeFile(MultipartFile file, String subDirectory);
    Resource loadFileAsResource(String fileName);
    void deleteFile(String fileName);
}
