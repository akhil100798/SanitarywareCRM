package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer.CustomerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CustomerService {
    CustomerDTO createCustomer(CustomerDTO customerDTO);
    CustomerDTO updateCustomer(Long id, CustomerDTO customerDTO);
    CustomerDTO getCustomerById(Long id);
    Page<CustomerDTO> getAllCustomers(Pageable pageable);
    Page<CustomerDTO> searchCustomers(String search, Pageable pageable);
    void deleteCustomer(Long id);
    List<CustomerDTO> getActiveCustomers();
    Page<CustomerDTO> getCustomersByType(CustomerType type, Pageable pageable);
}
