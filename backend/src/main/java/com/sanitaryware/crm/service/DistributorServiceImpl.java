package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorDTO;
import com.sanitaryware.crm.entity.Distributor;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.mapper.DistributorMapper;
import com.sanitaryware.crm.repository.DistributorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DistributorServiceImpl implements DistributorService {

    private final DistributorRepository distributorRepository;
    private final com.sanitaryware.crm.repository.PurchaseOrderRepository purchaseOrderRepository;
    private final DistributorMapper distributorMapper;
    private final AuditService auditService;
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional
    public DistributorDTO createDistributor(DistributorDTO dto) {
        Distributor distributor = distributorMapper.toEntity(dto);
        distributor = distributorRepository.save(distributor);

        auditService.logEvent("CREATE", "DISTRIBUTOR", distributor.getId(),
                "Created distributor " + distributor.getName() + " (" + distributor.getPhoneNumber() + ")");

        return distributorMapper.toDTO(distributor);
    }

    @Override
    @Transactional
    public DistributorDTO updateDistributor(Long id, DistributorDTO dto) {
        Distributor distributor = lockedDistributor(id);
        
        distributorMapper.updateEntity(distributor, dto);
        distributor = distributorRepository.save(distributor);

        auditService.logEvent("UPDATE", "DISTRIBUTOR", distributor.getId(),
                "Updated distributor " + distributor.getName() + " (" + distributor.getPhoneNumber() + ")");

        return distributorMapper.toDTO(distributor);
    }

    @Override
    public DistributorDTO getDistributorById(Long id) {
        Distributor distributor = distributorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Distributor not found with id: " + id));
        return distributorMapper.toDTO(distributor);
    }

    @Override
    public Page<DistributorDTO> getAllDistributors(Pageable pageable, String search) {
        Page<Distributor> distributors;
        
        if (search != null && !search.trim().isEmpty()) {
            distributors = distributorRepository.searchDistributors(search, pageable);
        } else {
            distributors = distributorRepository.findAll(pageable);
        }
        
        return distributors.map(distributorMapper::toDTO);
    }

    @Override
    public List<DistributorDTO> getAllActiveDistributors() {
        return distributorRepository.findByIsActiveTrue().stream()
                .map(distributorMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteDistributor(Long id) {
        Distributor distributor = lockedDistributor(id);
        
        long poCount = purchaseOrderRepository.countByDistributorId(id);
        if (poCount > 0) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Cannot delete distributor with active purchase orders. Archive instead.");
        }

        // Soft delete by setting inactive
        distributor.setIsActive(false);
        distributorRepository.save(distributor);

        auditService.logEvent("DEACTIVATE", "DISTRIBUTOR", id,
                "Deactivated distributor " + distributor.getName());
    }

    @Override
    @Transactional
    public DistributorDTO toggleActiveStatus(Long id) {
        Distributor distributor = lockedDistributor(id);
        
        distributor.setIsActive(!distributor.getIsActive());
        distributor = distributorRepository.save(distributor);

        auditService.logEvent("TOGGLE_STATUS", "DISTRIBUTOR", id,
                "Toggled active status of distributor " + distributor.getName() + " to " + distributor.getIsActive());

        return distributorMapper.toDTO(distributor);
    }

    private Distributor lockedDistributor(Long id) {
        Distributor distributor = distributorRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Distributor not found with id: " + id));
        entityManager.refresh(distributor, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return distributor;
    }
}
