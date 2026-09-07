package com.fxwallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record BuyRequest(
    @NotBlank(message = "Currency code is required")
    String currencyCode,

    @NotNull(message = "Amount in INR is required")
    @Positive(message = "Amount must be greater than zero")
    BigDecimal amountInr
) {}
