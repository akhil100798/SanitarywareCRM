package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.AuthResponse;
import com.sanitaryware.crm.dto.LoginRequest;
import com.sanitaryware.crm.dto.MessageResponse;
import com.sanitaryware.crm.dto.RegisterRequest;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(new MessageResponse("API is reachable"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            log.info("Attempting login for user: {}", request.getUsername());
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            log.info("Authentication successful for: {}", request.getUsername());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found after successful auth"));

            if (!user.getIsActive()) {
                log.warn("Login attempt for deactivated account: {}", request.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("Account is deactivated"));
            }

            String jwt = jwtTokenProvider.generateToken(user.getUsername(), user.getRole().name());
            log.info("JWT generated for: {}", request.getUsername());

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok(new AuthResponse(
                    jwt,
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole().name()
            ));

        } catch (BadCredentialsException e) {
            log.warn("Invalid login attempt for: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid username or password"));
        } catch (Exception e) {
            log.error("Unexpected error during login: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Username already exists: {}", request.getUsername());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Username already exists"));
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Email already exists: {}", request.getEmail());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Email already exists"));
        }

        try {
            User user = new User();
            user.setUsername(request.getUsername());
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setFullName(request.getFullName());
            user.setPhoneNumber(request.getPhoneNumber());
            user.setRole(User.UserRole.SALES); // Hardcoded to prevent privilege escalation
            user.setIsActive(true);

            userRepository.save(user);
            log.info("User registered successfully: {}", request.getUsername());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new MessageResponse("User registered successfully"));
        } catch (Exception e) {
            log.error("Error during user registration: ", e);
            throw e; // Let global handler take it
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Not authenticated"));
        }
        
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(new AuthResponse(
                null,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name()
        ));
    }
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody com.sanitaryware.crm.dto.UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFullName() != null && !request.getFullName().isEmpty()) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                 return ResponseEntity.badRequest()
                        .body(new MessageResponse("Email already in use by another account"));
            }
            user.setEmail(request.getEmail());
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Incorrect current password"));
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        userRepository.save(user);

        return ResponseEntity.ok(new AuthResponse(
                null,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name()
        ));
    }
}
