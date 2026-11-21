package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BulkUploadResponse;
import com.sanitaryware.crm.dto.CatalogImportPreviewResponse;
import com.sanitaryware.crm.dto.CatalogJobProgressDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogJobService {

    private final CatalogPdfImportService catalogPdfImportService;
    private final BrandRepository brandRepository;
    private final AuditService auditService;

    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Map<String, CatalogJobState> jobs = new ConcurrentHashMap<>();
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public static class CatalogJobState {
        public String jobId;
        public String jobType; // "PREVIEW" or "IMPORT"
        public Long brandId;
        public String brandName;
        public String fileName;
        public volatile String status; // "PENDING", "PROCESSING", "COMPLETED", "FAILED"
        public volatile int currentPage;
        public volatile int totalPages;
        public volatile int progressPercent;
        public volatile String stageMessage;
        public volatile int productsFound;
        public volatile int imagesCropped;
        public volatile CatalogImportPreviewResponse previewResult;
        public volatile BulkUploadResponse importResult;
        public volatile String errorMessage;
        public long createdAt = System.currentTimeMillis();
        public long updatedAt = System.currentTimeMillis();
    }

    public CatalogJobProgressDTO submitPreviewJob(Long brandId, MultipartFile file) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a PDF file to upload.");
        }

        String jobId = UUID.randomUUID().toString();
        Path tempPath = saveToTemp(file);

        CatalogJobState state = new CatalogJobState();
        state.jobId = jobId;
        state.jobType = "PREVIEW";
        state.brandId = brand.getId();
        state.brandName = brand.getName();
        state.fileName = file.getOriginalFilename();
        state.status = "PROCESSING";
        state.stageMessage = "Catalog uploaded. Starting analysis...";
        jobs.put(jobId, state);

        executor.submit(() -> {
            try {
                MultipartFile preservedFile = new PreservedMultipartFile(tempPath, state.fileName, file.getContentType());
                CatalogImportPreviewResponse response = catalogPdfImportService.previewCatalog(
                        brand, preservedFile,
                        (cur, total, msg, prods, imgs) -> updateProgress(jobId, cur, total, msg, prods, imgs)
                );
                state.previewResult = response;
                state.status = "COMPLETED";
                state.progressPercent = 100;
                state.stageMessage = "Analysis complete! " + response.candidateCount() + " products identified.";
                state.updatedAt = System.currentTimeMillis();
                notifyEmitters(jobId, toDto(state));
            } catch (Throwable t) {
                log.error("Async catalog preview job failed: " + jobId, t);
                state.status = "FAILED";
                state.errorMessage = t.getMessage() != null ? t.getMessage() : "Failed to parse catalog PDF";
                state.updatedAt = System.currentTimeMillis();
                notifyEmitters(jobId, toDto(state));
            } finally {
                try {
                    Files.deleteIfExists(tempPath);
                } catch (IOException ignored) {}
            }
        });

        cleanupOldJobs();
        return toDto(state);
    }

    public CatalogJobProgressDTO submitImportJob(Long brandId, MultipartFile file, String reviewedSha256,
                                                List<String> selectedSkus, Set<String> unavailableSkus) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + brandId));
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a PDF file to upload.");
        }

        String jobId = UUID.randomUUID().toString();
        Path tempPath = saveToTemp(file);

        CatalogJobState state = new CatalogJobState();
        state.jobId = jobId;
        state.jobType = "IMPORT";
        state.brandId = brand.getId();
        state.brandName = brand.getName();
        state.fileName = file.getOriginalFilename();
        state.status = "PROCESSING";
        state.stageMessage = "Starting database import...";
        jobs.put(jobId, state);

        executor.submit(() -> {
            try {
                MultipartFile preservedFile = new PreservedMultipartFile(tempPath, state.fileName, file.getContentType());
                BulkUploadResponse response = catalogPdfImportService.importCatalog(
                        brand, preservedFile, reviewedSha256, selectedSkus, unavailableSkus,
                        (cur, total, msg, prods, imgs) -> updateProgress(jobId, cur, total, msg, prods, imgs)
                );
                state.importResult = response;
                state.status = "COMPLETED";
                state.progressPercent = 100;
                state.stageMessage = "Import complete! " + response.getTotalProcessed() + " products saved.";
                state.updatedAt = System.currentTimeMillis();

                auditService.logEvent("BULK_IMPORT_ASYNC", "PRODUCT", brand.getId(),
                        "Async imported " + response.getTotalProcessed() + " products for brand " + brand.getName());

                notifyEmitters(jobId, toDto(state));
            } catch (Throwable t) {
                log.error("Async catalog import job failed: " + jobId, t);
                state.status = "FAILED";
                state.errorMessage = t.getMessage() != null ? t.getMessage() : "Failed to import catalog products";
                state.updatedAt = System.currentTimeMillis();
                notifyEmitters(jobId, toDto(state));
            } finally {
                try {
                    Files.deleteIfExists(tempPath);
                } catch (IOException ignored) {}
            }
        });

        cleanupOldJobs();
        return toDto(state);
    }

    public CatalogJobProgressDTO getJobProgress(String jobId) {
        CatalogJobState state = jobs.get(jobId);
        if (state == null) {
            throw new ResourceNotFoundException("Catalog job not found: " + jobId);
        }
        return toDto(state);
    }

    public SseEmitter registerEmitter(String jobId) {
        CatalogJobState state = jobs.get(jobId);
        if (state == null) {
            throw new ResourceNotFoundException("Catalog job not found: " + jobId);
        }

        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10 minutes timeout
        emitters.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError((ex) -> removeEmitter(jobId, emitter));

        try {
            emitter.send(SseEmitter.event().name("progress").data(toDto(state)));
            if ("COMPLETED".equals(state.status) || "FAILED".equals(state.status)) {
                emitter.complete();
            }
        } catch (IOException ignored) {}

        return emitter;
    }

    private void updateProgress(String jobId, int current, int total, String msg, int prods, int imgs) {
        CatalogJobState state = jobs.get(jobId);
        if (state == null) return;
        state.currentPage = current;
        state.totalPages = total;
        state.stageMessage = msg;
        state.productsFound = prods;
        state.imagesCropped = imgs;
        if (total > 0) {
            state.progressPercent = Math.min(99, Math.max(1, (int) Math.round(((double) current / total) * 100.0)));
        }
        state.updatedAt = System.currentTimeMillis();
        notifyEmitters(jobId, toDto(state));
    }

    private void notifyEmitters(String jobId, CatalogJobProgressDTO dto) {
        List<SseEmitter> list = emitters.get(jobId);
        if (list == null || list.isEmpty()) return;
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name("progress").data(dto));
                if ("COMPLETED".equals(dto.status()) || "FAILED".equals(dto.status())) {
                    emitter.complete();
                }
            } catch (Exception e) {
                removeEmitter(jobId, emitter);
            }
        }
    }

    private void removeEmitter(String jobId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(jobId);
        if (list != null) {
            list.remove(emitter);
        }
    }

    private void cleanupOldJobs() {
        long cutoff = System.currentTimeMillis() - TimeUnit.HOURS.toMillis(2);
        jobs.entrySet().removeIf(entry -> entry.getValue().createdAt < cutoff);
        emitters.entrySet().removeIf(entry -> !jobs.containsKey(entry.getKey()));
    }

    private Path saveToTemp(MultipartFile file) {
        try {
            Path temp = Files.createTempFile("crm-job-upload-", ".pdf");
            file.transferTo(temp);
            return temp;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not buffer upload file", e);
        }
    }

    private CatalogJobProgressDTO toDto(CatalogJobState s) {
        return new CatalogJobProgressDTO(
                s.jobId, s.jobType, s.brandName, s.fileName, s.status,
                s.currentPage, s.totalPages, s.progressPercent, s.stageMessage,
                s.productsFound, s.imagesCropped, s.previewResult, s.importResult, s.errorMessage
        );
    }

    private static class PreservedMultipartFile implements MultipartFile {
        private final Path path;
        private final String name;
        private final String contentType;

        PreservedMultipartFile(Path path, String name, String contentType) {
            this.path = path;
            this.name = name;
            this.contentType = contentType;
        }

        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() {
            try {
                return Files.size(path) == 0;
            } catch (IOException e) {
                return true;
            }
        }
        @Override public long getSize() {
            try {
                return Files.size(path);
            } catch (IOException e) {
                return 0;
            }
        }
        @Override public byte[] getBytes() throws IOException { return Files.readAllBytes(path); }
        @Override public InputStream getInputStream() throws IOException { return Files.newInputStream(path); }
        @Override public Resource getResource() { return new FileSystemResource(path.toFile()); }
        @Override public void transferTo(File dest) throws IOException {
            Files.copy(path, dest.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
