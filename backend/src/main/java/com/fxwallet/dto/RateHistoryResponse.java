package com.fxwallet.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RateHistoryResponse {

    private Long id;
    private BigDecimal rate;
    private LocalDateTime timestamp;

    public RateHistoryResponse(Long id, BigDecimal rate, LocalDateTime timestamp) {
        this.id = id;
        this.rate = rate;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}
