package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.CategoryDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        // NOTE: standaloneSetup does NOT load the Spring Security filter chain.
        // @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") on DELETE/POST/PUT is verified
        // at the integration level via the Playwright API automation suite (NEG-009, NEG-010).
        mockMvc = MockMvcBuilders.standaloneSetup(categoryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void createCategory_WithValidRequest_ReturnsCreated() throws Exception {
        CategoryDTO category = CategoryDTO.builder()
                .id(1L)
                .name("Ceramics")
                .description("Vitreous china products")
                .isActive(true)
                .build();

        when(categoryService.createCategory(any(CategoryDTO.class))).thenReturn(category);

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ceramics",
                                  "description": "Vitreous china products"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Ceramics"));

        verify(categoryService).createCategory(any(CategoryDTO.class));
    }

    @Test
    void getAllCategories_ReturnsList() throws Exception {
        CategoryDTO category = CategoryDTO.builder()
                .id(1L)
                .name("Ceramics")
                .build();

        when(categoryService.getAllCategories()).thenReturn(Collections.singletonList(category));

        mockMvc.perform(get("/api/categories")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Ceramics"));

        verify(categoryService).getAllCategories();
    }

    @Test
    void deleteCategory_ReturnsNoContent() throws Exception {
        // Verifies controller logic returns 204 when service succeeds.
        // @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") RBAC enforcement is tested
        // at the integration level — standalone MockMvc bypasses the security filter chain.
        mockMvc.perform(delete("/api/categories/{id}", 1L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(1L);
    }

    @Test
    void createCategory_WithBlankName_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "description": "Vitreous china products"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}

