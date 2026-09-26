package com.fxwallet.service;

import com.fxwallet.dto.PremiumAdvisorResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateHistoryRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PremiumAdvisorService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final CurrencyRepository currencyRepository;
    private final RateHistoryRepository rateHistoryRepository;
    private final HistoricalRateService historicalRateService;

    public PremiumAdvisorService(
            UserRepository userRepository,
            WalletRepository walletRepository,
            CurrencyRepository currencyRepository,
            RateHistoryRepository rateHistoryRepository,
            HistoricalRateService historicalRateService) {

        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.currencyRepository = currencyRepository;
        this.rateHistoryRepository = rateHistoryRepository;
        this.historicalRateService = historicalRateService;
    }

    @Transactional(readOnly = true)
    public PremiumAdvisorResponse analyze(
            BigDecimal investmentAmount,
            String riskLevel,
            int analysisPeriodDays) {

        User user = getCurrentUser();

        if (user.getUserType() != User.UserType.PREMIUM) {
            throw new IllegalArgumentException(
                    "Premium subscription required to use AI Currency Advisor"
            );
        }

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Wallet not found"));

        if (investmentAmount == null
                || investmentAmount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "Investment amount must be greater than zero"
            );
        }

        if (wallet.getBalance() == null
                || investmentAmount.compareTo(wallet.getBalance()) > 0) {

            throw new IllegalArgumentException(
                    "Investment amount cannot exceed wallet balance"
            );
        }

        /*
         * Allow analysis periods up to 10 years.
         */
        int periodDays = analysisPeriodDays <= 0
                ? 30
                : Math.min(3650, analysisPeriodDays);

        String normalizedRisk =
                normalizeRiskLevel(riskLevel);

        LocalDate toDate =
                LocalDate.now();

        LocalDate fromDate =
                toDate.minusDays(periodDays);

        List<Currency> currencies =
                currencyRepository.findByActiveTrue();

        /*
         * First try external historical market data.
         */
        Map<String, Map<LocalDate, BigDecimal>> externalHistory;

        try {

            externalHistory =
                    historicalRateService.fetchHistoricalRates(
                            currencies,
                            fromDate,
                            toDate
                    );

        } catch (Exception e) {

            externalHistory =
                    new java.util.HashMap<>();

            System.err.println(
                    "Historical FX API unavailable: "
                            + e.getMessage()
            );
        }

        List<CurrencyAnalysis> analyses =
                new ArrayList<>();

        /*
         * Analyze every active currency.
         */
        for (Currency currency : currencies) {

            String currencyCode =
                    currency.getCode()
                            .toUpperCase()
                            .trim();

            /*
             * Prefer external historical data.
             */
            Map<LocalDate, BigDecimal> dailyRates =
                    externalHistory.get(currencyCode);

            if (dailyRates != null
                    && dailyRates.size() >= 3) {

                CurrencyAnalysis analysis =
                        analyzeCurrency(
                                currency,
                                dailyRates
                        );

                if (analysis != null) {
                    analyses.add(analysis);
                }

                continue;
            }

            /*
             * Fallback to local RateHistory.
             */
            LocalDateTime from =
                    fromDate.atStartOfDay();

            LocalDateTime to =
                    toDate.plusDays(1)
                            .atStartOfDay();

            List<RateHistory> localHistory =
                    rateHistoryRepository
                            .findByCurrencyCodeAndTimestampBetweenOrderByTimestampAsc(
                                    currencyCode,
                                    from,
                                    to
                            );

            CurrencyAnalysis analysis =
                    analyzeCurrencyFromLocalHistory(
                            currency,
                            localHistory
                    );

            if (analysis != null) {
                analyses.add(analysis);
            }
        }

        if (analyses.isEmpty()) {

            throw new IllegalArgumentException(
                    "Not enough historical rate data available"
            );
        }

        /*
         * Select number of recommendations according to risk.
         */
        int recommendationCount =
                getRecommendationCount(
                        normalizedRisk,
                        analyses.size()
                );

        /*
         * Highest score first.
         */
        analyses.sort(
                Comparator.comparing(
                        CurrencyAnalysis::score
                ).reversed()
        );

        List<CurrencyAnalysis> selected =
                analyses.stream()
                        .limit(recommendationCount)
                        .toList();

        /*
         * Build currency recommendations.
         */
        List<PremiumAdvisorResponse.CurrencyRecommendation>
                recommendations =
                buildRecommendations(
                        selected,
                        investmentAmount
                );

        /*
         * Calculate overall historical performance.
         */
        BigDecimal averageHistoricalReturn =
                calculateAverageHistoricalReturn(
                        selected
                );

        /*
         * Average daily volatility.
         */
        BigDecimal averageVolatility =
                calculateAverageVolatility(
                        selected
                );

        /*
         * Estimated historical return range.
         */
        BigDecimal estimatedReturnMin =
                averageHistoricalReturn
                        .subtract(averageVolatility)
                        .max(new BigDecimal("-20.00"))
                        .min(new BigDecimal("20.00"));

        BigDecimal estimatedReturnMax =
                averageHistoricalReturn
                        .add(averageVolatility)
                        .max(new BigDecimal("-20.00"))
                        .min(new BigDecimal("20.00"));

        /*
         * IMPORTANT:
         * Always make sure min <= max.
         */
        BigDecimal lowerReturn =
                estimatedReturnMin.min(
                        estimatedReturnMax
                );

        BigDecimal upperReturn =
                estimatedReturnMin.max(
                        estimatedReturnMax
                );

        estimatedReturnMin =
                lowerReturn;

        estimatedReturnMax =
                upperReturn;

        /*
         * Calculate estimated monetary result.
         */
        BigDecimal estimatedProfitMin =
                investmentAmount
                        .multiply(estimatedReturnMin)
                        .divide(
                                new BigDecimal("100"),
                                2,
                                RoundingMode.HALF_UP
                        );

        BigDecimal estimatedProfitMax =
                investmentAmount
                        .multiply(estimatedReturnMax)
                        .divide(
                                new BigDecimal("100"),
                                2,
                                RoundingMode.HALF_UP
                        );

        return new PremiumAdvisorResponse(
                wallet.getBalance(),
                investmentAmount,
                normalizedRisk,
                periodDays,

                estimatedReturnMin.setScale(
                        4,
                        RoundingMode.HALF_UP
                ),

                estimatedReturnMax.setScale(
                        4,
                        RoundingMode.HALF_UP
                ),

                estimatedProfitMin,
                estimatedProfitMax,

                recommendations,

                "Historical simulation based on daily currency data. "
                        + "External historical market data is preferred "
                        + "when available. Results are not a guarantee "
                        + "of future returns and are not financial advice."
        );
    }

    /*
     * Analyze external historical data.
     */
    private CurrencyAnalysis analyzeCurrency(
            Currency currency,
            Map<LocalDate, BigDecimal> dailyRates) {

        if (dailyRates == null
                || dailyRates.size() < 3) {

            return null;
        }

        List<Map.Entry<LocalDate, BigDecimal>> entries =
                new ArrayList<>(
                        dailyRates.entrySet()
                );

        /*
         * Make sure dates are chronological.
         */
        entries.sort(
                Map.Entry.comparingByKey()
        );

        List<BigDecimal> rates =
                entries.stream()
                        .map(Map.Entry::getValue)
                        .filter(rate ->
                                rate != null
                                        && rate.compareTo(
                                                BigDecimal.ZERO
                                        ) > 0
                        )
                        .toList();

        if (rates.size() < 3) {
            return null;
        }

        BigDecimal firstRate =
                rates.get(0);

        BigDecimal latestRate =
                rates.get(
                        rates.size() - 1
                );

        /*
         * Total historical percentage return.
         */
        BigDecimal historicalReturn =
                latestRate
                        .subtract(firstRate)
                        .divide(
                                firstRate,
                                8,
                                RoundingMode.HALF_UP
                        )
                        .multiply(
                                new BigDecimal("100")
                        );

        /*
         * Daily percentage returns.
         */
        List<BigDecimal> dailyReturns =
                calculateDailyReturns(
                        rates
                );

        /*
         * Percentage of positive days.
         */
        BigDecimal positiveFrequency =
                calculatePositiveReturnFrequency(
                        dailyReturns
                );

        /*
         * Standard deviation of daily returns.
         */
        BigDecimal volatility =
                calculateVolatility(
                        dailyReturns
                );

        String trend =
                determineTrend(
                        historicalReturn
                );

        BigDecimal score =
                calculateRecommendationScore(
                        historicalReturn,
                        positiveFrequency,
                        volatility,
                        trend,
                        rates.size()
                );

        String reasoning =
                buildReasoning(
                        historicalReturn,
                        positiveFrequency,
                        volatility,
                        trend,
                        rates.size()
                );

        return new CurrencyAnalysis(
                currency,
                latestRate,
                historicalReturn,
                positiveFrequency,
                volatility,
                trend,
                score,
                reasoning,
                rates.size()
        );
    }

    /*
     * Analyze locally stored historical data.
     */
    private CurrencyAnalysis analyzeCurrencyFromLocalHistory(
            Currency currency,
            List<RateHistory> history) {

        if (history == null
                || history.isEmpty()) {

            return null;
        }

        Map<LocalDate, BigDecimal> dailyRates =
                new LinkedHashMap<>();

        for (RateHistory item : history) {

            if (item.getTimestamp() == null
                    || item.getRate() == null
                    || item.getRate().compareTo(
                            BigDecimal.ZERO
                    ) <= 0) {

                continue;
            }

            LocalDate date =
                    item.getTimestamp()
                            .toLocalDate();

            /*
             * Keep the last rate recorded for each day.
             */
            dailyRates.put(
                    date,
                    item.getRate()
            );
        }

        return analyzeCurrency(
                currency,
                dailyRates
        );
    }

    /*
     * Calculate daily percentage returns.
     */
    private List<BigDecimal> calculateDailyReturns(
            List<BigDecimal> rates) {

        List<BigDecimal> returns =
                new ArrayList<>();

        for (int i = 1;
             i < rates.size();
             i++) {

            BigDecimal previous =
                    rates.get(i - 1);

            BigDecimal current =
                    rates.get(i);

            if (previous == null
                    || current == null
                    || previous.compareTo(
                            BigDecimal.ZERO
                    ) <= 0) {

                continue;
            }

            BigDecimal change =
                    current
                            .subtract(previous)
                            .divide(
                                    previous,
                                    8,
                                    RoundingMode.HALF_UP
                            )
                            .multiply(
                                    new BigDecimal("100")
                            );

            returns.add(change);
        }

        return returns;
    }

    /*
     * Percentage of days where currency increased.
     */
    private BigDecimal calculatePositiveReturnFrequency(
            List<BigDecimal> returns) {

        if (returns.isEmpty()) {
            return BigDecimal.ZERO;
        }

        long positiveCount =
                returns.stream()
                        .filter(value ->
                                value.compareTo(
                                        BigDecimal.ZERO
                                ) > 0
                        )
                        .count();

        return BigDecimal.valueOf(
                        positiveCount
                )
                .multiply(
                        new BigDecimal("100")
                )
                .divide(
                        BigDecimal.valueOf(
                                returns.size()
                        ),
                        4,
                        RoundingMode.HALF_UP
                );
    }

    /*
     * Standard deviation of daily percentage returns.
     */
    private BigDecimal calculateVolatility(
            List<BigDecimal> returns) {

        if (returns.size() < 2) {
            return BigDecimal.ZERO;
        }

        BigDecimal mean =
                returns.stream()
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        )
                        .divide(
                                BigDecimal.valueOf(
                                        returns.size()
                                ),
                                10,
                                RoundingMode.HALF_UP
                        );

        BigDecimal squaredSum =
                BigDecimal.ZERO;

        for (BigDecimal value : returns) {

            BigDecimal difference =
                    value.subtract(mean);

            squaredSum =
                    squaredSum.add(
                            difference.multiply(
                                    difference
                            )
                    );
        }

        BigDecimal variance =
                squaredSum.divide(
                        BigDecimal.valueOf(
                                returns.size()
                        ),
                        10,
                        RoundingMode.HALF_UP
                );

        return BigDecimal.valueOf(
                Math.sqrt(
                        variance.doubleValue()
                )
        ).setScale(
                6,
                RoundingMode.HALF_UP
        );
    }

    /*
     * Determine historical trend.
     */
    private String determineTrend(
            BigDecimal historicalReturn) {

        if (historicalReturn.compareTo(
                new BigDecimal("0.05")
        ) > 0) {

            return "Positive";
        }

        if (historicalReturn.compareTo(
                new BigDecimal("-0.05")
        ) < 0) {

            return "Negative";
        }

        return "Stable";
    }

    /*
     * Recommendation score.
     */
    private BigDecimal calculateRecommendationScore(
            BigDecimal historicalReturn,
            BigDecimal positiveFrequency,
            BigDecimal volatility,
            String trend,
            int observationDays) {

        double confidenceValue =
                Math.min(
                        observationDays / 10.0,
                        1.0
                );

        BigDecimal confidence =
                BigDecimal.valueOf(
                        confidenceValue
                );

        BigDecimal cappedReturn =
                historicalReturn
                        .max(
                                new BigDecimal("-5.00")
                        )
                        .min(
                                new BigDecimal("5.00")
                        );

        BigDecimal returnContribution =
                cappedReturn
                        .multiply(
                                new BigDecimal("1.50")
                        )
                        .multiply(
                                confidence
                        );

        BigDecimal frequencyContribution =
                positiveFrequency
                        .divide(
                                new BigDecimal("10"),
                                6,
                                RoundingMode.HALF_UP
                        )
                        .multiply(
                                confidence
                        );

        BigDecimal volatilityPenalty =
                volatility
                        .min(
                                new BigDecimal("2.00")
                        )
                        .multiply(
                                new BigDecimal("2.00")
                        );

        BigDecimal trendContribution =
                BigDecimal.ZERO;

        if ("Positive".equals(trend)) {

            trendContribution =
                    new BigDecimal("2.00")
                            .multiply(
                                    confidence
                            );

        } else if ("Negative".equals(trend)) {

            trendContribution =
                    new BigDecimal("-2.00")
                            .multiply(
                                    confidence
                            );
        }

        return new BigDecimal("10.00")
                .add(returnContribution)
                .add(frequencyContribution)
                .add(trendContribution)
                .subtract(volatilityPenalty)
                .max(BigDecimal.ONE);
    }

    /*
     * Explain why currency was selected.
     */
    private String buildReasoning(
            BigDecimal historicalReturn,
            BigDecimal positiveFrequency,
            BigDecimal volatility,
            String trend,
            int observationDays) {

        return String.format(
                "Based on %d daily observations: historical return %s%%, "
                        + "positive-return frequency %s%%, volatility %s%%, "
                        + "and trend %s.",
                observationDays,

                historicalReturn.setScale(
                        4,
                        RoundingMode.HALF_UP
                ),

                positiveFrequency.setScale(
                        2,
                        RoundingMode.HALF_UP
                ),

                volatility.setScale(
                        4,
                        RoundingMode.HALF_UP
                ),

                trend
        );
    }

    /*
     * Build investment allocation recommendations.
     */
    private List<PremiumAdvisorResponse.CurrencyRecommendation>
    buildRecommendations(
            List<CurrencyAnalysis> selected,
            BigDecimal investmentAmount) {

        List<PremiumAdvisorResponse.CurrencyRecommendation>
                recommendations =
                new ArrayList<>();

        if (selected.isEmpty()) {
            return recommendations;
        }

        BigDecimal totalScore =
                selected.stream()
                        .map(CurrencyAnalysis::score)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        boolean equalAllocation =
                totalScore.compareTo(
                        BigDecimal.ZERO
                ) == 0;

        BigDecimal equalPercentage =
                BigDecimal.valueOf(100)
                        .divide(
                                BigDecimal.valueOf(
                                        selected.size()
                                ),
                                6,
                                RoundingMode.HALF_UP
                        );

        BigDecimal totalAllocated =
                BigDecimal.ZERO;

        for (int i = 0;
             i < selected.size();
             i++) {

            CurrencyAnalysis analysis =
                    selected.get(i);

            BigDecimal allocationPercentage;

            if (equalAllocation) {

                allocationPercentage =
                        equalPercentage;

            } else {

                allocationPercentage =
                        analysis.score()
                                .divide(
                                        totalScore,
                                        8,
                                        RoundingMode.HALF_UP
                                )
                                .multiply(
                                        new BigDecimal("100")
                                );
            }

            BigDecimal allocationAmount =
                    investmentAmount
                            .multiply(
                                    allocationPercentage
                            )
                            .divide(
                                    new BigDecimal("100"),
                                    2,
                                    RoundingMode.HALF_UP
                            );

            /*
             * Make sure total allocation equals
             * investment amount exactly.
             */
            if (i == selected.size() - 1) {

                allocationAmount =
                        investmentAmount
                                .subtract(
                                        totalAllocated
                                );

                allocationPercentage =
                        allocationAmount
                                .multiply(
                                        new BigDecimal("100")
                                )
                                .divide(
                                        investmentAmount,
                                        6,
                                        RoundingMode.HALF_UP
                                );
            }

            totalAllocated =
                    totalAllocated.add(
                            allocationAmount
                    );

            recommendations.add(
                    new PremiumAdvisorResponse
                            .CurrencyRecommendation(

                            analysis.currency()
                                    .getCode(),

                            analysis.currency()
                                    .getName(),

                            analysis.currentRate(),

                            allocationAmount,

                            allocationPercentage.setScale(
                                    2,
                                    RoundingMode.HALF_UP
                            ),

                            analysis.historicalReturn()
                                    .setScale(
                                            6,
                                            RoundingMode.HALF_UP
                                    ),

                            analysis.positiveFrequency()
                                    .setScale(
                                            2,
                                            RoundingMode.HALF_UP
                                    ),

                            analysis.volatility()
                                    .setScale(
                                            4,
                                            RoundingMode.HALF_UP
                                    ),

                            analysis.trend(),

                            analysis.reasoning()
                    )
            );
        }

        return recommendations;
    }

    /*
     * Average historical return across selected currencies.
     */
    private BigDecimal calculateAverageHistoricalReturn(
            List<CurrencyAnalysis> selected) {

        if (selected.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return selected.stream()
                .map(
                        CurrencyAnalysis::historicalReturn
                )
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                )
                .divide(
                        BigDecimal.valueOf(
                                selected.size()
                        ),
                        8,
                        RoundingMode.HALF_UP
                );
    }

    /*
     * Average volatility across selected currencies.
     */
    private BigDecimal calculateAverageVolatility(
            List<CurrencyAnalysis> selected) {

        if (selected.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return selected.stream()
                .map(
                        CurrencyAnalysis::volatility
                )
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                )
                .divide(
                        BigDecimal.valueOf(
                                selected.size()
                        ),
                        8,
                        RoundingMode.HALF_UP
                );
    }

    /*
     * Number of recommendations based on risk.
     */
    private int getRecommendationCount(
            String riskLevel,
            int availableCurrencies) {

        int requested;

        switch (riskLevel) {

            case "LOW":
                requested = 3;
                break;

            case "HIGH":
                requested = 6;
                break;

            default:
                requested = 5;
                break;
        }

        return Math.min(
                requested,
                availableCurrencies
        );
    }

    /*
     * Normalize risk level.
     */
    private String normalizeRiskLevel(
            String riskLevel) {

        if (riskLevel == null
                || riskLevel.isBlank()) {

            return "MEDIUM";
        }

        String value =
                riskLevel
                        .trim()
                        .toUpperCase();

        if ("LOW".equals(value)
                || "MEDIUM".equals(value)
                || "HIGH".equals(value)) {

            return value;
        }

        return "MEDIUM";
    }

    /*
     * Get authenticated user.
     */
    private User getCurrentUser() {

        String email =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found"
                        ));
    }

    /*
     * Internal analysis model.
     */
    private record CurrencyAnalysis(
            Currency currency,
            BigDecimal currentRate,
            BigDecimal historicalReturn,
            BigDecimal positiveFrequency,
            BigDecimal volatility,
            String trend,
            BigDecimal score,
            String reasoning,
            int observationDays
    ) {
    }
}