package com.sanitaryware.crm.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "distributors")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Distributor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String contactPerson;

    @Column(unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 15)
    private String phoneNumber;

    @Column(length = 15)
    private String alternatePhone;

    @Column(length = 50)
    private String gstNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 50)
    private String city;

    @Column(length = 50)
    private String state;

    @Column(length = 10)
    private String pincode;

    @Column(length = 100)
    private String bankName;

    @Column(length = 30)
    private String bankAccountNumber;

    @Column(length = 20)
    private String bankIfsc;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "distributor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PurchaseOrder> purchaseOrders = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
