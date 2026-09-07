package com.fxwallet.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AlertRequest(
    @NotNull(message = "Currency code is required")
    String currencyCode,

    @NotNull(message = "Target rate is required")
    @Positive(message = "Target rate must be greater than zero")
    BigDecimal targetRate
) {}
