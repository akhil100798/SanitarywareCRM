package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.RegisterRequest;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.JwtTokenProvider;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

        ResponseEntity<?> response = authController.register(registerRequest());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(User.UserRole.ADMIN, userCaptor.getValue().getRole());
        assertEquals("encoded", userCaptor.getValue().getPassword());
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
