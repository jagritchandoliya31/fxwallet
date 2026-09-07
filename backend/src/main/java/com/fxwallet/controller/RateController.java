package com.fxwallet.controller;

import com.fxwallet.dto.RateResponse;
import com.fxwallet.service.RateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rates")
public class RateController {
    private final RateService rateService;

    public RateController(RateService rateService) {
        this.rateService = rateService;
    }

    @GetMapping
    public ResponseEntity<List<RateResponse>> getAllRates() {
        return ResponseEntity.ok(rateService.getAllRates());
    }

    @GetMapping("/{code}/history")
    public ResponseEntity<List<com.fxwallet.entity.RateHistory>> getRateHistory(@PathVariable String code) {
        return ResponseEntity.ok(rateService.getRateHistory(code));
    }
}
