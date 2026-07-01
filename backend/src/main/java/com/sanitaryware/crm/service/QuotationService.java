package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.QuotationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface QuotationService {
    QuotationDTO createQuotation(QuotationDTO quotationDTO);
    QuotationDTO updateQuotation(Long id, QuotationDTO quotationDTO);
    QuotationDTO getQuotationById(Long id);
    Page<QuotationDTO> getAllQuotations(Pageable pageable);
    void deleteQuotation(Long id);
    QuotationDTO updateStatus(Long id, String status);
    List<QuotationDTO> getQuotationsByCustomer(Long customerId);
    String generateQuotationNumber();
    byte[] getQuotationPdf(Long id);
}
