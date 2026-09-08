package com.sanitaryware.crm.security;

import com.sanitaryware.crm.repository.RevokedTokenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private JwtTokenProvider tokenProvider;
    private CustomUserDetailsService users;
    private RevokedTokenRepository revokedTokens;
    private TokenRevocationService tokenRevocationService;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "secret", "unit-test-secret-with-at-least-32-characters");
        ReflectionTestUtils.setField(tokenProvider, "expiration", 60000L);
        tokenProvider.validateConfiguration();
        users = mock(CustomUserDetailsService.class);
        revokedTokens = mock(RevokedTokenRepository.class);
        tokenRevocationService = new TokenRevocationService(tokenProvider, revokedTokens);
        filter = new JwtAuthenticationFilter(tokenProvider, users, tokenRevocationService);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void acceptsValidTokenForActiveAccount() throws Exception {
        authenticate(false);
        assertEquals("sales", SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Test
    void rejectsPreviouslyIssuedTokenForDisabledAccount() throws Exception {
        authenticate(true);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void malformedTokenContinuesWithoutAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid-token");
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                assertNull(SecurityContextHolder.getContext().getAuthentication()));
        verifyNoInteractions(users);
        verifyNoInteractions(revokedTokens);
    }

    @Test
    void storageFailureDeniesAccessWithoutExposingInternalError() throws Exception {
        when(revokedTokens.existsByTokenFingerprintAndExpiresAtAfter(anyString(), any()))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private database details"));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + tokenProvider.generateToken("sales", "SALES"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> fail("Must fail closed"));
        assertEquals(503, response.getStatus());
        assertFalse(response.getContentAsString().contains("private database details"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verifyNoInteractions(users);
    }

    @Test
    void rejectsRevokedToken() throws Exception {
        String token = tokenProvider.generateToken("sales", "SALES");
        tokenRevocationService.revoke(token);
        when(revokedTokens.existsByTokenFingerprintAndExpiresAtAfter(anyString(), any())).thenReturn(true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                assertNull(SecurityContextHolder.getContext().getAuthentication()));

        verifyNoInteractions(users);
    }

    private void authenticate(boolean disabled) throws Exception {
        when(users.loadUserByUsername("sales")).thenReturn(User.withUsername("sales")
                .password("unused").roles("SALES").disabled(disabled).build());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + tokenProvider.generateToken("sales", "SALES"));
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
    }
}
