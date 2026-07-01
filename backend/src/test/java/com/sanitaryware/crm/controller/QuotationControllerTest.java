package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.QuotationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class QuotationControllerTest {

    @Mock
    private QuotationService quotationService;

    @InjectMocks
    private QuotationController quotationController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(quotationController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(
                        new MappingJackson2HttpMessageConverter(objectMapper),
                        new ByteArrayHttpMessageConverter()
                )
                .build();
    }


    @Test
    void createQuotation_WithValidRequest_ReturnsOk() throws Exception {
        QuotationDTO quotation = new QuotationDTO();
        quotation.setId(1L);

        when(quotationService.createQuotation(any(QuotationDTO.class))).thenReturn(quotation);

        mockMvc.perform(post("/api/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": 1,
                                  "validUntil": "2026-08-30",
                                  "status": "DRAFT",
                                  "items": [
                                    {
                                      "productId": 1,
                                      "quantity": 5,
                                      "unitPrice": 150.0
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        verify(quotationService).createQuotation(any(QuotationDTO.class));
    }

    @Test
    void createQuotation_WithEmptyItems_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": 1,
                                  "validUntil": "2026-08-30",
                                  "status": "DRAFT",
                                  "items": []
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createQuotation_WithNullItems_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/quotations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "customerId": 1,
                                  "validUntil": "2026-08-30",
                                  "status": "DRAFT",
                                  "items": null
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateStatus_ReturnsUpdatedQuotation() throws Exception {
        QuotationDTO quotation = new QuotationDTO();
        quotation.setId(1L);
        quotation.setStatus("ACCEPTED");

        when(quotationService.updateStatus(eq(1L), eq("ACCEPTED"))).thenReturn(quotation);

        mockMvc.perform(patch("/api/quotations/{id}/status", 1L)
                        .param("status", "ACCEPTED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        verify(quotationService).updateStatus(1L, "ACCEPTED");
    }

    @Test
    void getQuotationPdf_ReturnsPdfBytes() throws Exception {
        byte[] pdfContent = new byte[]{1, 2, 3};

        when(quotationService.getQuotationPdf(1L)).thenReturn(pdfContent);

        mockMvc.perform(get("/api/quotations/{id}/pdf", 1L))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"quotation-1.pdf\""))
                .andExpect(content().bytes(pdfContent));

        verify(quotationService).getQuotationPdf(1L);
    }
}


