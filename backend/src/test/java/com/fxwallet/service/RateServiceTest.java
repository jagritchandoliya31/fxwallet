package com.fxwallet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.RateResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RateServiceTest {

    @Mock
    private CurrencyRepository currencyRepository;

    @Mock
    private RateHistoryRepository rateHistoryRepository;

    @InjectMocks
    private RateService rateService;

    @BeforeEach
    public void setup() {
        ReflectionTestUtils.setField(rateService, "ratesApiUrl", "http://localhost:9999/test-rates");
        ReflectionTestUtils.setField(rateService, "restTemplate", new RestTemplate());
        ReflectionTestUtils.setField(rateService, "objectMapper", new ObjectMapper());
    }

    @Test
    public void getCurrentRate_shouldReturnCachedRate() {
        Currency currency = new Currency();
        currency.setCode("USD");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        java.util.Map<String, BigDecimal> currentRates =
                (java.util.Map<String, BigDecimal>) ReflectionTestUtils.getField(rateService, "currentRates");
        currentRates.put("USD", new BigDecimal("85.500000"));

        BigDecimal rate = rateService.getCurrentRate("USD");

        assertEquals(new BigDecimal("85.500000"), rate);
    }

    @Test
    public void getCurrentRate_shouldReturnLatestHistoryWhenCacheEmpty() {
        Currency currency = new Currency();
        currency.setCode("USD");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        RateHistory oldRate = new RateHistory();
        oldRate.setRate(new BigDecimal("80.000000"));
        oldRate.setTimestamp(LocalDateTime.now().minusHours(2));
        RateHistory latestRate = new RateHistory();
        latestRate.setRate(new BigDecimal("85.000000"));
        latestRate.setTimestamp(LocalDateTime.now());
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc("USD"))
                .thenReturn(List.of(oldRate, latestRate));

        BigDecimal rate = rateService.getCurrentRate("USD");

        assertEquals(new BigDecimal("85.000000"), rate);
    }

    @Test
    public void getCurrentRate_shouldReturnNullWhenNoRateExists() {
        Currency currency = new Currency();
        currency.setCode("USD");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc("USD")).thenReturn(List.of());

        BigDecimal rate = rateService.getCurrentRate("USD");

        assertNull(rate);
    }

    @Test
    public void getPreviousRate_shouldReturnImmediatelyPreviousRecordedRate() {
        Currency currency = new Currency();
        currency.setCode("USD");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        RateHistory oldest = new RateHistory();
        oldest.setRate(new BigDecimal("78.000000"));
        oldest.setTimestamp(LocalDateTime.now().minusHours(4));
        RateHistory previous = new RateHistory();
        previous.setRate(new BigDecimal("82.000000"));
        previous.setTimestamp(LocalDateTime.now().minusHours(2));
        RateHistory latest = new RateHistory();
        latest.setRate(new BigDecimal("85.000000"));
        latest.setTimestamp(LocalDateTime.now());
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampDesc("USD"))
                .thenReturn(List.of(latest, previous, oldest));

        BigDecimal previousRate = rateService.getPreviousRate("USD");

        assertEquals(new BigDecimal("82.000000"), previousRate);
    }

    @Test
    public void getAllRates_shouldSkipCurrenciesWithUnavailableRates() {
        Currency usd = new Currency();
        usd.setCode("USD");
        usd.setName("US Dollar");
        usd.setSymbol("$");
        Currency eur = new Currency();
        eur.setCode("EUR");
        eur.setName("Euro");
        eur.setSymbol("€");
        when(currencyRepository.findByActiveTrue()).thenReturn(List.of(usd, eur));
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(usd));
        when(currencyRepository.findByCode("EUR")).thenReturn(Optional.of(eur));

        RateHistory usdHistory = new RateHistory();
        usdHistory.setRate(new BigDecimal("85.000000"));
        usdHistory.setTimestamp(LocalDateTime.now());
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc("USD")).thenReturn(List.of(usdHistory));
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampDesc("USD")).thenReturn(List.of(usdHistory));
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc("EUR")).thenReturn(List.of());
        when(rateHistoryRepository.findByCurrencyCodeOrderByTimestampDesc("EUR")).thenReturn(List.of());

        List<RateResponse> responses = rateService.getAllRates();

        assertEquals(1, responses.size());
        assertEquals("USD", responses.get(0).code());
        assertEquals(new BigDecimal("85.000000"), responses.get(0).rate());
    }
}
