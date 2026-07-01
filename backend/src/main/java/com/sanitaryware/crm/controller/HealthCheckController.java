package com.sanitaryware.crm.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthCheckController {

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        
        try {
            if (jdbcTemplate != null) {
                jdbcTemplate.execute("SELECT 1");
                health.put("database", "UP");
            } else {
                health.put("database", "UNKNOWN");
            }
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("database", "DOWN: " + e.getMessage());
        }

        return ResponseEntity.ok(health);
    }
}
