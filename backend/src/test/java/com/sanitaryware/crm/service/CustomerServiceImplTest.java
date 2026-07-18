package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Customer.CustomerType;
import com.sanitaryware.crm.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.mockito.invocation.Invocation;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CustomerServiceImplTest {

    private boolean duplicatePhone;
    private boolean duplicatePhoneOnUpdate;
    private boolean duplicateEmail;
    private boolean duplicateEmailOnUpdate;

    private CustomerRepository customerRepository;
    private CustomerServiceImpl customerService;

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class, invocation -> switch (invocation.getMethod().getName()) {
            case "existsByPhoneNumber" -> duplicatePhone;
            case "existsByPhoneNumberAndIdNot" -> duplicatePhoneOnUpdate;
            case "existsByEmail" -> duplicateEmail;
            case "existsByEmailAndIdNot" -> duplicateEmailOnUpdate;
            case "save" -> invocation.getArgument(0);
            default -> Answers.RETURNS_DEFAULTS.answer(invocation);
        });
        customerService = new CustomerServiceImpl(customerRepository);
    }

    @Test
    void createCustomer_WithoutCustomerType_DefaultsToRetail() {
        CustomerDTO result = customerService.createCustomer(customer("9876543210", "buyer@example.com", null));

        assertEquals(CustomerType.RETAIL, result.getCustomerType());
        assertEquals(CustomerType.RETAIL, savedCustomer().getCustomerType());
    }

    @Test
    void createCustomer_WithBlankEmail_SavesEmailAsNull() {
        customerService.createCustomer(customer("9876543210", "   ", CustomerType.RETAIL));

        assertNull(savedCustomer().getEmail());
    }

    @Test
    void createCustomer_NormalizesPhoneNumber() {
        CustomerDTO result = customerService.createCustomer(
                customer("+91 98765-43210", "buyer@example.com", CustomerType.RETAIL));

        assertEquals("919876543210", result.getPhoneNumber());
        assertEquals("919876543210", savedCustomer().getPhoneNumber());
        assertRepositoryCall("existsByPhoneNumber", "919876543210");
    }

    @Test
    void createCustomer_WithEmptyNormalizedPhone_RejectsBeforeSave() {
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> customerService.createCustomer(customer("+-()", null, CustomerType.RETAIL)));

        assertEquals("IllegalArgumentException", exception.getClass().getSimpleName());
        verify(customerRepository, never()).save(any());
    }

    @Test
    void createCustomer_WithDuplicateNormalizedPhone_ReturnsConflictWithoutSaving() {
        duplicatePhone = true;

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> customerService.createCustomer(
                        customer("+91 98765-43210", "buyer@example.com", CustomerType.RETAIL)));

        assertEquals("ConflictException", exception.getClass().getSimpleName());
        assertRepositoryCall("existsByPhoneNumber", "919876543210");
        verify(customerRepository, never()).save(any());
    }

    @Test
    void updateCustomer_WithSamePhone_DoesNotFalseConflict() {
        Customer existing = existingCustomer(7L, "919876543210", "owner@example.com");
        when(customerRepository.findById(7L)).thenReturn(Optional.of(existing));

        CustomerDTO result = customerService.updateCustomer(
                7L, customer("+91 98765-43210", " owner@example.com ", null));

        assertEquals("919876543210", result.getPhoneNumber());
        assertEquals("owner@example.com", result.getEmail());
        assertEquals(CustomerType.RETAIL, result.getCustomerType());
        assertRepositoryCall("existsByPhoneNumberAndIdNot", "919876543210", 7L);
        assertRepositoryCall("existsByEmailAndIdNot", "owner@example.com", 7L);
        verify(customerRepository).save(existing);
    }

    @Test
    void updateCustomer_WithDuplicatePhoneOwnedByAnotherCustomer_ReturnsConflict() {
        duplicatePhoneOnUpdate = true;
        Customer existing = existingCustomer(7L, "9876543210", "owner@example.com");
        when(customerRepository.findById(7L)).thenReturn(Optional.of(existing));

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> customerService.updateCustomer(
                        7L, customer("+91 98765-43210", "owner@example.com", CustomerType.RETAIL)));

        assertEquals("ConflictException", exception.getClass().getSimpleName());
        verify(customerRepository, never()).save(any());
    }

    @Test
    void createCustomer_WithDuplicateEmail_ReturnsConflictWithoutSaving() {
        duplicateEmail = true;

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> customerService.createCustomer(
                        customer("9876543210", " duplicate@example.com ", CustomerType.RETAIL)));

        assertEquals("ConflictException", exception.getClass().getSimpleName());
        assertRepositoryCall("existsByEmail", "duplicate@example.com");
        verify(customerRepository, never()).save(any());
    }

    @Test
    void createCustomer_WithValidEmail_TrimsAndSucceeds() {
        CustomerDTO result = customerService.createCustomer(
                customer("9876543210", " valid@example.com ", CustomerType.RETAIL));

        assertEquals("valid@example.com", result.getEmail());
        assertEquals("valid@example.com", savedCustomer().getEmail());
        assertRepositoryCall("existsByEmail", "valid@example.com");
    }

    private CustomerDTO customer(String phone, String email, CustomerType type) {
        return CustomerDTO.builder()
                .name("Test Customer")
                .phoneNumber(phone)
                .email(email)
                .customerType(type)
                .build();
    }

    private Customer existingCustomer(Long id, String phone, String email) {
        Customer customer = new Customer();
        customer.setId(id);
        customer.setName("Existing Customer");
        customer.setPhoneNumber(phone);
        customer.setEmail(email);
        customer.setCustomerType(CustomerType.RETAIL);
        customer.setIsActive(true);
        return customer;
    }

    private Customer savedCustomer() {
        return mockingDetails(customerRepository).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().equals("save"))
                .map(invocation -> (Customer) invocation.getArgument(0))
                .findFirst()
                .orElseThrow();
    }

    private void assertRepositoryCall(String methodName, Object... arguments) {
        assertTrue(mockingDetails(customerRepository).getInvocations().stream()
                .anyMatch(invocation -> invocationMatches(invocation, methodName, arguments)),
                () -> "Expected repository call " + methodName);
    }

    private boolean invocationMatches(Invocation invocation, String methodName, Object[] arguments) {
        if (!invocation.getMethod().getName().equals(methodName)
                || invocation.getArguments().length != arguments.length) {
            return false;
        }
        for (int index = 0; index < arguments.length; index++) {
            if (!arguments[index].equals(invocation.getArgument(index))) {
                return false;
            }
        }
        return true;
    }
}
