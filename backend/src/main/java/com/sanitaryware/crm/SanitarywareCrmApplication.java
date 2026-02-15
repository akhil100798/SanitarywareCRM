package com.sanitaryware.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SanitarywareCrmApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanitarywareCrmApplication.class, args);
    }

}
