package com.sanitaryware.crm.web;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class PaginationFactory {

    private static final int MAX_PAGE_SIZE = 100;

    public Pageable create(int page, int size, String[] sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid pagination");
        }

        List<Sort.Order> orders = parseSort(sort);
        Sort pageableSort = orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
        return PageRequest.of(page, size, pageableSort);
    }

    private List<Sort.Order> parseSort(String[] sort) {
        List<Sort.Order> orders = new ArrayList<>();
        if (sort == null) {
            return orders;
        }

        for (int index = 0; index < sort.length; index++) {
            String value = sort[index];
            if (value == null || value.isBlank()) {
                continue;
            }

            String property;
            String direction = null;
            String[] parts = value.split(",", -1);
            if (parts.length > 2) {
                throw new IllegalArgumentException("Invalid sort");
            }

            property = parts[0].trim();
            if (parts.length == 2) {
                direction = parts[1].trim();
            } else if (index + 1 < sort.length && sort[index + 1] != null
                    && !sort[index + 1].contains(",")) {
                direction = sort[++index].trim();
            }

            if (property.isEmpty()) {
                throw new IllegalArgumentException("Invalid sort");
            }

            Sort.Direction sortDirection = parseDirection(direction);
            orders.add(new Sort.Order(sortDirection, property));
        }
        return orders;
    }

    private Sort.Direction parseDirection(String direction) {
        if (direction == null || direction.isBlank() || direction.equalsIgnoreCase("asc")) {
            return Sort.Direction.ASC;
        }
        if (direction.equalsIgnoreCase("desc")) {
            return Sort.Direction.DESC;
        }
        throw new IllegalArgumentException("Invalid sort direction");
    }
}
