package com.fxwallet.service;

import com.fxwallet.dto.PortfolioResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.User;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PortfolioServiceTest {

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RateService rateService;

    @InjectMocks
    private PortfolioService portfolioService;

    @BeforeEach
    public void setup() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test@example.com", null, List.of()));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    public void getPortfolio_shouldReturnEmptyWhenNoHoldings() {
        when(holdingRepository.findByUserId(1L)).thenReturn(List.of());

        PortfolioResponse response = portfolioService.getPortfolio();

        assertEquals(BigDecimal.ZERO, response.totalPortfolioValue());
        assertEquals(BigDecimal.ZERO, response.totalInvested());
        assertEquals(BigDecimal.ZERO, response.totalProfitLoss());
        assertTrue(response.holdings().isEmpty());
    }

    @Test
    public void getPortfolio_shouldCalculateValues() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");

        Holding holding = new Holding();
        holding.setId(1L);
        holding.setUser(new User());
        holding.setCurrency(currency);
        holding.setQuantity(new BigDecimal("100"));
        holding.setAvgBuyRate(new BigDecimal("80"));

        when(holdingRepository.findByUserId(1L)).thenReturn(List.of(holding));
        when(rateService.getCurrentRate("USD")).thenReturn(new BigDecimal("85"));

        PortfolioResponse response = portfolioService.getPortfolio();

        assertEquals(new BigDecimal("8500.0000"), response.totalPortfolioValue());
        assertEquals(new BigDecimal("8000.0000"), response.totalInvested());
        assertEquals(new BigDecimal("500.0000"), response.totalProfitLoss());
    }
}