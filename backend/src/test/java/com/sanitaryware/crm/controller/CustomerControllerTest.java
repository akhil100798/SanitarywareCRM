package com.sanitaryware.crm.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer.CustomerType;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.service.CustomerService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    @Mock
    private CustomerService customerService;

    @Spy
    private PaginationFactory paginationFactory = new PaginationFactory();

    @InjectMocks
    private CustomerController customerController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
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
    void createCustomer_WithInvalidEmail_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "John Doe",
                                  "email": "not-an-email SQLState org.hibernate java.lang",
                                  "phoneNumber": "9999999999"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.validationErrors.email").value("Email must be valid"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());

        verifyNoInteractions(customerService);
    }

    @Test
    void createCustomer_WithValidEmail_ReturnsCreated() throws Exception {
        CustomerDTO customer = CustomerDTO.builder()
                .id(2L)
                .name("Jane Doe")
                .email("jane@example.com")
                .phoneNumber("8888888888")
                .customerType(CustomerType.RETAIL)
                .build();

        when(customerService.createCustomer(any(CustomerDTO.class))).thenReturn(customer);

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Jane Doe",
                                  "email": "jane@example.com",
                                  "phoneNumber": "8888888888"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("jane@example.com"));

        verify(customerService).createCustomer(any(CustomerDTO.class));
    }

    @Test
    void createCustomer_WithWhitespaceAroundValidEmail_TrimsBeforeValidation() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Jane Doe",
                                  "email": "  jane@example.com  ",
                                  "phoneNumber": "8888888888"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("jane@example.com"));
    }

    @Test
    void createCustomer_WithDuplicateNormalizedPhone_ReturnsSanitizedConflict() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new ConflictException("Phone number already exists"));

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "John Doe",
                                  "phoneNumber": "+91 98765-43210"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Phone number already exists"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void createCustomer_WithDuplicateEmail_ReturnsSanitizedConflict() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new ConflictException("Email already exists"));

        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "John Doe",
                                  "email": "duplicate@example.com",
                                  "phoneNumber": "9876543210"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Email already exists"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());
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

    @Test
    void getAllCustomers_WithZeroSize_ReturnsSanitizedBadRequest() throws Exception {
        mockMvc.perform(get("/api/customers?page=0&size=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request"))
                .andExpect(jsonPath("$.exception").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());

        verifyNoInteractions(customerService);
    }

    @Test
    void getAllCustomers_WithValidPageAndSize_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/customers?page=1&size=50"))
                .andExpect(status().isOk());

        verify(customerService).getAllCustomers(any());
    }
}

