package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.entity.Customer;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.repository.OrderRepository;
import com.sanitaryware.crm.repository.QuotationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaFixtureCleanupControllerTest {
    private final QuotationRepository quotations = mock(QuotationRepository.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final QaFixtureCleanupController controller = new QaFixtureCleanupController(quotations, orders);
    private Quotation fixture(String customerName, String username) {
        Customer customer = new Customer(); customer.setName(customerName);
        User user = new User(); user.setUsername(username);
        Quotation quotation = new Quotation(); quotation.setId(1L);
        quotation.setCustomer(customer); quotation.setCreatedBy(user);
        quotation.setStatus(Quotation.QuotationStatus.CONVERTED);
        when(quotations.findById(1L)).thenReturn(Optional.of(quotation));
        return quotation;
    }
    @Test void deletesOnlyOwnedFixtureAfterOrderRemoval() {
        Quotation quotation = fixture("Phase 1 Customer 123", "qaadmin");
        assertEquals(204, controller.delete(1L, "Phase 1 Customer 123", () -> "qaadmin").getStatusCode().value());
        verify(quotations).delete(quotation);
    }
    @Test void refusesExistingLinkedOrder() {
        fixture("Phase 1 Customer 123", "qaadmin");
        when(orders.existsByQuotationId(1L)).thenReturn(true);
        assertThrows(ConflictException.class, () -> controller.delete(1L, "Phase 1 Customer 123", () -> "qaadmin"));
        verify(quotations, never()).delete(any());
    }
    @Test void refusesNonFixtureName() {
        fixture("Existing customer", "qaadmin");
        assertThrows(ConflictException.class, () -> controller.delete(1L, "Existing customer", () -> "qaadmin"));
        verify(quotations, never()).delete(any());
    }
    @Test void refusesAnotherOwnerAndIncorrectCustomer() {
        fixture("Phase 1 Customer 123", "other");
        assertThrows(ConflictException.class, () -> controller.delete(1L, "Phase 1 Customer 123", () -> "qaadmin"));
        assertThrows(ConflictException.class, () -> controller.delete(1L, "Phase 1 Customer 456", () -> "other"));
        verify(quotations, never()).delete(any());
    }
    @Test void endpointIsRestrictedToQaProfileAndAdmin() throws Exception {
        assertArrayEquals(new String[]{"qa"}, QaFixtureCleanupController.class.getAnnotation(Profile.class).value());
        for (String profile : new String[]{"qa", "dev", "prod"}) {
            try (var context = new org.springframework.context.annotation.AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profile);
                context.registerBean(QuotationRepository.class, () -> quotations);
                context.registerBean(OrderRepository.class, () -> orders);
                context.register(QaFixtureCleanupController.class);
                context.refresh();
                assertEquals(profile.equals("qa") ? 1 : 0,
                        context.getBeansOfType(QaFixtureCleanupController.class).size(), profile);
            }
        }
        assertEquals("hasRole('ADMIN')", QaFixtureCleanupController.class
                .getMethod("delete", Long.class, String.class, java.security.Principal.class)
                .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class).value());
    }
}
