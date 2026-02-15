package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.BrandDTO;
import com.sanitaryware.crm.entity.Brand;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.BrandMapper;
import com.sanitaryware.crm.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;

    @Override
    public BrandDTO createBrand(BrandDTO brandDTO) {
        Brand brand = BrandMapper.toEntity(brandDTO);
        Brand savedBrand = brandRepository.save(brand);
        return BrandMapper.toDTO(savedBrand);
    }

    @Override
    public BrandDTO updateBrand(Long id, BrandDTO brandDTO) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));
        BrandMapper.updateEntity(brand, brandDTO);
        Brand updatedBrand = brandRepository.save(brand);
        return BrandMapper.toDTO(updatedBrand);
    }

    @Override
    @Transactional(readOnly = true)
    public BrandDTO getBrandById(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));
        return BrandMapper.toDTO(brand);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BrandDTO> getAllBrands() {
        return brandRepository.findAll().stream()
                .map(BrandMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BrandDTO> getActiveBrands() {
        // Assuming findByIsActiveTrue exists in Repo, let's check
        return brandRepository.findAll().stream()
                .filter(Brand::getIsActive)
                .map(BrandMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand not found with id: " + id));
        brand.setIsActive(false);
        brandRepository.save(brand);
    }
}
