package com.sanitaryware.crm.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileUploadServiceImpl implements FileUploadService {

    private final Path fileStorageLocation;
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".csv", ".xlsx");

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
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + originalFileName);
            }

            if (subDirectory != null && subDirectory.contains("..")) {
                throw new RuntimeException("Invalid characters in directory type");
            }

            // Check file extension
            String fileExtension = "";
            int i = originalFileName.lastIndexOf('.');
            if (i > 0) {
                fileExtension = originalFileName.substring(i).toLowerCase();
            }
            
            if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
                throw new RuntimeException("File type not allowed. Allowed: " + ALLOWED_EXTENSIONS);
            }
            
            String newFileName = UUID.randomUUID().toString() + fileExtension;
            
            Path targetLocation = this.fileStorageLocation;
            if (subDirectory != null && !subDirectory.trim().isEmpty()) {
                targetLocation = this.fileStorageLocation.resolve(subDirectory).normalize();
                if (!targetLocation.startsWith(this.fileStorageLocation)) {
                    throw new RuntimeException("Cannot store file outside current directory");
                }
                Files.createDirectories(targetLocation);
                newFileName = subDirectory + "/" + newFileName; // returning relative path
            }

            // Copy file to the target location (Replacing existing file with the same name)
            Path finalPath = this.fileStorageLocation.resolve(newFileName).normalize();
            Files.copy(file.getInputStream(), finalPath, StandardCopyOption.REPLACE_EXISTING);

            return newFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new RuntimeException("Invalid file path");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + fileName, ex);
        }
    }
    
    @Override
    public void deleteFile(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to delete file " + fileName, ex);
        }
    }
}
