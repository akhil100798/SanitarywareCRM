package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.service.QuotationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class CustomerPortalController {

    private final QuotationService quotationService;

    @GetMapping("/quotations/{token}")
    public ResponseEntity<QuotationDTO> getQuotationByToken(@PathVariable String token) {
        return ResponseEntity.ok(quotationService.getQuotationByShareToken(token));
    }

    @GetMapping("/quotations/{token}/pdf")
    public ResponseEntity<byte[]> getQuotationPdfByToken(@PathVariable String token) {
        QuotationDTO quotation = quotationService.getQuotationByShareToken(token);
        byte[] pdf = quotationService.getQuotationPdfByShareToken(token);
        String filename = "quotation-" + (quotation != null ? quotation.getQuotationNumber() : token) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @PostMapping("/quotations/{token}/accept")
    public ResponseEntity<QuotationDTO> acceptQuotationByToken(@PathVariable String token) {
        return ResponseEntity.ok(quotationService.acceptQuotationByShareToken(token));
    }
}
