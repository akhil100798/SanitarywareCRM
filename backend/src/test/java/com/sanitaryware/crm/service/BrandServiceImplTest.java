package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.repository.BrandRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BrandServiceImplTest {
    @Mock
    private BrandRepository brandRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private FileUploadService fileUploadService;
    @InjectMocks
    private BrandServiceImpl brandService;

    @Test
    void attachCatalogAssociatesStoredPdfWithExistingBrand() {
        Brand brand = new Brand();
        brand.setId(42L);
        brand.setName("Parryware");
        MockMultipartFile file = new MockMultipartFile(
                "file", "Parryware catalog.pdf", "application/pdf", "%PDF-1.4 fixture".getBytes());
        when(brandRepository.findById(42L)).thenReturn(Optional.of(brand));
        when(fileUploadService.storeCatalogFile(file, "brand-catalogs/42"))
                .thenReturn("brand-catalogs/42/uuid.pdf");
        when(brandRepository.save(brand)).thenReturn(brand);

        var saved = brandService.attachCatalog(42L, file);

        assertEquals("Parryware catalog.pdf", saved.getCatalogFileName());
        assertEquals("brand-catalogs/42/uuid.pdf", brand.getCatalogStorageKey());
        verify(auditService).logEvent("UPLOAD_CATALOG", "BRAND", 42L,
                "Associated catalog Parryware catalog.pdf with brand Parryware");
    }
}
