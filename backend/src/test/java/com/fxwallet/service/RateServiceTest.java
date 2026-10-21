
package com.fxwallet.service;

import com.fxwallet.dto.RateResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateServiceTest {

    @Mock
    private CurrencyRepository currencyRepository;

    @Mock
    private RateHistoryRepository rateHistoryRepository;

    @Mock
    private RestTemplateBuilder restTemplateBuilder;

    @Mock
    private RestTemplate restTemplate;

    private RateService rateService;

    @BeforeEach
    void setUp() {
        when(restTemplateBuilder
                .setConnectTimeout(any(Duration.class)))
                .thenReturn(restTemplateBuilder);

        when(restTemplateBuilder
                .setReadTimeout(any(Duration.class)))
                .thenReturn(restTemplateBuilder);

        when(restTemplateBuilder.build())
                .thenReturn(restTemplate);

        rateService = new RateService(
                currencyRepository,
                rateHistoryRepository,
                restTemplateBuilder
        );
    }

    @Test
    void getCurrentRate_shouldReturnLatestHistoryRateWhenCacheEmpty() {
        Currency eur = new Currency();
        eur.setCode("EUR");
        eur.setName("Euro");
        eur.setSymbol("€");

        RateHistory history = new RateHistory();
        history.setCurrency(eur);
        history.setRate(new BigDecimal("91.50"));
        history.setTimestamp(LocalDateTime.now());

        when(currencyRepository.findByCode("EUR"))
                .thenReturn(Optional.of(eur));

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc("EUR"))
                .thenReturn(List.of(history));

        BigDecimal result = rateService.getCurrentRate("EUR");

        assertNotNull(result);
        assertEquals(new BigDecimal("91.50"), result);
    }

    @Test
    void getCurrentRate_shouldReturnNullWhenNoRateExists() {
        Currency eur = new Currency();
        eur.setCode("EUR");
        eur.setName("Euro");
        eur.setSymbol("€");

        when(currencyRepository.findByCode("EUR"))
                .thenReturn(Optional.of(eur));

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc("EUR"))
                .thenReturn(List.of());

        BigDecimal result = rateService.getCurrentRate("EUR");

        assertNull(result);
    }

    @Test
    void getCurrentRate_shouldThrowWhenCurrencyDoesNotExist() {
        when(currencyRepository.findByCode("XYZ"))
                .thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> rateService.getCurrentRate("XYZ")
        );
    }

    @Test
    void getPreviousRate_shouldReturnRateFromPreviousCalendarDay() {
        Currency eur = new Currency();
        eur.setCode("EUR");

        LocalDate today = LocalDate.now();

        RateHistory todayHistory = new RateHistory();
        todayHistory.setCurrency(eur);
        todayHistory.setRate(new BigDecimal("92.00"));
        todayHistory.setTimestamp(
                today.atTime(10, 0)
        );

        RateHistory previousHistory = new RateHistory();
        previousHistory.setCurrency(eur);
        previousHistory.setRate(new BigDecimal("91.00"));
        previousHistory.setTimestamp(
                today.minusDays(1).atTime(10, 0)
        );

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampDesc("EUR"))
                .thenReturn(List.of(todayHistory, previousHistory));

        BigDecimal result = rateService.getPreviousRate("EUR");

        assertNotNull(result);
        assertEquals(new BigDecimal("91.00"), result);
    }

    @Test
    void getPreviousRate_shouldReturnNullWhenNoPreviousDayRateExists() {
        Currency eur = new Currency();
        eur.setCode("EUR");

        RateHistory todayHistory = new RateHistory();
        todayHistory.setCurrency(eur);
        todayHistory.setRate(new BigDecimal("92.00"));
        todayHistory.setTimestamp(
                LocalDateTime.now()
        );

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampDesc("EUR"))
                .thenReturn(List.of(todayHistory));

        BigDecimal result = rateService.getPreviousRate("EUR");

        assertNull(result);
    }

    @Test
    void getPreviousRate_shouldIgnoreInvalidHistory() {
        Currency eur = new Currency();
        eur.setCode("EUR");

        RateHistory invalidHistory = new RateHistory();
        invalidHistory.setCurrency(eur);
        invalidHistory.setRate(null);
        invalidHistory.setTimestamp(
                LocalDate.now().minusDays(1).atTime(10, 0)
        );

        RateHistory validHistory = new RateHistory();
        validHistory.setCurrency(eur);
        validHistory.setRate(new BigDecimal("91.25"));
        validHistory.setTimestamp(
                LocalDate.now().minusDays(2).atTime(10, 0)
        );

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampDesc("EUR"))
                .thenReturn(List.of(invalidHistory, validHistory));

        BigDecimal result = rateService.getPreviousRate("EUR");

        assertNotNull(result);
        assertEquals(new BigDecimal("91.25"), result);
    }

    @Test
    void getAllRates_shouldReturnActiveCurrenciesWithValidRates() {
        Currency eur = new Currency();
        eur.setCode("EUR");
        eur.setName("Euro");
        eur.setSymbol("€");

        Currency usd = new Currency();
        usd.setCode("USD");
        usd.setName("US Dollar");
        usd.setSymbol("$");

        RateHistory eurHistory = new RateHistory();
        eurHistory.setCurrency(eur);
        eurHistory.setRate(new BigDecimal("92.00"));
        eurHistory.setTimestamp(LocalDateTime.now());

        RateHistory eurPrevious = new RateHistory();
        eurPrevious.setCurrency(eur);
        eurPrevious.setRate(new BigDecimal("91.00"));
        eurPrevious.setTimestamp(
                LocalDate.now().minusDays(1).atTime(10, 0)
        );

        when(currencyRepository.findByActiveTrue())
                .thenReturn(List.of(eur, usd));

        when(currencyRepository.findByCode("EUR"))
                .thenReturn(Optional.of(eur));

        when(currencyRepository.findByCode("USD"))
                .thenReturn(Optional.of(usd));

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc("EUR"))
                .thenReturn(List.of(eurHistory));

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampDesc("EUR"))
                .thenReturn(List.of(eurHistory, eurPrevious));

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc("USD"))
                .thenReturn(List.of());

        List<RateResponse> result = rateService.getAllRates();

        assertNotNull(result);
        assertEquals(1, result.size());

        RateResponse response = result.get(0);

        assertEquals("EUR", response.code());
        assertEquals(new BigDecimal("92.00"), response.rate());
        assertNotNull(response.change());
    }

    @Test
    void getRateHistory_shouldReturnHistoryOrderedAscending() {
        RateHistory first = new RateHistory();
        first.setRate(new BigDecimal("90.00"));
        first.setTimestamp(
                LocalDate.now().minusDays(2).atTime(10, 0)
        );

        RateHistory second = new RateHistory();
        second.setRate(new BigDecimal("91.00"));
        second.setTimestamp(
                LocalDate.now().minusDays(1).atTime(10, 0)
        );

        when(rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc("EUR"))
                .thenReturn(List.of(first, second));

        List<RateHistory> result =
                rateService.getRateHistory("EUR");

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(
                new BigDecimal("90.00"),
                result.get(0).getRate()
        );
        assertEquals(
                new BigDecimal("91.00"),
                result.get(1).getRate()
        );
    }
}