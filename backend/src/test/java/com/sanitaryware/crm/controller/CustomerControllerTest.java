package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer.CustomerType;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.CustomerService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    @Mock
    private CustomerService customerService;

    @InjectMocks
    private CustomerController customerController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void createCustomer_WithValidRequest_ReturnsCreated() throws Exception {
        CustomerDTO customer = CustomerDTO.builder()
                .id(1L)
                .name("John Doe")
                .phoneNumber("9999999999")
                .customerType(CustomerType.RETAIL)
                .build();

        when(customerService.createCustomer(any(CustomerDTO.class))).thenReturn(customer);

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "John Doe",
                                  "phoneNumber": "9999999999",
                                  "customerType": "RETAIL"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("John Doe"));

        verify(customerService).createCustomer(any(CustomerDTO.class));
    }

    @Test
    void getCustomerById_ReturnsCustomer() throws Exception {
        CustomerDTO customer = CustomerDTO.builder()
                .id(1L)
                .name("John Doe")
                .build();

        when(customerService.getCustomerById(1L)).thenReturn(customer);

        mockMvc.perform(get("/api/customers/{id}", 1L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("John Doe"));

        verify(customerService).getCustomerById(1L);
    }
}

