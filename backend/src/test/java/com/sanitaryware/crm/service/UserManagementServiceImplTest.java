package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CreateManagedUserRequest;
import com.sanitaryware.crm.dto.UpdateUserAccessRequest;
import com.sanitaryware.crm.dto.UserAdminDTO;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserManagementServiceImplTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private AuditService auditService;
    private UserManagementServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        auditService = mock(AuditService.class);
        service = new UserManagementServiceImpl(userRepository, passwordEncoder, auditService);
        when(passwordEncoder.encode("Passw0rd!" )).thenReturn("bcrypt-hash");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adminCreatesUserWithHashedPasswordAndSafeDto() {
        User admin = user(1L, "admin", User.UserRole.ADMIN, true);
        authenticate(admin);
        when(userRepository.existsByUsername("new-sales")).thenReturn(false);
        when(userRepository.existsByEmail("sales@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateManagedUserRequest request = createRequest("new-sales", User.UserRole.SALES);
        UserAdminDTO result = service.createUser(request);

        verify(passwordEncoder).encode("Passw0rd!");
        verify(userRepository).save(org.mockito.ArgumentMatchers.argThat(saved ->
                "bcrypt-hash".equals(saved.getPassword()) && saved.getRole() == User.UserRole.SALES));
        assertEquals("new-sales", result.username());
        assertFalse(java.util.Arrays.stream(UserAdminDTO.class.getRecordComponents())
                .anyMatch(component -> component.getName().toLowerCase().contains("password")));
        verify(auditService).logEvent(eq("CREATE_USER"), eq("USER"), any(), any());
    }

    @Test
    void managerCannotCreateAdmin() {
        authenticate(user(2L, "manager", User.UserRole.MANAGER, true));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.createUser(createRequest("new-admin", User.UserRole.ADMIN)));

        assertEquals(403, exception.getStatusCode().value());
        verify(userRepository, never()).save(any());
    }

    @Test
    void managerCanCreateWarehouseUser() {
        authenticate(user(2L, "manager", User.UserRole.MANAGER, true));
        when(userRepository.existsByUsername("warehouse")).thenReturn(false);
        when(userRepository.existsByEmail("warehouse@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAdminDTO result = service.createUser(createRequest("warehouse", User.UserRole.WAREHOUSE));

        assertEquals("WAREHOUSE", result.role());
    }

    @Test
    void lastActiveAdminCannotBeDemoted() {
        User admin = user(1L, "admin", User.UserRole.ADMIN, true);
        authenticate(admin);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findActiveByRoleForUpdate(User.UserRole.ADMIN)).thenReturn(List.of(admin));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateAccess(1L, accessRequest(User.UserRole.SALES, false)));

        assertEquals(409, exception.getStatusCode().value());
        verify(userRepository, never()).save(any());
    }

    @Test
    void managerCannotEditAdminAccount() {
        authenticate(user(2L, "manager", User.UserRole.MANAGER, true));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user(1L, "admin", User.UserRole.ADMIN, true)));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.updateAccess(1L, accessRequest(User.UserRole.ADMIN, true)));

        assertEquals(403, exception.getStatusCode().value());
        verify(userRepository, never()).save(any());
    }

    private void authenticate(User user) {
        when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getUsername(), "", List.of()));
    }

    private static User user(Long id, String username, User.UserRole role, boolean active) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPassword("existing-hash");
        user.setFullName(username);
        user.setRole(role);
        user.setIsActive(active);
        return user;
    }

    private static CreateManagedUserRequest createRequest(String username, User.UserRole role) {
        CreateManagedUserRequest request = new CreateManagedUserRequest();
        request.setUsername(username);
        request.setEmail(username + "@example.com");
        request.setPassword("Passw0rd!");
        request.setFullName(username);
        request.setRole(role);
        return request;
    }

    private static UpdateUserAccessRequest accessRequest(User.UserRole role, boolean active) {
        UpdateUserAccessRequest request = new UpdateUserAccessRequest();
        request.setRole(role);
        request.setActive(active);
        return request;
    }
}
