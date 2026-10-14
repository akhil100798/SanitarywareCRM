package com.sanitaryware.crm.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaginationFactoryTest {
    @Test
    void unknownSortPropertyRejectedForEveryPagedResource() {
        for (String resource : new String[]{"customers", "products", "distributors", "orders", "quotations",
                "purchase-orders", "distributor-payments", "audit-logs"}) {
            org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest();
            request.setRequestURI("/api/" + resource);
            org.springframework.web.context.request.RequestContextHolder.setRequestAttributes(
                    new org.springframework.web.context.request.ServletRequestAttributes(request));
            try {
                assertThrows(IllegalArgumentException.class,
                        () -> paginationFactory.create(0, 20, new String[]{"nonexistent,asc"}), resource);
            } finally { org.springframework.web.context.request.RequestContextHolder.resetRequestAttributes(); }
        }
    }

    private PaginationFactory paginationFactory;

    @BeforeEach
    void setUp() {
        paginationFactory = new PaginationFactory();
    }

    @Test
    void defaultPageAndSize_ReturnsPageZeroSizeTwenty() {
        Pageable pageable = paginationFactory.create(0, 20, null);

        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
        assertFalse(pageable.getSort().isSorted());
    }

    @Test
    void validPageAndSize_ReturnsExpectedPageable() {
        Pageable pageable = paginationFactory.create(3, 50, null);

        assertEquals(3, pageable.getPageNumber());
        assertEquals(50, pageable.getPageSize());
    }

    @Test
    void negativePage_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> paginationFactory.create(-1, 20, null));
    }

    @Test
    void zeroSize_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> paginationFactory.create(0, 0, null));
    }

    @Test
    void negativeSize_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> paginationFactory.create(0, -1, null));
    }

    @Test
    void sizeAboveMaximum_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> paginationFactory.create(0, 101, null));
    }

    @Test
    void validSortAscending_ReturnsSortedPageable() {
        Pageable pageable = paginationFactory.create(0, 20, new String[]{"name,asc"});

        Sort.Order order = pageable.getSort().getOrderFor("name");
        assertTrue(order != null && order.isAscending());
    }

    @Test
    void validSortDescending_ReturnsSortedPageable() {
        Pageable pageable = paginationFactory.create(0, 20, new String[]{"createdAt,desc"});

        Sort.Order order = pageable.getSort().getOrderFor("createdAt");
        assertTrue(order != null && order.isDescending());
    }

    @Test
    void invalidSortDirection_ThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class,
                () -> paginationFactory.create(0, 20, new String[]{"name,sideways"}));
    }
}
