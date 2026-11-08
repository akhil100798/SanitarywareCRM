package com.sanitaryware.crm.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
public class HealthCheckController {

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> health = new HashMap<>();
        boolean databaseHealthy = false;
        try {
            if (jdbcTemplate != null) {
                jdbcTemplate.execute("SELECT 1");
                health.put("database", "UP");
                databaseHealthy = true;
            } else {
                health.put("database", "UNAVAILABLE");
            }
        } catch (Exception e) {
            log.error("Database health check failed", e);
            health.put("database", "DOWN");
        }

        health.put("status", databaseHealthy ? "UP" : "DOWN");
        return ResponseEntity.status(databaseHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                .body(health);
    }
}
