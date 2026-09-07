package com.fxwallet.dto;

import java.math.BigDecimal;

public record RateResponse(
    String code,
    String name,
    String symbol,
    BigDecimal rate,
    String change
) {}
