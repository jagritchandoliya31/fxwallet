package com.fxwallet.controller;

import com.fxwallet.dto.PremiumAdvisorResponse;
import com.fxwallet.service.PremiumAdvisorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/premium-advisor")
public class PremiumAdvisorController {

    private final PremiumAdvisorService premiumAdvisorService;

    public PremiumAdvisorController(PremiumAdvisorService premiumAdvisorService) {
        this.premiumAdvisorService = premiumAdvisorService;
    }

    @GetMapping("/analyze")
    public ResponseEntity<PremiumAdvisorResponse> analyze(
            @RequestParam BigDecimal investmentAmount,
            @RequestParam(defaultValue = "MEDIUM") String riskLevel,
            @RequestParam(defaultValue = "30") int analysisPeriodDays) {

        return ResponseEntity.ok(
                premiumAdvisorService.analyze(
                        investmentAmount,
                        riskLevel,
                        analysisPeriodDays
                )
        );
    }
}