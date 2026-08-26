package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.ProductDTO;
import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.dto.ProductImageDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.service.ProductService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

        verify(productService).getProductsWithFilters(any(ProductFilterDTO.class), any());
    }

    @Test
    void getAllProducts_WithMultiFacetedFilters_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("query", "pipe")
                        .param("categoryId", "1")
                        .param("brandId", "2")
                        .param("minPrice", "100.00")
                        .param("maxPrice", "500.00")
                        .param("inStock", "true")
                        .param("lowStock", "false")
                        .param("isActive", "true")
                        .param("barcode", "8901234567890")
                        .param("hsnCode", "69101000"))
                .andExpect(status().isOk());

        verify(productService).getProductsWithFilters(argThat(filter ->
                "pipe".equals(filter.getQuery()) &&
                Long.valueOf(1L).equals(filter.getCategoryId()) &&
                Long.valueOf(2L).equals(filter.getBrandId()) &&
                BigDecimal.valueOf(100.00).compareTo(filter.getMinPrice()) == 0 &&
                BigDecimal.valueOf(500.00).compareTo(filter.getMaxPrice()) == 0 &&
                Boolean.TRUE.equals(filter.getInStock()) &&
                Boolean.FALSE.equals(filter.getLowStock()) &&
                Boolean.TRUE.equals(filter.getIsActive()) &&
                "8901234567890".equals(filter.getBarcode()) &&
                "69101000".equals(filter.getHsnCode())
        ), any());
    }

    @Test
    void getProductByBarcode_Found_ReturnsOk() throws Exception {
        ProductDTO productDTO = ProductDTO.builder()
                .id(1L)
                .sku("BAR-1")
                .barcode("8901122334455")
                .name("Basin Mixer")
                .build();
        when(productService.getProductByBarcode("8901122334455")).thenReturn(productDTO);

        mockMvc.perform(get("/api/products/barcode/8901122334455"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.barcode").value("8901122334455"));

        verify(productService).getProductByBarcode("8901122334455");
    }

    @Test
    void getProductByBarcode_NotFound_Returns404() throws Exception {
        when(productService.getProductByBarcode("UNKNOWN"))
                .thenThrow(new ResourceNotFoundException("Product not found with barcode: UNKNOWN"));

        mockMvc.perform(get("/api/products/barcode/UNKNOWN"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getProductsByHsnCode_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/products/hsn/69101000"))
                .andExpect(status().isOk());

        verify(productService).getProductsByHsnCode(eq("69101000"), any());
    }

    @Test
    void addProductImage_Returns201Created() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "image content".getBytes());
        ProductImageDTO imageDTO = ProductImageDTO.builder()
                .id(10L)
                .productId(1L)
                .imageUrl("/api/files/download/products/test.jpg")
                .isPrimary(true)
                .displayOrder(0)
                .build();

        when(productService.addProductImage(eq(1L), any(), eq(true), eq(0))).thenReturn(imageDTO);

        mockMvc.perform(multipart("/api/products/1/images")
                        .file(file)
                        .param("isPrimary", "true")
                        .param("displayOrder", "0"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.isPrimary").value(true));

        verify(productService).addProductImage(eq(1L), any(), eq(true), eq(0));
    }

    @Test
    void getProductImages_ReturnsOk() throws Exception {
        ProductImageDTO imageDTO = ProductImageDTO.builder()
                .id(10L)
                .productId(1L)
                .imageUrl("/api/files/download/products/test.jpg")
                .isPrimary(true)
                .displayOrder(0)
                .build();

        when(productService.getProductImages(1L)).thenReturn(List.of(imageDTO));

        mockMvc.perform(get("/api/products/1/images"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));

        verify(productService).getProductImages(1L);
    }

    @Test
    void deleteProductImage_Returns204NoContent() throws Exception {
        doNothing().when(productService).deleteProductImage(1L, 10L);

        mockMvc.perform(delete("/api/products/1/images/10"))
                .andExpect(status().isNoContent());

        verify(productService).deleteProductImage(1L, 10L);
    }
}
