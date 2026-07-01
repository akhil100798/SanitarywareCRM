package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.QuotationItem;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.repository.CustomerRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class QuotationMapper {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    public QuotationDTO toDTO(Quotation quotation) {
        if (quotation == null) return null;

        QuotationDTO dto = new QuotationDTO();
        dto.setId(quotation.getId());
        dto.setQuotationNumber(quotation.getQuotationNumber());
        dto.setCustomerId(quotation.getCustomer().getId());
        dto.setCustomerName(quotation.getCustomer().getName());
        dto.setCreatedById(quotation.getCreatedBy().getId());
        dto.setCreatedByName(quotation.getCreatedBy().getFullName());
        dto.setQuotationDate(quotation.getQuotationDate());
        dto.setValidUntil(quotation.getValidUntil());
        dto.setStatus(quotation.getStatus().name());
        dto.setSubtotal(quotation.getSubtotal());
        dto.setTaxPercentage(quotation.getTaxPercentage());
        dto.setTaxAmount(quotation.getTaxAmount());
        dto.setDiscount(quotation.getDiscount());
        dto.setTotal(quotation.getTotal());
        dto.setNotes(quotation.getNotes());
        dto.setTermsAndConditions(quotation.getTermsAndConditions());
        
        if (quotation.getItems() != null) {
            dto.setItems(quotation.getItems().stream()
                    .map(this::toItemDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    public QuotationDTO.QuotationItemDTO toItemDTO(QuotationItem item) {
        if (item == null) return null;

        QuotationDTO.QuotationItemDTO dto = new QuotationDTO.QuotationItemDTO();
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

    public Quotation toEntity(QuotationDTO dto) {
        if (dto == null) return null;

        Quotation quotation = new Quotation();
        updateEntity(quotation, dto);
        return quotation;
    }

    public void updateEntity(Quotation quotation, QuotationDTO dto) {
        if (dto == null || quotation == null) return;

        quotation.setQuotationDate(dto.getQuotationDate());
        quotation.setValidUntil(dto.getValidUntil());
        if (dto.getTaxPercentage() != null) quotation.setTaxPercentage(dto.getTaxPercentage());
        if (dto.getDiscount() != null) quotation.setDiscount(dto.getDiscount());
        quotation.setNotes(dto.getNotes());
        quotation.setTermsAndConditions(dto.getTermsAndConditions());

        if (dto.getCustomerId() != null) {
            quotation.setCustomer(customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + dto.getCustomerId())));
        }

        // Items mapping would typically be handled in the service layer 
        // to manage relationships and calculations correctly
    }

    public QuotationItem toItemEntity(QuotationDTO.QuotationItemDTO dto, Quotation quotation) {
        if (dto == null) return null;

        QuotationItem item = new QuotationItem();
        item.setQuotation(quotation);
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.setDiscountPercentage(dto.getDiscountPercentage());
        item.setNotes(dto.getNotes());

        if (dto.getProductId() != null) {
            item.setProduct(productRepository.findById(dto.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + dto.getProductId())));
        } else {
            throw new IllegalArgumentException("Quotation item product is required");
        }

        item.calculateLineTotal();
        return item;
    }
}
