package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.FileUploadService;
import com.sanitaryware.crm.service.FileDownloadAuthorizationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FileUploadControllerTest {

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private FileDownloadAuthorizationService fileDownloadAuthorizationService;

    @InjectMocks
    private FileUploadController fileUploadController;

    @Test
    void downloadFile_RejectsKnownPrivateAttachmentWithoutParentAuthorization() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(fileUploadController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        doThrow(new org.springframework.security.access.AccessDeniedException("forbidden"))
                .when(fileDownloadAuthorizationService)
                .authorizeDownload("billpads", "known-order-file.png");

        mockMvc.perform(get("/api/files/download/billpads/known-order-file.png"))
                .andExpect(status().isForbidden());
    }

    @Test
    void downloadFile_ReturnsAttachmentAfterParentAuthorization() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(fileUploadController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        when(fileUploadService.loadFileAsResource("billpads/known-order-file.png"))
                .thenReturn(new ByteArrayResource(new byte[] {1}));

        mockMvc.perform(get("/api/files/download/billpads/known-order-file.png"))
                .andExpect(status().isOk());
    }

    @Test
    void downloadNestedFile_ReturnsImageWithInlineDisposition() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(fileUploadController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        when(fileUploadService.loadFileAsResource("products/catalogue/image-123.png"))
                .thenReturn(new ByteArrayResource(new byte[] {1}) {
                    @Override
                    public String getFilename() {
                        return "image-123.png";
                    }
                });

        mockMvc.perform(get("/api/files/download/products/catalogue/image-123.png"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string(
                        org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"image-123.png\""
                ));
    }
}
