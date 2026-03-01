package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.DistributorDTO;
import com.sanitaryware.crm.entity.Distributor;
import org.springframework.stereotype.Component;

@Component
public class DistributorMapper {

    public DistributorDTO toDTO(Distributor distributor) {
        if (distributor == null) return null;

        DistributorDTO dto = new DistributorDTO();
        dto.setId(distributor.getId());
        dto.setName(distributor.getName());
        dto.setContactPerson(distributor.getContactPerson());
        dto.setEmail(distributor.getEmail());
        dto.setPhoneNumber(distributor.getPhoneNumber());
        dto.setAlternatePhone(distributor.getAlternatePhone());
        dto.setGstNumber(distributor.getGstNumber());
        dto.setAddress(distributor.getAddress());
        dto.setCity(distributor.getCity());
        dto.setState(distributor.getState());
        dto.setPincode(distributor.getPincode());
        dto.setBankName(distributor.getBankName());
        dto.setBankAccountNumber(distributor.getBankAccountNumber());
        dto.setBankIfsc(distributor.getBankIfsc());
        dto.setOutstandingBalance(distributor.getOutstandingBalance());
        dto.setIsActive(distributor.getIsActive());
        dto.setNotes(distributor.getNotes());
        return dto;
    }

    public Distributor toEntity(DistributorDTO dto) {
        if (dto == null) return null;

        Distributor distributor = new Distributor();
        updateEntity(distributor, dto);
        return distributor;
    }

    public void updateEntity(Distributor distributor, DistributorDTO dto) {
        if (dto == null || distributor == null) return;

        distributor.setName(dto.getName());
        distributor.setContactPerson(dto.getContactPerson());
        distributor.setEmail(dto.getEmail());
        distributor.setPhoneNumber(dto.getPhoneNumber());
        distributor.setAlternatePhone(dto.getAlternatePhone());
        distributor.setGstNumber(dto.getGstNumber());
        distributor.setAddress(dto.getAddress());
        distributor.setCity(dto.getCity());
        distributor.setState(dto.getState());
        distributor.setPincode(dto.getPincode());
        distributor.setBankName(dto.getBankName());
        distributor.setBankAccountNumber(dto.getBankAccountNumber());
        distributor.setBankIfsc(dto.getBankIfsc());
        if (dto.getIsActive() != null) distributor.setIsActive(dto.getIsActive());
        distributor.setNotes(dto.getNotes());
    }
}
