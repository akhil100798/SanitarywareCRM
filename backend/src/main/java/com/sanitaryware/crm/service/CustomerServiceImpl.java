package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Customer.CustomerType;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.CustomerMapper;
import com.sanitaryware.crm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    public CustomerDTO createCustomer(CustomerDTO customerDTO) {
        Customer customer = CustomerMapper.toEntity(customerDTO);
        Customer savedCustomer = customerRepository.save(customer);
        return CustomerMapper.toDTO(savedCustomer);
    }

    @Override
    public CustomerDTO updateCustomer(Long id, CustomerDTO customerDTO) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        
        CustomerMapper.updateEntity(customer, customerDTO);
        Customer updatedCustomer = customerRepository.save(customer);
        return CustomerMapper.toDTO(updatedCustomer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return CustomerMapper.toDTO(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerDTO> getAllCustomers(Pageable pageable) {
        return customerRepository.findAll(pageable)
                .map(CustomerMapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerDTO> searchCustomers(String search, Pageable pageable) {
        return customerRepository.searchCustomers(search, pageable)
                .map(CustomerMapper::toDTO);
    }

    @Override
    public void deleteCustomer(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        customer.setIsActive(false);
        customerRepository.save(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerDTO> getActiveCustomers() {
        return customerRepository.findByIsActiveTrue().stream()
                .map(CustomerMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerDTO> getCustomersByType(CustomerType type, Pageable pageable) {
        return customerRepository.findByCustomerType(type, pageable)
                .map(CustomerMapper::toDTO);
    }
}
