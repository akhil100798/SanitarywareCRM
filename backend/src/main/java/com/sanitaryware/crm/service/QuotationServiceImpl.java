package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.QuotationItem;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.QuotationMapper;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private QuotationMapper quotationMapper;

    @Autowired
    private AccessControlService accessControlService;

    @Autowired
    private AuditService auditService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public QuotationDTO createQuotation(QuotationDTO quotationDTO) {
        if (quotationDTO.getItems() == null || quotationDTO.getItems().isEmpty()) {
            throw new IllegalArgumentException("Quotation must contain at least one item");
        }
        
        Quotation quotation = quotationMapper.toEntity(quotationDTO);
        
        // Set quotation number if not provided
        if (quotation.getQuotationNumber() == null || quotation.getQuotationNumber().isEmpty()) {
            quotation.setQuotationNumber(generateQuotationNumber());
        }

        // Set creator
        quotation.setCreatedBy(accessControlService.currentUser());

        // Map items
        if (quotationDTO.getItems() != null) {
            List<QuotationItem> items = quotationDTO.getItems().stream()
                    .map(itemDTO -> quotationMapper.toItemEntity(itemDTO, quotation))
                    .collect(Collectors.toList());
            quotation.setItems(items);
        }

        quotation.calculateTotal();
        Quotation savedQuotation = quotationRepository.save(quotation);

        auditService.logEvent("CREATE", "QUOTATION", savedQuotation.getId(),
                "Created quotation " + savedQuotation.getQuotationNumber() + " with total Rs. " + savedQuotation.getTotal());

        return quotationMapper.toDTO(savedQuotation);
    }

    @Override
    public QuotationDTO updateQuotation(Long id, QuotationDTO quotationDTO) {
        if (quotationDTO.getItems() == null || quotationDTO.getItems().isEmpty()) {
            throw new IllegalArgumentException("Quotation must contain at least one item");
        }

        Quotation existingQuotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        accessControlService.requireQuotationAccess(existingQuotation);

        if (existingQuotation.getStatus() == Quotation.QuotationStatus.CONVERTED) {
            throw new IllegalArgumentException("Cannot update a quotation that has already been converted to an order");
        }
        if (existingQuotation.getStatus() == Quotation.QuotationStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot update a rejected quotation");
        }

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

        auditService.logEvent("UPDATE", "QUOTATION", updatedQuotation.getId(),
                "Updated quotation " + updatedQuotation.getQuotationNumber() + " (total Rs. " + updatedQuotation.getTotal() + ")");

        return quotationMapper.toDTO(updatedQuotation);
    }

    @Override
    public QuotationDTO getQuotationById(Long id) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        accessControlService.requireQuotationAccess(quotation);
        return quotationMapper.toDTO(quotation);
    }

    @Override
    public Page<QuotationDTO> getAllQuotations(Pageable pageable) {
        User currentUser = accessControlService.currentUser();
        if (accessControlService.isSales(currentUser)) {
            return quotationRepository.findByCreatedByUsername(currentUser.getUsername(), pageable).map(quotationMapper::toDTO);
        }
        return quotationRepository.findAll(pageable).map(quotationMapper::toDTO);
    }

    @Override
    public void deleteQuotation(Long id) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        accessControlService.requireQuotationAccess(quotation);

        if (quotation.getStatus() == Quotation.QuotationStatus.CONVERTED) {
            throw new com.sanitaryware.crm.exception.ConflictException("Cannot delete a quotation that has already been converted to an order");
        }

        quotationRepository.delete(quotation);

        auditService.logEvent("DELETE", "QUOTATION", id,
                "Deleted quotation " + quotation.getQuotationNumber());
    }

    @Override
    public QuotationDTO updateStatus(Long id, String status) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        accessControlService.requireQuotationAccess(quotation);
        
        Quotation.QuotationStatus newStatus = Quotation.QuotationStatus.valueOf(status.toUpperCase());
        if (quotation.getStatus() == Quotation.QuotationStatus.CONVERTED && newStatus != Quotation.QuotationStatus.CONVERTED) {
            throw new IllegalArgumentException("Cannot change status of a converted quotation");
        }

        quotation.setStatus(newStatus);
        Quotation saved = quotationRepository.save(quotation);

        auditService.logEvent("STATUS_CHANGE", "QUOTATION", id,
                "Changed status of quotation " + quotation.getQuotationNumber() + " to " + newStatus);

        return quotationMapper.toDTO(saved);
    }

    @Override
    public List<QuotationDTO> getQuotationsByCustomer(Long customerId) {
        User currentUser = accessControlService.currentUser();
        List<Quotation> quotations = accessControlService.isSales(currentUser)
                ? quotationRepository.findByCustomerIdAndCreatedByUsername(customerId, currentUser.getUsername())
                : quotationRepository.findByCustomerId(customerId);
        return quotations.stream()
                .map(quotationMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public String generateQuotationNumber() {
        LocalDateTime now = LocalDateTime.now();
        String prefix = "QTN-" + now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempts = 0; attempts < 10; attempts++) {
            String random = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String candidate = prefix + "-" + random;
            if (quotationRepository.findByQuotationNumber(candidate).isEmpty()) {
                return candidate;
            }
        }
        return prefix + "-" + now.format(DateTimeFormatter.ofPattern("HHmmssSSS"));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] getQuotationPdf(Long id) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found with id: " + id));
        accessControlService.requireQuotationAccess(quotation);
        return pdfGeneratorService.generateQuotationPdf(quotation);
    }
}
