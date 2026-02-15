package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.CustomerDTO;
import com.sanitaryware.crm.entity.Customer;

public class CustomerMapper {

    public static CustomerDTO toDTO(Customer customer) {
        if (customer == null) return null;
        
        return CustomerDTO.builder()
                .id(customer.getId())
                .name(customer.getName())
                .email(customer.getEmail())
                .phoneNumber(customer.getPhoneNumber())
                .alternatePhone(customer.getAlternatePhone())
                .company(customer.getCompany())
                .gstNumber(customer.getGstNumber())
                .customerType(customer.getCustomerType())
                .billingAddress(customer.getBillingAddress())
                .shippingAddress(customer.getShippingAddress())
                .city(customer.getCity())
                .state(customer.getState())
                .pincode(customer.getPincode())
                .isActive(customer.getIsActive())
                .notes(customer.getNotes())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }

    public static Customer toEntity(CustomerDTO dto) {
        if (dto == null) return null;

        Customer customer = new Customer();
        customer.setId(dto.getId());
        customer.setName(dto.getName());
        customer.setEmail(dto.getEmail());
        customer.setPhoneNumber(dto.getPhoneNumber());
        customer.setAlternatePhone(dto.getAlternatePhone());
        customer.setCompany(dto.getCompany());
        customer.setGstNumber(dto.getGstNumber());
        customer.setCustomerType(dto.getCustomerType());
        customer.setBillingAddress(dto.getBillingAddress());
        customer.setShippingAddress(dto.getShippingAddress());
        customer.setCity(dto.getCity());
        customer.setState(dto.getState());
        customer.setPincode(dto.getPincode());
        customer.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        customer.setNotes(dto.getNotes());
        
        return customer;
    }

    public static void updateEntity(Customer customer, CustomerDTO dto) {
        if (dto == null || customer == null) return;

        customer.setName(dto.getName());
        customer.setEmail(dto.getEmail());
        customer.setPhoneNumber(dto.getPhoneNumber());
        customer.setAlternatePhone(dto.getAlternatePhone());
        customer.setCompany(dto.getCompany());
        customer.setGstNumber(dto.getGstNumber());
        customer.setCustomerType(dto.getCustomerType());
        customer.setBillingAddress(dto.getBillingAddress());
        customer.setShippingAddress(dto.getShippingAddress());
        customer.setCity(dto.getCity());
        customer.setState(dto.getState());
        customer.setPincode(dto.getPincode());
        if (dto.getIsActive() != null) {
            customer.setIsActive(dto.getIsActive());
        }
        customer.setNotes(dto.getNotes());
    }
}
