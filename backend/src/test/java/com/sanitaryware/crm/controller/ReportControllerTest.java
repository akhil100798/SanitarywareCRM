package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.ReportDTO;
import com.sanitaryware.crm.exception.GlobalExceptionHandler;
import com.sanitaryware.crm.security.CustomUserDetailsService;
import com.sanitaryware.crm.security.JwtTokenProvider;
import com.sanitaryware.crm.security.TokenRevocationService;
import com.sanitaryware.crm.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReportController.class)
@Import({ReportControllerTest.TestSecurityConfig.class, GlobalExceptionHandler.class})
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReportService reportService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private TokenRevocationService tokenRevocationService;

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
    void getSalesSummary_AdminRole_Returns200() throws Exception {
        when(reportService.getSalesSummary(any(), any(), any(), any()))
                .thenReturn(ReportDTO.SalesSummaryReport.builder()
                        .totalSales(BigDecimal.ZERO)
                        .totalOrders(0)
                        .orders(Collections.emptyList())
                        .build());

        mockMvc.perform(get("/api/reports/sales-summary"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "managerUser", roles = {"MANAGER"})
    void getInventorySummary_ManagerRole_Returns200() throws Exception {
        when(reportService.getInventorySummary(any(), any()))
                .thenReturn(ReportDTO.InventorySummaryReport.builder()
                        .totalProducts(0)
                        .items(Collections.emptyList())
                        .build());

        mockMvc.perform(get("/api/reports/inventory-summary"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "salesUser", roles = {"SALES"})
    void getSalesSummary_SalesRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/reports/sales-summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "salesUser", roles = {"SALES"})
    void getCustomerOutstanding_SalesRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/reports/customer-outstanding"))
                .andExpect(status().isForbidden());
    }
}
