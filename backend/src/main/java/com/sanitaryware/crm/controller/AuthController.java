package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.AuthResponse;
import com.sanitaryware.crm.dto.LoginRequest;
import com.sanitaryware.crm.dto.MessageResponse;
import com.sanitaryware.crm.dto.RegisterRequest;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.BootstrapLockRepository;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final BootstrapLockRepository bootstrapLockRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final com.sanitaryware.crm.security.TokenRevocationService tokenRevocationService;
    private final com.sanitaryware.crm.security.LoginRateLimiter loginRateLimiter;
    private final com.sanitaryware.crm.service.AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (request.getUsername() == null || request.getUsername().contains("\0") || (request.getPassword() != null && request.getPassword().contains("\0"))) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid characters in credentials"));
        }
        String cleanUsername = request.getUsername().trim().toLowerCase();
        String ipUserKey = httpRequest.getRemoteAddr() + ":" + cleanUsername;
        String userKey = "user:" + cleanUsername;
        loginRateLimiter.checkAllowed(ipUserKey);
        loginRateLimiter.checkAllowed(userKey);
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
            loginRateLimiter.reset(ipUserKey);
            loginRateLimiter.reset(userKey);

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok(new AuthResponse(
                    jwt,
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getPhoneNumber(),
                    user.getRole().name()
            ));

        } catch (BadCredentialsException e) {
            loginRateLimiter.recordFailure(ipUserKey);
            loginRateLimiter.recordFailure(userKey);
            log.warn("Invalid login attempt for: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Invalid username or password"));
        } catch (org.springframework.security.authentication.DisabledException e) {
            log.warn("Login attempt for deactivated account: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Account is deactivated"));
        } catch (org.springframework.security.authentication.LockedException e) {
            log.warn("Login attempt for locked account: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Account is locked"));
        } catch (org.springframework.security.authentication.AccountStatusException e) {
            log.warn("Login attempt for inactive account: {}", request.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Account is not active"));
        } catch (Exception e) {
            log.error("Unexpected error during login: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Login failed"));
        }
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());
        if (request.getUsername() == null || request.getUsername().contains("\0") 
                || (request.getEmail() != null && request.getEmail().contains("\0")) 
                || (request.getPassword() != null && request.getPassword().contains("\0"))) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid characters in registration"));
        }

        bootstrapLockRepository.findSingletonForUpdate()
                .orElseThrow(() -> new IllegalStateException(
                        "Bootstrap lock row is missing; apply database migrations"));
        boolean firstUser = userRepository.count() == 0;
        if (!firstUser && !isCurrentUserAdminOrManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("Only administrators and managers can register users"));
        }

        String normalizedUsername = request.getUsername().trim();
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            log.warn("Username already exists: {}", request.getUsername());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Username already exists"));
        }

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.warn("Email already exists: {}", request.getEmail());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Email already exists"));
        }

        try {
            User user = new User();
            user.setUsername(normalizedUsername);
            user.setEmail(normalizedEmail);
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setFullName(request.getFullName().trim());
            user.setPhoneNumber(request.getPhoneNumber());
            user.setRole(firstUser ? User.UserRole.ADMIN : User.UserRole.SALES);
            user.setIsActive(true);

            User savedUser = userRepository.save(user);
            User effectiveUser = savedUser != null ? savedUser : user;
            log.info("User registered successfully: {}", request.getUsername());

            auditService.logEvent("REGISTER_USER", "USER", effectiveUser.getId(),
                    "Registered user " + effectiveUser.getUsername() + " with role " + effectiveUser.getRole());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new MessageResponse("User registered successfully"));
        } catch (Exception e) {
            log.error("Error during user registration: ", e);
            throw e; // Let global handler take it
        }
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() <= 7) {
            throw new IllegalArgumentException("Authorization header must contain a bearer token");
        }
        tokenRevocationService.revoke(authorization.substring(7));
        return ResponseEntity.noContent().build();
    }

    private boolean isCurrentUserAdminOrManager() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority()) || "ROLE_MANAGER".equals(authority.getAuthority()));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
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
                user.getPhoneNumber(),
                user.getRole().name()
        ));
    }
    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody com.sanitaryware.crm.dto.UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFullName() != null) {
            String cleanName = request.getFullName().trim();
            if (cleanName.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Full name cannot be blank"));
            }
            user.setFullName(cleanName);
        }
        if (request.getPhoneNumber() != null) {
            String cleanPhone = request.getPhoneNumber().trim();
            if (!cleanPhone.isEmpty() && !cleanPhone.matches("^[0-9+() -]{7,15}$")) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Phone number must contain only valid digits and phone characters"));
            }
            user.setPhoneNumber(cleanPhone.isEmpty() ? null : cleanPhone);
        }
        if (request.getEmail() != null) {
            String cleanEmail = request.getEmail().trim().toLowerCase();
            if (cleanEmail.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Email cannot be blank"));
            }
            if (!cleanEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(cleanEmail)) {
                 return ResponseEntity.badRequest()
                        .body(new MessageResponse("Email already in use by another account"));
            }
            user.setEmail(cleanEmail);
        }

        boolean passwordChanged = false;
        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Incorrect current password"));
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            passwordChanged = true;
        }

        User updatedUser = userRepository.save(user);

        auditService.logEvent("UPDATE_PROFILE", "USER", updatedUser.getId(),
                "Updated profile for " + updatedUser.getUsername() + (passwordChanged ? " (password changed)" : ""));

        return ResponseEntity.ok(new AuthResponse(
                null,
                updatedUser.getId(),
                updatedUser.getUsername(),
                updatedUser.getEmail(),
                updatedUser.getFullName(),
                updatedUser.getPhoneNumber(),
                updatedUser.getRole().name()
        ));
    }
}
