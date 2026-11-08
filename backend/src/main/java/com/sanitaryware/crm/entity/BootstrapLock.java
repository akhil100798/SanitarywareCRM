package com.sanitaryware.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bootstrap_lock")
@NoArgsConstructor
public class BootstrapLock {

    @Id
    @Column(nullable = false)
    private Integer id;

    public BootstrapLock(Integer id) {
        this.id = id;
    }
}
