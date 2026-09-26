package com.fxwallet.dto;

import java.math.BigDecimal;
import java.util.List;

public record PremiumAdvisorResponse(

        BigDecimal walletBalance,

        BigDecimal investmentAmount,

        String riskLevel,

        int analysisPeriodDays,

        BigDecimal estimatedReturnMinPercentage,

        BigDecimal estimatedReturnMaxPercentage,

        BigDecimal estimatedProfitMin,

        BigDecimal estimatedProfitMax,

        List<CurrencyRecommendation> recommendations,

        String disclaimer

) {

    public record CurrencyRecommendation(

            String currencyCode,

            String currencyName,

            BigDecimal currentRate,

            BigDecimal allocationAmount,

            BigDecimal allocationPercentage,

            BigDecimal historicalReturnPercentage,

            BigDecimal positiveReturnProbability,

            BigDecimal volatility,

            String trend,

            String reasoning

    ) {}
}