package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.SystemSettingsDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.service.SystemSettingsService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {ProductController.class, SystemSettingsController.class})
@Import({AuthorizationControllerTest.TestSecurityConfig.class, GlobalExceptionHandler.class, PaginationFactory.class})
class AuthorizationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    @MockBean
    private SystemSettingsService systemSettingsService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanCreateUpdateAndDeleteProducts() throws Exception {
        assertManagementCanMutateProducts();
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerCanCreateUpdateAndDeleteProducts() throws Exception {
        assertManagementCanMutateProducts();
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCannotCreateUpdateOrDeleteProducts() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validProduct())))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/products/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validProduct())))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/products/{id}", 7L))
                .andExpect(status().isForbidden());

        verify(productService, never()).createProduct(any(ProductDTO.class));
        verify(productService, never()).updateProduct(eq(7L), any(ProductDTO.class));
        verify(productService, never()).deleteProduct(7L);
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCanListAndSearchProducts() throws Exception {
        when(productService.getAllProducts(any())).thenReturn(Page.empty());
        when(productService.searchProducts(eq("basin"), any())).thenReturn(Page.empty());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/search").param("query", "basin"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanUpdateSettings() throws Exception {
        assertCanUpdateSettings();
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerCanUpdateSettings() throws Exception {
        assertCanUpdateSettings();
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCannotUpdateSettings() throws Exception {
        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settings())))
                .andExpect(status().isForbidden());

        verify(systemSettingsService, never()).updateSettings(any(SystemSettingsDTO.class));
    }

    @Test
    void unauthenticatedUserCannotUpdateSettings() throws Exception {
        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settings())))
                .andExpect(status().isUnauthorized());

        verify(systemSettingsService, never()).updateSettings(any(SystemSettingsDTO.class));
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCanReadSettings() throws Exception {
        when(systemSettingsService.getSettings()).thenReturn(settings());

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk());
    }

    private void assertManagementCanMutateProducts() throws Exception {
        ProductDTO product = validProduct();
        when(productService.createProduct(any(ProductDTO.class))).thenReturn(product);
        when(productService.updateProduct(eq(7L), any(ProductDTO.class))).thenReturn(product);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/products/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(product)))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/products/{id}", 7L))
                .andExpect(status().isNoContent());
    }

    private void assertCanUpdateSettings() throws Exception {
        SystemSettingsDTO settings = settings();
        when(systemSettingsService.updateSettings(any(SystemSettingsDTO.class))).thenReturn(settings);

        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settings)))
                .andExpect(status().isOk());
    }

    private ProductDTO validProduct() {
        return ProductDTO.builder()
                .sku("AUTH-001")
                .name("Authorization Basin")
                .categoryId(1L)
                .brandId(1L)
                .mrp(new BigDecimal("1200.00"))
                .sellingPrice(new BigDecimal("1000.00"))
                .stockQuantity(5)
                .build();
    }

    private SystemSettingsDTO settings() {
        return SystemSettingsDTO.builder()
                .companyName("HydroSleek CRM")
                .currencySymbol("INR")
                .build();
    }

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {

        @Bean
        SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .httpBasic(httpBasic -> { })
                    .build();
        }
    }
}
