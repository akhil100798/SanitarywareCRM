package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.entity.AuditLog;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.service.AuditService;
import com.sanitaryware.crm.web.PaginationFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuditLogController.class)
@Import({AuditLogControllerTest.TestSecurityConfig.class, GlobalExceptionHandler.class, PaginationFactory.class})
class AuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditService auditService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
            return http.build();
        }
    }

    @Test
    @WithMockUser(username = "adminUser", roles = {"ADMIN"})
    void getAuditLogs_AdminRole_Returns200() throws Exception {
        when(auditService.getAuditLogs(any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/audit-logs"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "managerUser", roles = {"MANAGER"})
    void getAuditLogs_ManagerRole_Returns200() throws Exception {
        when(auditService.getAuditLogs(any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/audit-logs"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "salesUser", roles = {"SALES"})
    void getAuditLogs_SalesRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/audit-logs"))
                .andExpect(status().isForbidden());
    }
}
