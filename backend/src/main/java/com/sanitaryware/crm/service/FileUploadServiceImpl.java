package com.sanitaryware.crm.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FileUploadServiceImpl implements FileUploadService {

    private final Path fileStorageLocation;
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".csv", ".xlsx");
    private static final long MAX_UPLOAD_SIZE_BYTES = 10L * 1024 * 1024;
    private static final Map<String, List<String>> ALLOWED_MEDIA_TYPES = Map.of(
            ".jpg", List.of("image/jpeg"),
            ".jpeg", List.of("image/jpeg"),
            ".png", List.of("image/png"),
            ".pdf", List.of("application/pdf"),
            ".doc", List.of("application/msword"),
            ".docx", List.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ".xlsx", List.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ".csv", List.of("text/csv", "application/csv", "application/vnd.ms-excel")
    );

    public FileUploadServiceImpl(@Value("${file.upload-dir:./uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory) {
        // Normalize file name
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());

        try {
            // Check if the file's name contains invalid characters
            if (originalFileName.contains("..")) {
                throw new IllegalArgumentException("Filename contains invalid path sequence");
            }

            if (subDirectory != null && subDirectory.contains("..")) {
                throw new IllegalArgumentException("Invalid characters in directory type");
            }

            // Check file extension
            String fileExtension = "";
            int i = originalFileName.lastIndexOf('.');
            if (i > 0) {
                fileExtension = originalFileName.substring(i).toLowerCase();
            }
            
            if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
                throw new IllegalArgumentException("Unsupported file type");
            }

            validateUpload(file, fileExtension);
            
            String newFileName = UUID.randomUUID().toString() + fileExtension;
            
            Path targetLocation = this.fileStorageLocation;
            if (subDirectory != null && !subDirectory.trim().isEmpty()) {
                targetLocation = this.fileStorageLocation.resolve(subDirectory).normalize();
                if (!targetLocation.startsWith(this.fileStorageLocation)) {
                    throw new IllegalArgumentException("Cannot store file outside the upload directory");
                }
                Files.createDirectories(targetLocation);
                newFileName = subDirectory + "/" + newFileName; // returning relative path
            }

            // Copy file to the target location (Replacing existing file with the same name)
            Path finalPath = this.fileStorageLocation.resolve(newFileName).normalize();
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, finalPath, StandardCopyOption.REPLACE_EXISTING);
            }

            return newFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    private void validateUpload(MultipartFile file, String extension) throws IOException {
        if (file.isEmpty() || file.getSize() <= 0) {
            throw new IllegalArgumentException("File must not be empty");
        }
        if (file.getSize() > MAX_UPLOAD_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MEDIA_TYPES.get(extension).contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("File media type does not match its extension");
        }

        try (InputStream input = file.getInputStream()) {
            byte[] signature = input.readNBytes(8);
            if (!hasExpectedSignature(extension, signature)) {
                throw new IllegalArgumentException("File content does not match its extension");
            }
        }
    }

    private boolean hasExpectedSignature(String extension, byte[] signature) {
        return switch (extension) {
            case ".jpg", ".jpeg" -> startsWith(signature, 0xFF, 0xD8, 0xFF);
            case ".png" -> startsWith(signature, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case ".pdf" -> startsWith(signature, 0x25, 0x50, 0x44, 0x46, 0x2D);
            case ".doc" -> startsWith(signature, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
            case ".docx", ".xlsx" -> startsWith(signature, 0x50, 0x4B, 0x03, 0x04);
            case ".csv" -> isTextual(signature);
            default -> false;
        };
    }

    private boolean startsWith(byte[] data, int... expected) {
        if (data.length < expected.length) return false;
        for (int index = 0; index < expected.length; index++) {
            if (Byte.toUnsignedInt(data[index]) != expected[index]) return false;
        }
        return true;
    }

    private boolean isTextual(byte[] data) {
        for (byte value : data) {
            int unsigned = Byte.toUnsignedInt(value);
            if (unsigned == 0 || (unsigned < 9) || (unsigned > 13 && unsigned < 32)) return false;
        }
        return true;
    }

    @Override
    public String storeGeneratedFile(byte[] content, String extension, String subDirectory) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Generated file content cannot be empty");
        }
        String normalizedExtension = extension == null ? "" : extension.trim().toLowerCase();
        if (!normalizedExtension.startsWith(".")) {
            normalizedExtension = "." + normalizedExtension;
        }
        if (!ALLOWED_EXTENSIONS.contains(normalizedExtension)) {
            throw new IllegalArgumentException("Generated file type not allowed: " + normalizedExtension);
        }
        if (subDirectory == null || subDirectory.isBlank() || subDirectory.contains("..")) {
            throw new IllegalArgumentException("A valid generated-file directory is required");
        }

        try {
            Path targetDirectory = fileStorageLocation.resolve(subDirectory).normalize();
            if (!targetDirectory.startsWith(fileStorageLocation)) {
                throw new IllegalArgumentException("Cannot store file outside current directory");
            }
            Files.createDirectories(targetDirectory);
            String fileName = UUID.randomUUID() + normalizedExtension;
            Files.write(targetDirectory.resolve(fileName), content);
            return subDirectory + "/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store generated catalogue image", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new IllegalArgumentException("Invalid file path");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable() && Files.isRegularFile(filePath)) {
                return resource;
            } else {
                throw new com.sanitaryware.crm.exception.ResourceNotFoundException("File not found");
            }
        } catch (MalformedURLException ex) {
            throw new com.sanitaryware.crm.exception.ResourceNotFoundException("File not found");
        }
    }
    
    @Override
    public void deleteFile(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation) || filePath.equals(this.fileStorageLocation)) {
                throw new IllegalArgumentException("Invalid file path");
            }
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to delete file " + fileName, ex);
        }
    }
}
