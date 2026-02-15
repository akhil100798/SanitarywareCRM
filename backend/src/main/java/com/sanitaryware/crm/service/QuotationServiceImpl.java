package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.QuotationItem;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.QuotationMapper;
import com.sanitaryware.crm.repository.QuotationRepository;
import com.sanitaryware.crm.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class QuotationServiceImpl implements QuotationService {

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuotationMapper quotationMapper;

    @Override
    public QuotationDTO createQuotation(QuotationDTO quotationDTO) {
        Quotation quotation = quotationMapper.toEntity(quotationDTO);
        
        // Set quotation number if not provided
        if (quotation.getQuotationNumber() == null || quotation.getQuotationNumber().isEmpty()) {
            quotation.setQuotationNumber(generateQuotationNumber());
        }

        // Set creator
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userRepository.findByUsername(username).ifPresent(quotation::setCreatedBy);

        // Map items
        if (quotationDTO.getItems() != null) {
            List<QuotationItem> items = quotationDTO.getItems().stream()
                    .map(itemDTO -> quotationMapper.toItemEntity(itemDTO, quotation))
                    .collect(Collectors.toList());
            quotation.setItems(items);
        }

        quotation.calculateTotal();
        Quotation savedQuotation = quotationRepository.save(quotation);
        return quotationMapper.toDTO(savedQuotation);
    }

    @Override
    public QuotationDTO updateQuotation(Long id, QuotationDTO quotationDTO) {
        Quotation existingQuotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));

        quotationMapper.updateEntity(existingQuotation, quotationDTO);

        // Update items
        if (quotationDTO.getItems() != null) {
            existingQuotation.getItems().clear();
            List<QuotationItem> updatedItems = quotationDTO.getItems().stream()
                    .map(itemDTO -> quotationMapper.toItemEntity(itemDTO, existingQuotation))
                    .collect(Collectors.toList());
            existingQuotation.getItems().addAll(updatedItems);
        }

        existingQuotation.calculateTotal();
        Quotation updatedQuotation = quotationRepository.save(existingQuotation);
        return quotationMapper.toDTO(updatedQuotation);
    }

    @Override
    public QuotationDTO getQuotationById(Long id) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        return quotationMapper.toDTO(quotation);
    }

    @Override
    public Page<QuotationDTO> getAllQuotations(Pageable pageable) {
        return quotationRepository.findAll(pageable).map(quotationMapper::toDTO);
    }

    @Override
    public void deleteQuotation(Long id) {
        if (!quotationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Quotation not found with id: " + id);
        }
        quotationRepository.deleteById(id);
    }

    @Override
    public QuotationDTO updateStatus(Long id, String status) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        
        quotation.setStatus(Quotation.QuotationStatus.valueOf(status.toUpperCase()));
        return quotationMapper.toDTO(quotationRepository.save(quotation));
    }

    @Override
    public List<QuotationDTO> getQuotationsByCustomer(Long customerId) {
        return quotationRepository.findByCustomerId(customerId).stream()
                .map(quotationMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public String generateQuotationNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "QTN-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", new java.util.Random().nextInt(10000));
        return prefix + "-" + random;
    }
}
