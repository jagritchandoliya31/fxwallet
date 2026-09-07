package com.fxwallet.service;

import com.fxwallet.dto.AdvisorResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.repository.RateHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AdvisorService {
    private final RateHistoryRepository rateHistoryRepository;
    private final CurrencyService currencyService;

    public AdvisorService(RateHistoryRepository rateHistoryRepository, CurrencyService currencyService) {
        this.rateHistoryRepository = rateHistoryRepository;
        this.currencyService = currencyService;
    }

    @Transactional(readOnly = true)
    public AdvisorResponse getAdvisor(String code) {
        Currency currency = currencyService.getByCode(code);
        List<RateHistory> histories = rateHistoryRepository.findByCurrencyCodeAndTimestampBetweenOrderByTimestampAsc(
                code.toUpperCase(), LocalDateTime.now().minusDays(30), LocalDateTime.now());

        BigDecimal currentRate = histories.isEmpty()
                ? BigDecimal.ZERO
                : histories.get(histories.size() - 1).getRate();

        BigDecimal historicalAverage = calculateAverage(histories);
        BigDecimal recentPctChange = calculateRecentChange(histories);
        BigDecimal volatility = calculateVolatility(histories);
        BigDecimal score = calculateScore(currentRate, historicalAverage, recentPctChange, volatility);

        String trend = determineTrend(recentPctChange);
        String momentum = determineMomentum(recentPctChange);
        String volatilityLevel = determineVolatilityLevel(volatility);

        return new AdvisorResponse(
                currency.getCode(),
                currency.getName(),
                currentRate,
                historicalAverage,
                recentPctChange,
                trend,
                momentum,
                volatilityLevel,
                score,
                "Simulation / educational insight — not financial advice."
        );
    }

    private BigDecimal calculateAverage(List<RateHistory> histories) {
        if (histories.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = histories.stream()
                .map(RateHistory::getRate)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(histories.size()), 6, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateRecentChange(List<RateHistory> histories) {
        if (histories.size() < 2) return BigDecimal.ZERO;
        BigDecimal oldest = histories.get(0).getRate();
        BigDecimal latest = histories.get(histories.size() - 1).getRate();
        if (oldest.equals(BigDecimal.ZERO)) return BigDecimal.ZERO;
        return latest.subtract(oldest).divide(oldest, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
    }

    private BigDecimal calculateVolatility(List<RateHistory> histories) {
        if (histories.size() < 2) return BigDecimal.ZERO;
        BigDecimal avg = calculateAverage(histories);
        BigDecimal varianceSum = histories.stream()
                .map(h -> h.getRate().subtract(avg).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal variance = varianceSum.divide(BigDecimal.valueOf(histories.size()), 6, RoundingMode.HALF_UP);
        return new BigDecimal(Math.sqrt(variance.doubleValue())).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateScore(BigDecimal current, BigDecimal avg, BigDecimal change, BigDecimal volatility) {
        if (avg.equals(BigDecimal.ZERO)) return BigDecimal.ZERO;
        BigDecimal score = BigDecimal.ZERO;
        if (change.compareTo(BigDecimal.ZERO) > 0) score = score.add(new BigDecimal("30"));
        else if (change.compareTo(BigDecimal.ZERO) < 0) score = score.subtract(new BigDecimal("30"));

        BigDecimal deviation = current.subtract(avg).abs().divide(avg, 4, RoundingMode.HALF_UP);
        if (deviation.compareTo(new BigDecimal("0.02")) < 0) score = score.add(new BigDecimal("20"));
        else if (deviation.compareTo(new BigDecimal("0.05")) > 0) score = score.subtract(new BigDecimal("20"));

        if (volatility.compareTo(new BigDecimal("0.005")) < 0) score = score.add(new BigDecimal("25"));
        else if (volatility.compareTo(new BigDecimal("0.02")) > 0) score = score.subtract(new BigDecimal("25"));

        score = score.add(new BigDecimal("25"));
        if (score.compareTo(new BigDecimal("100")) > 0) score = new BigDecimal("100");
        if (score.compareTo(BigDecimal.ZERO) < 0) score = BigDecimal.ZERO;
        return score;
    }

    private String determineTrend(BigDecimal change) {
        if (change.compareTo(new BigDecimal("1")) > 0) return "Strongly Positive";
        if (change.compareTo(BigDecimal.ZERO) > 0) return "Positive";
        if (change.compareTo(new BigDecimal("-1")) < 0) return "Strongly Negative";
        if (change.compareTo(BigDecimal.ZERO) < 0) return "Negative";
        return "Neutral";
    }

    private String determineMomentum(BigDecimal change) {
        BigDecimal abs = change.abs();
        if (abs.compareTo(new BigDecimal("2")) > 0) return "Strong";
        if (abs.compareTo(new BigDecimal("0.5")) > 0) return "Moderate";
        return "Weak";
    }

    private String determineVolatilityLevel(BigDecimal volatility) {
        if (volatility.compareTo(new BigDecimal("0.02")) > 0) return "High";
        if (volatility.compareTo(new BigDecimal("0.005")) > 0) return "Medium";
        return "Low";
    }
}
