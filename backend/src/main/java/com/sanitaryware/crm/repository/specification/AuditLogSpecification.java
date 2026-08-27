package com.sanitaryware.crm.repository.specification;

import com.sanitaryware.crm.dto.AuditLogFilterDTO;
import com.sanitaryware.crm.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class AuditLogSpecification {

    public static Specification<AuditLog> withFilters(AuditLogFilterDTO filter) {
        return (root, query, criteriaBuilder) -> {
            if (filter == null) {
                return criteriaBuilder.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(filter.getActor())) {
                String actorPattern = "%" + filter.getActor().trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("actorUsername")), actorPattern));
            }

            if (StringUtils.hasText(filter.getAction())) {
                predicates.add(criteriaBuilder.equal(criteriaBuilder.upper(root.get("action")), filter.getAction().trim().toUpperCase()));
            }

            if (StringUtils.hasText(filter.getEntityType())) {
                predicates.add(criteriaBuilder.equal(criteriaBuilder.upper(root.get("entityType")), filter.getEntityType().trim().toUpperCase()));
            }

            if (filter.getEntityId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("entityId"), filter.getEntityId()));
            }

            if (filter.getStartDate() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), filter.getStartDate()));
            }

            if (filter.getEndDate() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), filter.getEndDate()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
