package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.RegisterRequest;
import com.sanitaryware.crm.dto.UpdateProfileRequest;
import com.sanitaryware.crm.dto.AuthResponse;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.security.TokenRevocationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.List;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private TokenRevocationService tokenRevocationService;

    @Mock
    private com.sanitaryware.crm.service.AuditService auditService;

    @InjectMocks
    private AuthController authController;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void register_WhenUsersExistAndCallerUnauthenticated_ReturnsForbidden() {
        when(userRepository.count()).thenReturn(1L);

        ResponseEntity<?> response = authController.register(registerRequest());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_FirstUser_CreatesAdminAccount() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByUsername("owner")).thenReturn(false);
        when(userRepository.existsByEmail("owner@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Admin@123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> response = authController.register(registerRequest());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(User.UserRole.ADMIN, userCaptor.getValue().getRole());
        assertEquals("encoded", userCaptor.getValue().getPassword());
    }

    @Test
    void register_AdminCanCreateRequestedRole() {
        when(userRepository.count()).thenReturn(1L);
        when(userRepository.existsByUsername("warehouse")).thenReturn(false);
        when(userRepository.existsByEmail("warehouse@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Admin@123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        RegisterRequest request = registerRequest();
        request.setUsername("warehouse");
        request.setEmail("warehouse@example.com");
        request.setRole("WAREHOUSE");

        authController.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(User.UserRole.WAREHOUSE, userCaptor.getValue().getRole());
    }

    @Test
    void logout_RevokesBearerToken() {
        ResponseEntity<Void> response = authController.logout("Bearer revoked-token");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(tokenRevocationService).revoke("revoked-token");
    }

    @Test
    void logout_RejectsMissingOrMalformedBearerToken() {
        assertThrows(IllegalArgumentException.class, () -> authController.logout(null));
        assertThrows(IllegalArgumentException.class, () -> authController.logout("Basic credentials"));
        assertThrows(IllegalArgumentException.class, () -> authController.logout("Bearer "));
        verify(tokenRevocationService, never()).revoke(any());
    }

    @Test
    void updateProfile_ReturnsPersistedPhoneNumber() {
        User user = new User();
        user.setId(7L);
        user.setUsername("sales");
        user.setEmail("sales@example.com");
        user.setFullName("Sales User");
        user.setPhoneNumber("9000000000");
        user.setRole(User.UserRole.SALES);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("sales", null));
        when(userRepository.findByUsername("sales")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPhoneNumber("9111111111");
        ResponseEntity<?> response = authController.updateProfile(request);

        assertEquals("9111111111", ((AuthResponse) response.getBody()).getPhoneNumber());
    }

    private RegisterRequest registerRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("owner");
        request.setEmail("owner@example.com");
        request.setPassword("Admin@123");
        request.setFullName("Owner User");
        return request;
    }
}
