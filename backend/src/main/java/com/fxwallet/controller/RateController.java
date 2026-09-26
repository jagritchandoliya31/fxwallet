package com.fxwallet.controller;

import com.fxwallet.dto.RateHistoryResponse;
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
    public ResponseEntity<List<RateHistoryResponse>> getRateHistory(
            @PathVariable String code) {

        List<com.fxwallet.entity.RateHistory> histories =
                rateService.getRateHistory(code);

        List<RateHistoryResponse> response = histories.stream()
                .map(h -> new RateHistoryResponse(
                        h.getId(),
                        h.getRate(),
                        h.getTimestamp()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }
}