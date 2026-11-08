package com.sanitaryware.crm.repository;

import com.sanitaryware.crm.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.sanitaryware.crm.entity.User.UserRole;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    long countByRoleAndIsActiveTrue(UserRole role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.role = :role and user.isActive = true order by user.id")
    List<User> findActiveByRoleForUpdate(@org.springframework.data.repository.query.Param("role") UserRole role);
}
