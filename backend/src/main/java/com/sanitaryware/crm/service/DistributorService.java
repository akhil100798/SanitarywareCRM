package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.DistributorDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DistributorService {
    DistributorDTO createDistributor(DistributorDTO distributorDTO);
    DistributorDTO updateDistributor(Long id, DistributorDTO distributorDTO);
    DistributorDTO getDistributorById(Long id);
    Page<DistributorDTO> getAllDistributors(Pageable pageable, String search);
    List<DistributorDTO> getAllActiveDistributors();
    void deleteDistributor(Long id);
    DistributorDTO toggleActiveStatus(Long id);
}
