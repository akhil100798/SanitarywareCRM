package com.sanitaryware.crm.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class FileUploadServiceImplTest {
    @TempDir
    Path directory;

    @Test
    void refusesDeletionOutsideUploadRoot() throws Exception {
        Path outside = Files.writeString(directory.resolve("outside.txt"), "keep");
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.resolve("uploads").toString());
        assertThrows(IllegalArgumentException.class, () -> service.deleteFile("../outside.txt"));
        assertEquals("keep", Files.readString(outside));
    }

    @Test
    void deletesOnlyRequestedUpload() throws Exception {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        Path file = Files.writeString(directory.resolve("upload.txt"), "delete");
        service.deleteFile("upload.txt");
        assertFalse(Files.exists(file));
        service.deleteFile("upload.txt");
    }

    @Test
    void acceptsNonEmptyPngWithMatchingSignatureAndMediaType() {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "image.png", "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00});

        String storedName = service.storeFile(file, "products");

        assertTrue(storedName.startsWith("products/"));
        assertTrue(storedName.endsWith(".png"));
    }

    @Test
    void rejectsZeroByteUpload() {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);

        assertThrows(IllegalArgumentException.class, () -> service.storeFile(file, "products"));
    }

    @Test
    void rejectsTextDisguisedAsPng() {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.storeFile(file, "products"));
    }

    @Test
    void rejectsUnsupportedUploadType() {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "script.txt", "text/plain", "safe text".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.storeFile(file, "products"));
    }

    @Test
    void rejectsUploadOverMaximumSize() {
        FileUploadServiceImpl service = new FileUploadServiceImpl(directory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "large.pdf", "application/pdf",
                new byte[10 * 1024 * 1024 + 1]);

        assertThrows(IllegalArgumentException.class, () -> service.storeFile(file, "invoices"));
    }
}
