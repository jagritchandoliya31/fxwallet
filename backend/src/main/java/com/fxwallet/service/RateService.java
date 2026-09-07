package com.fxwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.RateResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateHistoryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateService {
    private final CurrencyRepository currencyRepository;
    private final RateHistoryRepository rateHistoryRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final Map<String, BigDecimal> currentRates = new ConcurrentHashMap<>();

    @Value("${app.external.rates-api-url}")
    private String ratesApiUrl;

    public RateService(CurrencyRepository currencyRepository, RateHistoryRepository rateHistoryRepository) {
        this.currencyRepository = currencyRepository;
        this.rateHistoryRepository = rateHistoryRepository;
        this.objectMapper = new ObjectMapper();
        this.restTemplate = new RestTemplate();
    }

    @Scheduled(fixedRate = 300000)
    @Transactional
    public void fetchAndPersistRates() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(ratesApiUrl, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode ratesNode = root.get("rates");
            if (ratesNode == null || ratesNode.isMissingNode()) return;

            List<Currency> currencies = currencyRepository.findByActiveTrue();
            for (Currency currency : currencies) {
                JsonNode rateNode = ratesNode.get(currency.getCode());
                if (rateNode != null && !rateNode.isMissingNode() && rateNode.isNumber() && !rateNode.isNull()) {
                    BigDecimal rate = BigDecimal.valueOf(rateNode.asDouble())
                            .setScale(6, RoundingMode.HALF_UP);
                    currentRates.put(currency.getCode(), rate);
                    persistRate(currency, rate);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch rates: " + e.getMessage());
        }
    }

    @Transactional
    protected void persistRate(Currency currency, BigDecimal rate) {
        RateHistory history = new RateHistory();
        history.setCurrency(currency);
        history.setRate(rate);
        history.setTimestamp(LocalDateTime.now());
        rateHistoryRepository.save(history);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentRate(String code) {
        BigDecimal rate = currentRates.get(code.toUpperCase());
        if (rate != null) return rate;
        Currency currency = currencyRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("Currency not found: " + code));
        List<RateHistory> histories = rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc(code.toUpperCase());
        if (!histories.isEmpty()) {
            return histories.get(histories.size() - 1).getRate();
        }
        return BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public List<RateResponse> getAllRates() {
        List<Currency> currencies = currencyRepository.findByActiveTrue();
        List<RateResponse> responses = new ArrayList<>();
        for (Currency currency : currencies) {
            BigDecimal currentRate = getCurrentRate(currency.getCode());
            BigDecimal previousRate = getPreviousRate(currency.getCode());
            String change = calculateChange(currentRate, previousRate);
            responses.add(new RateResponse(
                    currency.getCode(),
                    currency.getName(),
                    currency.getSymbol(),
                    currentRate,
                    change
            ));
        }
        return responses;
    }

    private BigDecimal getPreviousRate(String code) {
        List<RateHistory> histories = rateHistoryRepository.findByCurrencyCodeAndTimestampBetweenOrderByTimestampAsc(
                code.toUpperCase(), LocalDateTime.now().minusHours(24), LocalDateTime.now());
        if (histories.isEmpty()) {
            return null;
        }
        return histories.get(0).getRate();
    }

    private String calculateChange(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.equals(BigDecimal.ZERO)) return "+0.00%";
        BigDecimal diff = current.subtract(previous);
        BigDecimal pct = diff.divide(previous, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        String sign = pct.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
        return sign + pct.setScale(2, RoundingMode.HALF_UP) + "%";
    }

    @Transactional(readOnly = true)
    public List<com.fxwallet.entity.RateHistory> getRateHistory(String code) {
        return rateHistoryRepository.findByCurrencyCodeOrderByTimestampAsc(code.toUpperCase());
    }

    public void initializeRates() {
        fetchAndPersistRates();
    }
}
