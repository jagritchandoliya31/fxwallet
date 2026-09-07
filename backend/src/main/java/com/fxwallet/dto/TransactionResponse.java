package com.fxwallet.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
    Long id,
    String currencyCode,
    String currencyName,
    String type,
    BigDecimal inrAmount,
    BigDecimal quantity,
    BigDecimal exchangeRate,
    BigDecimal realizedPl,
    LocalDateTime timestamp
) {}
