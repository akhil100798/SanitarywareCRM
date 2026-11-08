package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CreateManagedUserRequest;
import com.sanitaryware.crm.dto.UpdateUserAccessRequest;
import com.sanitaryware.crm.dto.UserAdminDTO;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public List<UserAdminDTO> listUsers() {
        User actor = currentUser();
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "username")).stream()
                .filter(user -> actor.getRole() == User.UserRole.ADMIN
                        || user.getRole() == User.UserRole.SALES
                        || user.getRole() == User.UserRole.WAREHOUSE)
                .map(UserAdminDTO::from)
                .toList();
    }

    @Override
    @Transactional
    public UserAdminDTO createUser(CreateManagedUserRequest request) {
        User actor = currentUser();
        requireManageableRole(actor, request.getRole());
        String username = request.getUsername().trim();
        String email = request.getEmail().trim();
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(request.getPhoneNumber() == null ? null : request.getPhoneNumber().trim());
        user.setRole(request.getRole());
        user.setIsActive(true);
        User savedUser = userRepository.save(user);
        auditService.logEvent("CREATE_USER", "USER", savedUser.getId(),
                "Created user " + savedUser.getUsername() + " with role " + savedUser.getRole());
        return UserAdminDTO.from(savedUser);
    }

    @Override
    @Transactional
    public UserAdminDTO updateAccess(Long userId, UpdateUserAccessRequest request) {
        User actor = currentUser();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        requireManageableRole(actor, user.getRole());
        requireManageableRole(actor, request.getRole());

        boolean remainsActiveAdmin = user.getRole() == User.UserRole.ADMIN
                && Boolean.TRUE.equals(user.getIsActive())
                && (request.getRole() != User.UserRole.ADMIN || !request.getActive());
        if (remainsActiveAdmin && userRepository.findActiveByRoleForUpdate(User.UserRole.ADMIN).size() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "At least one active administrator must remain");
        }

        if (user.getId().equals(actor.getId())
                && (request.getRole() != User.UserRole.ADMIN || !request.getActive())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove your own administrator access");
        }

        user.setRole(request.getRole());
        user.setIsActive(request.getActive());
        User savedUser = userRepository.save(user);
        auditService.logEvent("UPDATE_USER_ACCESS", "USER", savedUser.getId(),
                "Updated role/access for user " + savedUser.getUsername());
        return UserAdminDTO.from(savedUser);
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private void requireManageableRole(User actor, User.UserRole role) {
        if (actor.getRole() == User.UserRole.ADMIN) return;
        if (actor.getRole() == User.UserRole.MANAGER
                && (role == User.UserRole.SALES || role == User.UserRole.WAREHOUSE)) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage this user role");
    }
}
