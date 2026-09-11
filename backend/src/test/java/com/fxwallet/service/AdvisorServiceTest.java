package com.fxwallet.service;

import com.fxwallet.dto.AdvisorResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.exception.ResourceNotFoundException;
import com.fxwallet.repository.RateHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AdvisorServiceTest {

    @Mock
    private RateHistoryRepository rateHistoryRepository;

    @Mock
    private CurrencyService currencyService;

    @InjectMocks
    private AdvisorService advisorService;

    @Test
    public void getAdvisor_shouldReturnNeutralResponseWhenHistoryMissing() {
        Currency currency = new Currency();
        currency.setCode("USD");
        currency.setName("US Dollar");
        when(currencyService.getByCode("USD")).thenReturn(currency);
        when(rateHistoryRepository.findByCurrencyCodeAndTimestampBetweenOrderByTimestampAsc(
                "USD", org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of());

        AdvisorResponse response = advisorService.getAdvisor("USD");

        assertEquals("USD", response.currencyCode());
        assertEquals(BigDecimal.ZERO, response.currentRate());
        assertEquals(BigDecimal.ZERO, response.historicalAverage());
        assertEquals(BigDecimal.ZERO, response.recentPercentageChange());
        assertEquals("Neutral", response.trendDirection());
        assertEquals("Weak", response.momentum());
        assertEquals("Low", response.volatility());
        assertEquals(BigDecimal.ZERO, response.score());
    }

    @Test
    public void getAdvisor_shouldThrowWhenCurrencyNotFound() {
        when(currencyService.getByCode("XYZ")).thenThrow(new ResourceNotFoundException("Currency not found: XYZ"));

        assertThrows(ResourceNotFoundException.class, () -> advisorService.getAdvisor("XYZ"));
    }
}
