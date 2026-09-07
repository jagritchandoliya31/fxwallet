package com.fxwallet.dto;

import java.math.BigDecimal;

public record AdvisorResponse(
    String currencyCode,
    String currencyName,
    BigDecimal currentRate,
    BigDecimal historicalAverage,
    BigDecimal recentPercentageChange,
    String trendDirection,
    String momentum,
    String volatility,
    BigDecimal score,
    String disclaimer
) {}
