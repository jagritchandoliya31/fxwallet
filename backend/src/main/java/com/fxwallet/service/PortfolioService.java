package com.fxwallet.service;

import com.fxwallet.dto.HoldingResponse;
import com.fxwallet.dto.PortfolioResponse;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.User;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.util.BigDecimalUtil;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PortfolioService {
    private final HoldingRepository holdingRepository;
    private final UserRepository userRepository;
    private final RateService rateService;

    public PortfolioService(HoldingRepository holdingRepository, UserRepository userRepository, RateService rateService) {
        this.holdingRepository = holdingRepository;
        this.userRepository = userRepository;
        this.rateService = rateService;
    }

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolio() {
        User user = getCurrentUser();
        List<Holding> holdings = holdingRepository.findByUserId(user.getId());
        List<HoldingResponse> holdingResponses = holdings.stream()
                .filter(h -> h.getQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(this::toHoldingResponse)
                .collect(Collectors.toList());

        boolean valuationsAvailable = holdingResponses.stream()
                .allMatch(h -> h.currentValue() != null);
        BigDecimal totalPortfolioValue = valuationsAvailable
                ? holdingResponses.stream()
                .map(HoldingResponse::currentValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                : null;
        BigDecimal totalInvested = holdingResponses.stream()
                .map(HoldingResponse::investedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPl = valuationsAvailable
                ? holdingResponses.stream()
                .map(HoldingResponse::profitLoss)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                : null;
        BigDecimal plPct = valuationsAvailable && totalInvested.compareTo(BigDecimal.ZERO) > 0 && totalPl != null
                ? totalPl.divide(totalInvested, 4, java.math.RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"))
                : null;

        return new PortfolioResponse(
                totalPortfolioValue,
                totalInvested,
                totalPl,
                plPct,
                holdingResponses
        );
    }

    private HoldingResponse toHoldingResponse(Holding holding) {
        BigDecimal currentRate = rateService.getCurrentRate(holding.getCurrency().getCode());
        BigDecimal quantity = holding.getQuantity();
        BigDecimal avgBuyRate = BigDecimalUtil.scale(holding.getAvgBuyRate());
        BigDecimal investedAmount = BigDecimalUtil.scale(avgBuyRate.multiply(quantity));

        if (currentRate == null || currentRate.compareTo(BigDecimal.ZERO) <= 0) {
            return new HoldingResponse(
                    holding.getCurrency().getCode(),
                    holding.getCurrency().getName(),
                    holding.getCurrency().getSymbol(),
                    quantity,
                    avgBuyRate,
                    null,
                    investedAmount,
                    null,
                    null,
                    null
            );
        }

        currentRate = BigDecimalUtil.scale(currentRate);
        BigDecimal currentValue = BigDecimalUtil.scale(currentRate.multiply(quantity));
        BigDecimal profitLoss = currentValue.subtract(investedAmount);
        BigDecimal plPct = investedAmount.compareTo(BigDecimal.ZERO) > 0
                ? profitLoss.divide(investedAmount, 4, java.math.RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;

        return new HoldingResponse(
                holding.getCurrency().getCode(),
                holding.getCurrency().getName(),
                holding.getCurrency().getSymbol(),
                quantity,
                avgBuyRate,
                currentRate,
                investedAmount,
                currentValue,
                profitLoss,
                plPct
        );
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("User not found"));
    }
}
