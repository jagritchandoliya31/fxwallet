package com.fxwallet.controller;

import com.fxwallet.entity.User;
import com.fxwallet.service.PremiumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
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

    @PostMapping("/request-verification")
    public ResponseEntity<String> requestVerification() {
        premiumService.sendPurchaseVerificationCode();
        return ResponseEntity.ok("Verification code sent to your registered email.");
    }

    @PostMapping("/confirm-purchase")
    public ResponseEntity<String> confirmPurchase(@RequestParam String otp) {
        User user = premiumService.verifyPurchaseAndActivate(otp);
        return ResponseEntity.ok(
                "Premium activated successfully for " + user.getEmail()
        );
    }

    @PostMapping("/purchase")
    public ResponseEntity<String> purchasePremium() {

        User user = premiumService.activatePremium();

        return ResponseEntity.ok(
                "Premium activated successfully for " + user.getEmail()
        );
    }
}