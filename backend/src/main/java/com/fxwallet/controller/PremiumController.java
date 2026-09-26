package com.fxwallet.controller;

import com.fxwallet.entity.User;
import com.fxwallet.service.PremiumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/premium")
public class PremiumController {

    private final PremiumService premiumService;

    public PremiumController(PremiumService premiumService) {
        this.premiumService = premiumService;
    }

    @PostMapping("/purchase")
    public ResponseEntity<String> purchasePremium() {

        User user = premiumService.activatePremium();

        return ResponseEntity.ok(
                "Premium activated successfully for " + user.getEmail()
        );
    }
}