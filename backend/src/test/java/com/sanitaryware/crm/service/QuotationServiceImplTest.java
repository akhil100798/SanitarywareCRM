package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.QuotationItem;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.mapper.QuotationMapper;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotationServiceImplTest {

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private QuotationMapper quotationMapper;

    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private QuotationServiceImpl quotationService;

    @Test
    void createQuotation_ValidItems_CalculatesTotalCorrectly() {
        QuotationDTO dto = new QuotationDTO();
        dto.setCustomerId(1L);
        dto.setValidUntil(LocalDate.now().plusDays(7));
        QuotationDTO.QuotationItemDTO itemDTO = new QuotationDTO.QuotationItemDTO();
        itemDTO.setProductId(10L);
        itemDTO.setQuantity(2);
        itemDTO.setUnitPrice(BigDecimal.valueOf(1000));
        itemDTO.setDiscountPercentage(BigDecimal.valueOf(10));
        dto.setItems(List.of(itemDTO));

        Quotation quotation = new Quotation();
        quotation.setCustomer(new Customer());
        quotation.setTaxPercentage(BigDecimal.valueOf(18));
        quotation.setDiscount(BigDecimal.ZERO);

        QuotationItem item = new QuotationItem();
        item.setProduct(new Product());
        item.setQuantity(2);
        item.setUnitPrice(BigDecimal.valueOf(1000));
        item.setDiscountPercentage(BigDecimal.valueOf(10));
        item.calculateLineTotal(); // 2000 - 200 = 1800

        when(quotationMapper.toEntity(dto)).thenReturn(quotation);
        when(accessControlService.currentUser()).thenReturn(new User());
        when(quotationMapper.toItemEntity(any(), any())).thenReturn(item);
        when(quotationRepository.findByQuotationNumber(anyString())).thenReturn(Optional.empty());
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(quotationMapper.toDTO(any(Quotation.class))).thenReturn(new QuotationDTO());

        QuotationDTO result = quotationService.createQuotation(dto);

        assertNotNull(result);
        verify(quotationRepository).save(argThat(saved ->
                BigDecimal.valueOf(1800).compareTo(saved.getSubtotal()) == 0 &&
                BigDecimal.valueOf(324).compareTo(saved.getTaxAmount()) == 0 &&
                BigDecimal.valueOf(2124).compareTo(saved.getTotal()) == 0
        ));
    }

    @Test
    void createQuotation_ZeroTaxAndMultipleItems_CalculatesCorrectly() {
        QuotationDTO dto = new QuotationDTO();
        dto.setCustomerId(1L);
        dto.setValidUntil(LocalDate.now().plusDays(7));
        QuotationDTO.QuotationItemDTO item1 = new QuotationDTO.QuotationItemDTO();
        item1.setProductId(10L);
        item1.setQuantity(3);
        item1.setUnitPrice(BigDecimal.valueOf(250.50));
        item1.setDiscountPercentage(BigDecimal.ZERO);

        QuotationDTO.QuotationItemDTO item2 = new QuotationDTO.QuotationItemDTO();
        item2.setProductId(11L);
        item2.setQuantity(1);
        item2.setUnitPrice(BigDecimal.valueOf(100.00));
        item2.setDiscountPercentage(BigDecimal.valueOf(50));

        dto.setItems(List.of(item1, item2));

        Quotation quotation = new Quotation();
        quotation.setCustomer(new Customer());
        quotation.setTaxPercentage(BigDecimal.ZERO);
        quotation.setDiscount(BigDecimal.valueOf(20)); // Document-level discount ₹20

        QuotationItem qi1 = new QuotationItem();
        qi1.setProduct(new Product());
        qi1.setQuantity(3);
        qi1.setUnitPrice(BigDecimal.valueOf(250.50));
        qi1.setDiscountPercentage(BigDecimal.ZERO);
        qi1.calculateLineTotal(); // 751.50

        QuotationItem qi2 = new QuotationItem();
        qi2.setProduct(new Product());
        qi2.setQuantity(1);
        qi2.setUnitPrice(BigDecimal.valueOf(100.00));
        qi2.setDiscountPercentage(BigDecimal.valueOf(50));
        qi2.calculateLineTotal(); // 50.00

        when(quotationMapper.toEntity(dto)).thenReturn(quotation);
        when(accessControlService.currentUser()).thenReturn(new User());
        when(quotationMapper.toItemEntity(eq(item1), any())).thenReturn(qi1);
        when(quotationMapper.toItemEntity(eq(item2), any())).thenReturn(qi2);
        when(quotationRepository.findByQuotationNumber(anyString())).thenReturn(Optional.empty());
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(quotationMapper.toDTO(any(Quotation.class))).thenReturn(new QuotationDTO());

        QuotationDTO result = quotationService.createQuotation(dto);

        assertNotNull(result);
        // Subtotal = 751.50 + 50.00 = 801.50
        // Tax = 0
        // Total = 801.50 - 20 = 781.50
        verify(quotationRepository).save(argThat(saved ->
                BigDecimal.valueOf(801.50).compareTo(saved.getSubtotal()) == 0 &&
                BigDecimal.ZERO.compareTo(saved.getTaxAmount()) == 0 &&
                BigDecimal.valueOf(781.50).compareTo(saved.getTotal()) == 0
        ));
    }

    @Test
    void createQuotation_EmptyItems_ThrowsIllegalArgumentException() {
        QuotationDTO dto = new QuotationDTO();
        dto.setCustomerId(1L);
        dto.setItems(Collections.emptyList());

        assertThrows(IllegalArgumentException.class, () -> quotationService.createQuotation(dto));
        verify(quotationRepository, never()).save(any());
    }

    @Test
    void updateStatus_ValidQuotation_UpdatesStatus() {
        Quotation quotation = new Quotation();
        quotation.setId(1L);
        quotation.setStatus(Quotation.QuotationStatus.DRAFT);

        when(quotationRepository.findById(1L)).thenReturn(Optional.of(quotation));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(quotationMapper.toDTO(any(Quotation.class))).thenReturn(new QuotationDTO());

        quotationService.updateStatus(1L, "ACCEPTED");

        assertEquals(Quotation.QuotationStatus.ACCEPTED, quotation.getStatus());
        verify(quotationRepository).save(quotation);
    }
}
