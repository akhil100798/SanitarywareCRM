package com.sanitaryware.crm.config;

import com.sanitaryware.crm.entity.BootstrapLock;
import com.sanitaryware.crm.repository.BootstrapLockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"dev", "qa"})
@RequiredArgsConstructor
public class BootstrapLockInitializer implements ApplicationRunner {

    private final BootstrapLockRepository bootstrapLockRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!bootstrapLockRepository.existsById(1)) {
            bootstrapLockRepository.save(new BootstrapLock(1));
        }
    }
}
