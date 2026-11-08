package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.config.SecurityConfig;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.repository.BootstrapLockRepository;
import com.sanitaryware.crm.repository.UserRepository;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtAuthenticationFilter;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.security.LoginRateLimiter;
import com.sanitaryware.crm.security.TokenRevocationService;
import com.sanitaryware.crm.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class})
class AuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BootstrapLockRepository bootstrapLockRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenRevocationService tokenRevocationService;

    @MockBean
    private LoginRateLimiter loginRateLimiter;

    @MockBean
    private AuditService auditService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void anonymousUserCannotReadCurrentProfile() throws Exception {
        mockMvc.perform(get("/api/auth/me").with(anonymous()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userRepository);
    }

    @Test
    void anonymousUserCannotUpdateProfile() throws Exception {
        mockMvc.perform(put("/api/auth/profile").with(anonymous())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Unauthorized Profile Update\","
                                + "\"email\":\"unauthorized@example.test\","
                                + "\"phoneNumber\":\"9000000000\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userRepository);
    }
}
