package com.fxwallet.controller;

import com.fxwallet.dto.AdvisorResponse;
import com.fxwallet.service.AdvisorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/advisor")
public class AdvisorController {
    private final AdvisorService advisorService;

    public AdvisorController(AdvisorService advisorService) {
        this.advisorService = advisorService;
    }

    @GetMapping("/{code}")
    public ResponseEntity<AdvisorResponse> getAdvisor(@PathVariable String code) {
        return ResponseEntity.ok(advisorService.getAdvisor(code));
    }
}
