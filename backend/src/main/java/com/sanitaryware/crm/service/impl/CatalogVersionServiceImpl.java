package com.sanitaryware.crm.service.impl;

import com.sanitaryware.crm.dto.CatalogVersionDTO;
import com.sanitaryware.crm.entity.CatalogVersion;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.ProductPriceHistory;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.CatalogVersionRepository;
import com.sanitaryware.crm.repository.ProductPriceHistoryRepository;
import com.sanitaryware.crm.repository.ProductRepository;
import com.sanitaryware.crm.service.AuditService;
import com.sanitaryware.crm.service.CatalogVersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogVersionServiceImpl implements CatalogVersionService {

    private final CatalogVersionRepository catalogVersionRepository;
    private final ProductPriceHistoryRepository productPriceHistoryRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public List<CatalogVersionDTO> getVersionsForBrand(Long brandId) {
        return catalogVersionRepository.findByBrandIdOrderByCreatedAtDesc(brandId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public CatalogVersionDTO rollbackVersion(Long versionId) {
        CatalogVersion version = catalogVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog version not found with id: " + versionId));

        if ("ROLLED_BACK".equalsIgnoreCase(version.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This catalog version has already been rolled back.");
        }

        List<ProductPriceHistory> histories = productPriceHistoryRepository.findByCatalogVersionIdOrderBySkuAsc(versionId);
        int rolledBackCount = 0;

        for (ProductPriceHistory history : histories) {
            Product product = history.getProduct();
            if (product == null) {
                continue;
            }

            if ("UPDATED".equalsIgnoreCase(history.getChangeType())) {
                if (history.getOldMrp() != null) {
                    product.setMrp(history.getOldMrp());
                }
                if (history.getOldSellingPrice() != null) {
                    product.setSellingPrice(history.getOldSellingPrice());
                }
                productRepository.save(product);
                rolledBackCount++;
            } else if ("CREATED".equalsIgnoreCase(history.getChangeType())) {
                // For created products, mark inactive to safely revoke them without breaking relational integrity
                product.setIsActive(false);
                product.setIsAvailable(false);
                productRepository.save(product);
                rolledBackCount++;
            }
        }

        version.setStatus("ROLLED_BACK");
        CatalogVersion savedVersion = catalogVersionRepository.save(version);

        auditService.logEvent("CATALOG_ROLLBACK", "CATALOG_VERSION", versionId,
                "Rolled back catalog version " + version.getVersionTag() + " (" + rolledBackCount + " products reverted)");

        log.info("Successfully rolled back catalog version {} with {} products restored", versionId, rolledBackCount);
        return toDto(savedVersion);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generatePriceRevisionCsv(Long versionId) {
        CatalogVersion version = catalogVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog version not found with id: " + versionId));

        List<ProductPriceHistory> histories = productPriceHistoryRepository.findByCatalogVersionIdOrderBySkuAsc(versionId);

        StringBuilder sb = new StringBuilder();
        sb.append("SKU,Product Name,Change Type,Old MRP,New MRP,Difference (₹),Change %,Status\n");

        for (ProductPriceHistory h : histories) {
            String name = h.getProduct() != null ? h.getProduct().getName() : "--";
            name = name.replace("\"", "\"\"");

            BigDecimal oldMrp = h.getOldMrp() != null ? h.getOldMrp() : BigDecimal.ZERO;
            BigDecimal newMrp = h.getNewMrp() != null ? h.getNewMrp() : BigDecimal.ZERO;
            BigDecimal diff = newMrp.subtract(oldMrp);

            String pct = "0.0%";
            if (oldMrp.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal pctVal = diff.multiply(BigDecimal.valueOf(100.0))
                        .divide(oldMrp, 1, RoundingMode.HALF_UP);
                pct = pctVal.toPlainString() + "%";
            } else if ("CREATED".equalsIgnoreCase(h.getChangeType())) {
                pct = "NEW";
            }

            sb.append('"').append(h.getSku()).append("\",")
              .append('"').append(name).append("\",")
              .append('"').append(h.getChangeType()).append("\",")
              .append(oldMrp).append(',')
              .append(newMrp).append(',')
              .append(diff).append(',')
              .append('"').append(pct).append("\",")
              .append('"').append(version.getStatus()).append("\"\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    @Transactional(readOnly = true)
    public String getVersionFileName(Long versionId) {
        CatalogVersion version = catalogVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Catalog version not found with id: " + versionId));
        return version.getFileName();
    }

    private CatalogVersionDTO toDto(CatalogVersion v) {
        return CatalogVersionDTO.builder()
                .id(v.getId())
                .brandId(v.getBrand() != null ? v.getBrand().getId() : null)
                .brandName(v.getBrand() != null ? v.getBrand().getName() : null)
                .versionTag(v.getVersionTag())
                .fileName(v.getFileName())
                .sha256(v.getSha256())
                .totalProducts(v.getTotalProducts())
                .createdCount(v.getCreatedCount())
                .updatedCount(v.getUpdatedCount())
                .status(v.getStatus())
                .createdAt(v.getCreatedAt())
                .createdBy(v.getCreatedBy())
                .build();
    }
}
