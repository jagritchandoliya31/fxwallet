package com.fxwallet.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PortfolioResponse(
    BigDecimal totalPortfolioValue,
    BigDecimal totalInvested,
    BigDecimal currentValue,
    BigDecimal totalProfitLoss,
    BigDecimal profitLossPercentage,
    java.util.List<HoldingResponse> holdings
) {}
