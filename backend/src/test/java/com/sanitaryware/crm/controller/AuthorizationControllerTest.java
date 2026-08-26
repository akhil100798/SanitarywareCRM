package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.SystemSettingsDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.service.PurchaseOrderService;
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

@WebMvcTest(controllers = {ProductController.class, SystemSettingsController.class, PurchaseOrderController.class})
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
    private PurchaseOrderService purchaseOrderService;

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
    void adminCanUploadAndDeleteProductImages() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "image".getBytes());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/products/{id}/images", 7L)
                        .file(file))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/products/{id}/images/{imageId}", 7L, 10L))
                .andExpect(status().isNoContent());

        verify(productService).addProductImage(eq(7L), any(), any(), any());
        verify(productService).deleteProductImage(7L, 10L);
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerCanUploadAndDeleteProductImages() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "image".getBytes());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/products/{id}/images", 7L)
                        .file(file))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/products/{id}/images/{imageId}", 7L, 10L))
                .andExpect(status().isNoContent());

        verify(productService).addProductImage(eq(7L), any(), any(), any());
        verify(productService).deleteProductImage(7L, 10L);
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCannotUploadOrDeleteProductImages() throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "image".getBytes());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/products/{id}/images", 7L)
                        .file(file))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/products/{id}/images/{imageId}", 7L, 10L))
                .andExpect(status().isForbidden());

        verify(productService, never()).addProductImage(any(), any(), any(), any());
        verify(productService, never()).deleteProductImage(any(), any());
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCanReadProductImagesBarcodeAndHsn() throws Exception {
        mockMvc.perform(get("/api/products/{id}/images", 7L))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/barcode/{barcode}", "8901234567890"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/hsn/{hsnCode}", "69101000"))
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

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanReceivePurchaseOrder() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/{id}/receive", 55L))
                .andExpect(status().isOk());

        verify(purchaseOrderService).receivePurchaseOrder(55L);
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerCanReceivePurchaseOrder() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/{id}/receive", 55L))
                .andExpect(status().isOk());

        verify(purchaseOrderService).receivePurchaseOrder(55L);
    }

    @Test
    @WithMockUser(roles = "SALES")
    void salesCannotReceiveOrMutatePurchaseOrder() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/{id}/receive", 55L))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/purchase-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"distributorId\":1,\"items\":[{\"productId\":10,\"quantity\":2,\"unitCost\":100.00}]}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/purchase-orders/{id}", 55L))
                .andExpect(status().isForbidden());

        verify(purchaseOrderService, never()).receivePurchaseOrder(any());
        verify(purchaseOrderService, never()).createPurchaseOrder(any());
        verify(purchaseOrderService, never()).deletePurchaseOrder(any());
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
