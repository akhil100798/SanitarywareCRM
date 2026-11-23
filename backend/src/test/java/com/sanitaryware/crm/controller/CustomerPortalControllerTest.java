package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.security.PortalRateLimiter;
import com.sanitaryware.crm.security.TooManyRequestsException;
import com.sanitaryware.crm.service.QuotationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CustomerPortalControllerTest {

    @Mock
    private QuotationService quotationService;

    @Mock
    private PortalRateLimiter portalRateLimiter;

    @InjectMocks
    private CustomerPortalController customerPortalController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private QuotationDTO sampleQuotationDTO;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerPortalController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(
                        new MappingJackson2HttpMessageConverter(objectMapper),
                        new ByteArrayHttpMessageConverter()
                )
                .build();

        sampleQuotationDTO = new QuotationDTO();
        sampleQuotationDTO.setId(10L);
        sampleQuotationDTO.setQuotationNumber("QT-TEST-001");
        sampleQuotationDTO.setShareToken("token-abc-123");
        sampleQuotationDTO.setCustomerId(1L);
        sampleQuotationDTO.setCustomerName("John Doe");
        sampleQuotationDTO.setTotal(new BigDecimal("12500.00"));
        sampleQuotationDTO.setStatus("SENT");
        sampleQuotationDTO.setQuotationDate(LocalDate.now());
        sampleQuotationDTO.setValidUntil(LocalDate.now().plusDays(10));
        sampleQuotationDTO.setItems(List.of());
    }

    @Test
    @DisplayName("GET /api/portal/quotations/{token} returns quotation DTO")
    void testGetQuotationByToken() throws Exception {
        when(quotationService.getQuotationByShareToken("token-abc-123")).thenReturn(sampleQuotationDTO);

        mockMvc.perform(get("/api/portal/quotations/token-abc-123")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quotationNumber").value("QT-TEST-001"))
                .andExpect(jsonPath("$.shareToken").value("token-abc-123"))
                .andExpect(jsonPath("$.total").value(12500.00));

        verify(quotationService).getQuotationByShareToken("token-abc-123");
    }

    @Test
    @DisplayName("GET /api/portal/quotations/{token}/pdf returns byte array")
    void testGetQuotationPdfByToken() throws Exception {
        byte[] fakePdf = "%PDF-1.4 test pdf content".getBytes();
        when(quotationService.getQuotationByShareToken("token-abc-123")).thenReturn(sampleQuotationDTO);
        when(quotationService.getQuotationPdfByShareToken("token-abc-123")).thenReturn(fakePdf);

        mockMvc.perform(get("/api/portal/quotations/token-abc-123/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"quotation-QT-TEST-001.pdf\""))
                .andExpect(content().bytes(fakePdf));
    }

    @Test
    @DisplayName("POST /api/portal/quotations/{token}/accept updates status to ACCEPTED")
    void testAcceptQuotationByToken() throws Exception {
        sampleQuotationDTO.setStatus("ACCEPTED");
        when(quotationService.acceptQuotationByShareToken("token-abc-123")).thenReturn(sampleQuotationDTO);

        mockMvc.perform(post("/api/portal/quotations/token-abc-123/accept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        verify(quotationService).acceptQuotationByShareToken("token-abc-123");
    }

    @Test
    @DisplayName("GET /api/portal/quotations/{token} returns 429 when rate limit is exceeded")
    void testRateLimitExceededReturns429() throws Exception {
        doThrow(new TooManyRequestsException()).when(portalRateLimiter).checkAllowed(anyString());

        mockMvc.perform(get("/api/portal/quotations/token-abc-123")
                        .header("X-Forwarded-For", "203.0.113.195"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }
}
