package com.sanitaryware.crm.exception;

import com.sanitaryware.crm.config.CorsConfig;
import com.sanitaryware.crm.config.SecurityConfig;
import com.sanitaryware.crm.controller.ProductController;
import com.sanitaryware.crm.dto.CatalogImportPreviewItem;
import com.sanitaryware.crm.dto.CatalogImportPreviewResponse;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtAuthenticationFilter;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.security.TokenRevocationService;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProductController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class,
        GlobalExceptionHandler.class, PaginationFactory.class})
class GlobalExceptionHandlerTest {

    private static final String[] INTERNAL_TOKENS = {
            "java.lang", "org.springframework", "org.hibernate", "sql",
            "sqlstate", "constraint", "exception", "stacktrace"
    };

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenRevocationService tokenRevocationService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @Test
    @WithMockUser(roles = "ADMIN")
    void emptyProductBodyReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void malformedJsonReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void nonexistentApiRouteReturnsSanitizedNotFound() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void missingRequestParameterReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(patch("/api/products/{id}/stock", 7L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void typeMismatchReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(get("/api/products/{id}", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "SALES")
    void accessDeniedReturnsSanitizedForbidden() throws Exception {
        mockMvc.perform(delete("/api/products/{id}", 7L))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("You do not have access to this resource."))
                .andExpect(this::assertSanitized);
        verify(productService, never()).deleteProduct(7L);
    }

    @Test
    void unauthenticatedRequestReturnsSanitizedUnauthorized() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Authentication is required"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void dataIntegrityViolationReturnsSanitizedConflict() throws Exception {
        when(productService.getProductById(8L)).thenThrow(new DataIntegrityViolationException(
                "SQLState 23000 constraint uk_products_sku org.hibernate.ConstraintViolationException"));
        mockMvc.perform(get("/api/products/{id}", 8L))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Request conflicts with existing data"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void unexpectedRuntimeExceptionReturnsSanitizedServerError() throws Exception {
        when(productService.getProductById(9L)).thenThrow(new RuntimeException(
                "java.lang.IllegalStateException at com.example.ProductService SQL SELECT secret"));
        mockMvc.perform(get("/api/products/{id}", 9L))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.error").value("Internal Server Error"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(this::assertSanitized);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void responseStatusExceptionPreservesItsSafeHttpStatus() throws Exception {
        when(productService.getProductById(10L)).thenThrow(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        mockMvc.perform(get("/api/products/{id}", 10L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Product not found"))
                .andExpect(this::assertSanitized);
    }

    @Test
    void oversizedMultipartRequestReturnsPayloadTooLarge() {
        var response = new GlobalExceptionHandler()
                .handleMaxUploadSizeExceeded(new MaxUploadSizeExceededException(160L * 1024 * 1024));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Uploaded files must be 160 MB or smaller.");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void catalogUploadWithoutExplicitConfirmationDoesNotInvokeImport() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "catalog.pdf", "application/pdf", "%PDF".getBytes());

        mockMvc.perform(multipart("/api/products/bulk-catalog-upload")
                        .file(file)
                        .param("brandId", "2")
                        .param("previewSha256", "reviewed-hash"))
                .andExpect(status().isPreconditionRequired())
                .andExpect(jsonPath("$.message").value(
                        "Review the catalogue preview and explicitly confirm before importing."));

        verify(productService, never()).bulkCatalogUpload(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void catalogPreviewAcceptsMultipartFixtureAndDoesNotInvokeImport() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "catalog.pdf", "application/pdf", "%PDF".getBytes());
        CatalogImportPreviewResponse preview = new CatalogImportPreviewResponse(
                2L, "parryware", "catalog.pdf", file.getSize(), "abc123", 1, 1,
                1, 0, 0, 0, true,
                java.util.List.of(new CatalogImportPreviewItem(
                        "E8306", "Seat Cover", java.math.BigDecimal.valueOf(6650),
                        "CREATE", 1, null, null, null, null, null, null, null, true)),
                java.util.List.of());
        when(productService.previewCatalogUpload(eq(2L), any(MultipartFile.class))).thenReturn(preview);

        mockMvc.perform(multipart("/api/products/bulk-catalog-preview")
                        .file(file)
                        .param("brandId", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.importAllowed").value(true))
                .andExpect(jsonPath("$.items[0].sku").value("E8306"))
                .andExpect(jsonPath("$.items[0].sourcePage").value(1));

        verify(productService).previewCatalogUpload(eq(2L), any(MultipartFile.class));
        verify(productService, never()).bulkCatalogUpload(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void multipartParserReportsUploadLimitWhenCauseIndicatesOversize() {
        MultipartException exception = new MultipartException(
                "Could not parse multipart request",
                new IllegalStateException("File size exceeds the maximum permitted size"));

        var response = new GlobalExceptionHandler().handleMultipartException(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Uploaded files must be 160 MB or smaller.");
    }

    @Test
    void concurrentMutationIsAControlledConflictWithoutDatabaseDetails() {
        var response = new GlobalExceptionHandler().handleConcurrentMutation(
                new org.springframework.dao.PessimisticLockingFailureException("SQL deadlock at internal database host"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().message()).contains("retry").doesNotContain("SQL", "internal database");
    }

    @Test
    void deliberateBusinessValidationIsActionable() {
        var response = new GlobalExceptionHandler().handleBusinessValidation(
                new BusinessValidationException("Payment exceeds the balance due"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).isEqualTo("Payment exceeds the balance due");
    }

    private void assertSanitized(org.springframework.test.web.servlet.MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString().toLowerCase();
        for (String token : INTERNAL_TOKENS) assertThat(body).doesNotContain(token.toLowerCase());
    }
}
