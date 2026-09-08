package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.service.FileUploadService;
import com.sanitaryware.crm.service.FileDownloadAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;
    private final FileDownloadAuthorizationService fileDownloadAuthorizationService;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file, 
                                                          @RequestParam(value = "type", defaultValue = "general") String type) {
        String fileName = fileUploadService.storeFile(file, type);

        String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/files/download/")
                .path(fileName)
                .toUriString();

        Map<String, String> response = new HashMap<>();
        response.put("fileName", fileName);
        response.put("fileDownloadUri", fileDownloadUri);
        response.put("fileType", file.getContentType());
        response.put("size", String.valueOf(file.getSize()));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/download/{type}/{subType}/{fileName:.+}")
    public ResponseEntity<Resource> downloadNestedFile(@PathVariable String type,
                                                       @PathVariable String subType,
                                                       @PathVariable String fileName,
                                                       HttpServletRequest request) {
        return serveFile(type + "/" + subType, fileName, request);
    }

    @GetMapping("/download/{type}/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String type,
                                                 @PathVariable String fileName,
                                                 HttpServletRequest request) {
        return serveFile(type, fileName, request);
    }

    private ResponseEntity<Resource> serveFile(String type, String fileName, HttpServletRequest request) {
        fileDownloadAuthorizationService.authorizeDownload(type, fileName);
        // Load file as Resource
        Resource resource = fileUploadService.loadFileAsResource(type + "/" + fileName);

        // Try to determine file's content type
        String contentType = null;
        try {
            if (resource.getFile() != null) {
                contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
            }
        } catch (Exception ex) {
            // Fallback
        }

        // Fallback to the default content type if type could not be determined
        if (contentType == null) {
            String lowerName = fileName.toLowerCase();
            if (lowerName.endsWith(".png")) {
                contentType = "image/png";
            } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (lowerName.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (lowerName.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else {
                contentType = "application/octet-stream";
            }
        }

        String disposition = contentType.startsWith("image/") ? "inline" : "attachment";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
