package com.sanitaryware.crm.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("qa")
class ActuatorSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Health endpoint is accessible unauthenticated and returns 200 UP")
    void healthEndpointIsPermittedUnauthenticated() throws Exception {
        mockMvc.perform(get("/actuator/health").with(anonymous()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Prometheus endpoint returns 401 Unauthorized for unauthenticated requests")
    void prometheusRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/actuator/prometheus").with(anonymous()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Prometheus endpoint returns 403 Forbidden for non-ADMIN users (e.g. SALES)")
    @WithMockUser(username = "salesuser", roles = {"SALES"})
    void prometheusIsForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Prometheus endpoint returns 200 OK for ADMIN users")
    @WithMockUser(username = "adminuser", roles = {"ADMIN"})
    void prometheusIsAccessibleForAdmin() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk());
    }
}
