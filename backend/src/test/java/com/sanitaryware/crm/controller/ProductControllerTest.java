package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    @Mock
    private ProductService productService;

    @Spy
    private PaginationFactory paginationFactory = new PaginationFactory();

    @InjectMocks
    private ProductController productController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(productController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void createProduct_WithoutCategoryAndBrand_ReturnsClearValidationErrors() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sku": "QA-1",
                                  "name": "QA Basin",
                                  "mrp": 1200,
                                  "sellingPrice": 1000,
                                  "stockQuantity": 5
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Category ID is required")))
                .andExpect(content().string(containsString("Brand ID is required")));

        verifyNoInteractions(productService);
    }

    @Test
    void createProduct_WithoutBody_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request"));
        verifyNoInteractions(productService);
    }

    @Test
    void createProduct_WithMalformedJson_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request"));
        verifyNoInteractions(productService);
    }

    @Test
    void getAllProducts_WithNegativePage_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(get("/api/products?page=-1&size=20"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());

        verifyNoInteractions(productService);
    }

    @Test
    void getAllProducts_WithExcessiveSize_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(get("/api/products?page=0&size=1000000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Invalid request"));

        verifyNoInteractions(productService);
    }

    @Test
    void getAllProducts_WithValidPageAndSize_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/products?page=2&size=25"))
                .andExpect(status().isOk());

        verify(productService).getAllProducts(any());
    }
}
