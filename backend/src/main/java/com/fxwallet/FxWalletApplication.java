package com.fxwallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FxWalletApplication {

    public static void main(String[] args) {
        SpringApplication.run(FxWalletApplication.class, args);
    }
}
