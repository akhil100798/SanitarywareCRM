package com.sanitaryware.crm.config;

import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevQaUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${qa.admin.username:qaadmin}")
    private String adminUsername;

    @Value("${qa.admin.password:Password@123}")
    private String adminPassword;

    @Value("${qa.manager.username:qamanager}")
    private String managerUsername;

    @Value("${qa.manager.password:Password@123}")
    private String managerPassword;

    @Value("${qa.sales.username:qasales}")
    private String salesUsername;

    @Value("${qa.sales.password:Password@123}")
    private String salesPassword;

    @Override
    public void run(ApplicationArguments args) {
        ensureQaUser(adminUsername, adminPassword, "qaadmin@test.local", "QA Admin User",
                "9000000001", User.UserRole.ADMIN);
        ensureQaUser(managerUsername, managerPassword, "qamanager@test.local", "QA Manager User",
                "9000000002", User.UserRole.MANAGER);
        ensureQaUser(salesUsername, salesPassword, "qasales@test.local", "QA Sales User",
                "9000000003", User.UserRole.SALES);
    }

    private void ensureQaUser(String username, String password, String email, String fullName,
                              String phoneNumber, User.UserRole role) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPhoneNumber(phoneNumber);
        user.setRole(role);
        user.setIsActive(true);
        userRepository.save(user);
    }
}
