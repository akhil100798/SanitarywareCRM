package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.OrderItem;
import com.sanitaryware.crm.repository.CustomerRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class OrderMapper {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    public OrderDTO toDTO(Order order) {
        if (order == null) return null;

        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setOrderNumber(order.getOrderNumber());
        dto.setCustomerId(order.getCustomer().getId());
        dto.setCustomerName(order.getCustomer().getName());
        if (order.getQuotation() != null) {
            dto.setQuotationId(order.getQuotation().getId());
            dto.setQuotationNumber(order.getQuotation().getQuotationNumber());
        }
        dto.setCreatedById(order.getCreatedBy().getId());
        dto.setCreatedByName(order.getCreatedBy().getFullName());
        dto.setOrderDate(order.getOrderDate());
        dto.setDeliveryDate(order.getDeliveryDate());
        dto.setStatus(order.getStatus().name());
        dto.setPaymentStatus(order.getPaymentStatus().name());
        dto.setSubtotal(order.getSubtotal());
        dto.setTaxPercentage(order.getTaxPercentage());
        dto.setTaxAmount(order.getTaxAmount());
        dto.setDiscount(order.getDiscount());
        dto.setShippingCharge(order.getShippingCharge());
        dto.setTotal(order.getTotal());
        dto.setPaidAmount(order.getPaidAmount());
        dto.setBalanceAmount(order.getBalanceAmount());
        dto.setShippingAddress(order.getShippingAddress());
        dto.setNotes(order.getNotes());
        dto.setBillPadImageUrl(order.getBillPadImageUrl());

        if (order.getItems() != null) {
            dto.setItems(order.getItems().stream()
                    .map(this::toItemDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    public OrderDTO.OrderItemDTO toItemDTO(OrderItem item) {
        if (item == null) return null;

        OrderDTO.OrderItemDTO dto = new OrderDTO.OrderItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct().getId());
        dto.setProductName(item.getProduct().getName());
        dto.setProductSku(item.getProduct().getSku());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setDiscountPercentage(item.getDiscountPercentage());
        dto.setLineTotal(item.getLineTotal());
        dto.setNotes(item.getNotes());

        return dto;
    }

    public Order toEntity(OrderDTO dto) {
        if (dto == null) return null;

        Order order = new Order();
        updateEntity(order, dto);
        return order;
    }

    public void updateEntity(Order order, OrderDTO dto) {
        if (dto == null || order == null) return;

        order.setOrderDate(dto.getOrderDate());
        order.setDeliveryDate(dto.getDeliveryDate());
        if (dto.getTaxPercentage() != null) order.setTaxPercentage(dto.getTaxPercentage());
        if (dto.getDiscount() != null) order.setDiscount(dto.getDiscount());
        if (dto.getShippingCharge() != null) order.setShippingCharge(dto.getShippingCharge());
        order.setShippingAddress(dto.getShippingAddress());
        order.setNotes(dto.getNotes());
        order.setBillPadImageUrl(dto.getBillPadImageUrl());

        if (dto.getCustomerId() != null) {
            customerRepository.findById(dto.getCustomerId())
                    .ifPresent(order::setCustomer);
        }

        if (dto.getQuotationId() != null) {
            quotationRepository.findById(dto.getQuotationId())
                    .ifPresent(order::setQuotation);
        }
    }

    public OrderItem toItemEntity(OrderDTO.OrderItemDTO dto, Order order) {
        if (dto == null) return null;

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.setDiscountPercentage(dto.getDiscountPercentage());
        item.setNotes(dto.getNotes());

        if (dto.getProductId() != null) {
            productRepository.findById(dto.getProductId())
                    .ifPresent(item::setProduct);
        }

        item.calculateLineTotal();
        return item;
    }
}
