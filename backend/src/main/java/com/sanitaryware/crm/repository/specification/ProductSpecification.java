package com.sanitaryware.crm.repository.specification;

import com.sanitaryware.crm.dto.ProductFilterDTO;
import com.sanitaryware.crm.entity.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> withFilters(ProductFilterDTO filter) {
        return (root, query, criteriaBuilder) -> {
            if (filter == null) {
                return criteriaBuilder.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Text Query (Search in Name, SKU, Description, Barcode)
            if (StringUtils.hasText(filter.getQuery())) {
                String searchPattern = "%" + filter.getQuery().trim().toLowerCase() + "%";
                Predicate nameLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), searchPattern);
                Predicate skuLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("sku")), searchPattern);
                Predicate descLike = criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), searchPattern);
                Predicate barcodeLike = criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("barcode"), "")), searchPattern);
                predicates.add(criteriaBuilder.or(nameLike, skuLike, descLike, barcodeLike));
            }

            // 2. Category Filter (exact category or category ID)
            if (filter.getCategoryId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("category").get("id"), filter.getCategoryId()));
            }

            // 3. Brand Filter
            if (filter.getBrandId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("brand").get("id"), filter.getBrandId()));
            }

            // 4. Price Range (sellingPrice >= minPrice and <= maxPrice)
            if (filter.getMinPrice() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("sellingPrice"), filter.getMinPrice()));
            }
            if (filter.getMaxPrice() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("sellingPrice"), filter.getMaxPrice()));
            }

            // 5. In Stock (true: stockQuantity > 0, false: stockQuantity <= 0)
            if (filter.getInStock() != null) {
                if (filter.getInStock()) {
                    predicates.add(criteriaBuilder.greaterThan(root.get("stockQuantity"), 0));
                } else {
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("stockQuantity"), 0));
                }
            }

            // 6. Low Stock (true: stockQuantity <= reorderLevel, false: stockQuantity > reorderLevel)
            if (filter.getLowStock() != null) {
                if (filter.getLowStock()) {
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("stockQuantity"), root.get("reorderLevel")));
                } else {
                    predicates.add(criteriaBuilder.greaterThan(root.get("stockQuantity"), root.get("reorderLevel")));
                }
            }

            // 7. Is Active (Explicit true or false)
            if (filter.getIsActive() != null) {
                predicates.add(criteriaBuilder.equal(root.get("isActive"), filter.getIsActive()));
            }

            // 8. Barcode (exact lookup)
            if (StringUtils.hasText(filter.getBarcode())) {
                predicates.add(criteriaBuilder.equal(root.get("barcode"), filter.getBarcode().trim()));
            }

            // 9. HSN Code (exact lookup)
            if (StringUtils.hasText(filter.getHsnCode())) {
                predicates.add(criteriaBuilder.equal(root.get("hsnCode"), filter.getHsnCode().trim()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
