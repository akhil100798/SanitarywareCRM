package com.sanitaryware.crm.exception;

import com.sanitaryware.crm.config.CorsConfig;
import com.sanitaryware.crm.config.SecurityConfig;
import com.sanitaryware.crm.controller.ProductController;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtAuthenticationFilter;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    private void assertSanitized(org.springframework.test.web.servlet.MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString().toLowerCase();
        for (String token : INTERNAL_TOKENS) assertThat(body).doesNotContain(token.toLowerCase());
    }
}
