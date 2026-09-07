package com.fxwallet.dto;

import java.math.BigDecimal;

public record HoldingResponse(
    String code,
    String name,
    String symbol,
    BigDecimal quantity,
    BigDecimal avgBuyRate,
    BigDecimal currentRate,
    BigDecimal investedAmount,
    BigDecimal currentValue,
    BigDecimal profitLoss,
    BigDecimal profitLossPercentage
) {}
