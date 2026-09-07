package com.fxwallet.dto;

import java.math.BigDecimal;

public record AlertResponse(
    Long id,
    String currencyCode,
    String currencyName,
    BigDecimal targetRate,
    boolean triggered
) {}
