package com.fxwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.RateResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateHistory;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import java.time.Duration;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateService {
    private static final Logger log = LoggerFactory.getLogger(RateService.class);

    private final CurrencyRepository currencyRepository;
    private final RateHistoryRepository rateHistoryRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    private final Map<String, BigDecimal> currentRates =
            new ConcurrentHashMap<>();

    @Value("${app.external.rates-api-url}")
    private String ratesApiUrl;

    public RateService(
            CurrencyRepository currencyRepository,
            RateHistoryRepository rateHistoryRepository,
            RestTemplateBuilder restTemplateBuilder) {

        this.currencyRepository = currencyRepository;
        this.rateHistoryRepository = rateHistoryRepository;
        this.objectMapper = new ObjectMapper();
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }

    /*
     * Fetch rates every 5 minutes.
     *
     * The external free API may provide the same rate
     * for multiple fetches during the same day.
     *
     * We still store the snapshots so RateHistory can
     * be used for historical analysis.
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void fetchAndPersistRates() {

        try {

            log.info(
                    "=== FXWallet: Fetching exchange rates ==="
            );

            System.out.println(
                    "Rates API URL: " + ratesApiUrl
            );

            HttpHeaders headers = new HttpHeaders();

            headers.setAccept(
                    List.of(MediaType.APPLICATION_JSON)
            );

            HttpEntity<String> entity =
                    new HttpEntity<>(headers);

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            ratesApiUrl,
                            HttpMethod.GET,
                            entity,
                            String.class
                    );

            System.out.println(
                    "Rates API status: "
                            + response.getStatusCode()
            );

            String body = response.getBody();

            if (body == null || body.isBlank()) {

                log.warn(
                        "Rates API returned an empty response."
                );

                return;
            }

            JsonNode root =
                    objectMapper.readTree(body);

            JsonNode ratesNode =
                    root.get("rates");

            if (ratesNode == null
                    || !ratesNode.isObject()) {

                System.err.println(
                        "Rates API response does not contain "
                                + "a valid 'rates' object."
                );

                System.err.println(
                        "Response: " + body
                );

                return;
            }

            JsonNode inrNode =
                    ratesNode.get("INR");

            if (inrNode == null
                    || !inrNode.isNumber()) {

                System.err.println(
                        "INR rate is missing from API response."
                );

                return;
            }

            BigDecimal usdToInr =
                    BigDecimal.valueOf(
                            inrNode.asDouble()
                    );

            System.out.println(
                    "USD -> INR: " + usdToInr
            );

            if (usdToInr.compareTo(BigDecimal.ZERO) <= 0) {

                System.err.println(
                        "Invalid USD -> INR rate."
                );

                return;
            }

            List<Currency> currencies =
                    currencyRepository.findByActiveTrue();

            System.out.println(
                    "Active currencies found: "
                            + currencies.size()
            );

            int savedCount = 0;

            for (Currency currency : currencies) {

                String code =
                        currency.getCode()
                                .toUpperCase();

                JsonNode rateNode =
                        ratesNode.get(code);

                if (rateNode == null
                        || !rateNode.isNumber()) {

                    System.err.println(
                            "No API rate found for: "
                                    + code
                    );

                    continue;
                }

                BigDecimal unitsPerUsd =
                        BigDecimal.valueOf(
                                rateNode.asDouble()
                        );

                if (unitsPerUsd.compareTo(
                        BigDecimal.ZERO) <= 0) {

                    System.err.println(
                            "Invalid API rate for: "
                                    + code
                    );

                    continue;
                }

                BigDecimal rateInr;

                if ("USD".equals(code)) {

                    rateInr = usdToInr;

                } else {

                    rateInr =
                            usdToInr.divide(
                                    unitsPerUsd,
                                    6,
                                    RoundingMode.HALF_UP
                            );
                }

                currentRates.put(
                        code,
                        rateInr
                );

                persistRate(
                        currency,
                        rateInr
                );

                savedCount++;

                System.out.println(
                        code
                                + " -> INR: "
                                + rateInr
                );
            }

            System.out.println(
                    "=== FXWallet: Saved "
                            + savedCount
                            + " exchange rates ==="
            );

        } catch (Exception e) {

            System.err.println(
                    "=== FXWallet: RATE FETCH FAILED ==="
            );

            log.error("Rate fetch failed", e);
        }
    }

    @Transactional
    protected void persistRate(
            Currency currency,
            BigDecimal rate) {

        RateHistory history =
                new RateHistory();

        history.setCurrency(currency);
        history.setRate(rate);
        history.setTimestamp(
                LocalDateTime.now()
        );

        rateHistoryRepository.save(history);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentRate(String code) {

        String normalizedCode =
                code.toUpperCase();

        BigDecimal rate =
                currentRates.get(normalizedCode);

        if (rate != null
                && rate.compareTo(BigDecimal.ZERO) > 0) {

            return rate;
        }

        Currency currency =
                currencyRepository
                        .findByCode(normalizedCode)
                        .orElseThrow(
                                () ->
                                        new com.fxwallet.exception.ResourceNotFoundException(
                                                "Currency not found: "
                                                        + code
                                        )
                        );

        List<RateHistory> histories =
                rateHistoryRepository
                        .findByCurrencyCodeOrderByTimestampAsc(
                                normalizedCode
                        );

        if (!histories.isEmpty()) {

            RateHistory latest =
                    histories.get(
                            histories.size() - 1
                    );

            return latest.getRate() != null
                    && latest.getRate().compareTo(
                            BigDecimal.ZERO
                    ) > 0
                    ? latest.getRate()
                    : null;
        }

        return null;
    }

    @Transactional(readOnly = true)
    public List<RateResponse> getAllRates() {

        List<Currency> currencies =
                currencyRepository.findByActiveTrue();

        List<RateResponse> responses =
                new ArrayList<>();

        for (Currency currency : currencies) {

            BigDecimal currentRate =
                    getCurrentRate(
                            currency.getCode()
                    );

            if (currentRate == null
                    || currentRate.compareTo(
                            BigDecimal.ZERO
                    ) <= 0) {

                continue;
            }

            BigDecimal previousRate =
                    getPreviousRate(
                            currency.getCode()
                    );

            String change =
                    calculateChange(
                            currentRate,
                            previousRate
                    );

            responses.add(
                    new RateResponse(
                            currency.getCode(),
                            currency.getName(),
                            currency.getSymbol(),
                            currentRate,
                            change
                    )
            );
        }

        return responses;
    }

    /*
     * Gets the latest rate from a PREVIOUS CALENDAR DAY.
     *
     * This is intentionally different from:
     *
     * histories.get(1)
     *
     * because histories.get(1) represents the previous
     * 5-minute snapshot.
     *
     * Example:
     *
     * Today:
     *   10:00 -> 95.92
     *   10:05 -> 95.92
     *   10:10 -> 95.92
     *
     * Yesterday:
     *   23:55 -> 95.51
     *
     * We compare:
     *
     * 95.92 vs 95.51
     *
     * instead of:
     *
     * 95.92 vs 95.92
     */
    BigDecimal getPreviousRate(String code) {

        List<RateHistory> histories =
                rateHistoryRepository
                        .findByCurrencyCodeOrderByTimestampDesc(
                                code.toUpperCase()
                        );

        if (histories.isEmpty()) {
            return null;
        }

        LocalDate today =
                LocalDate.now();

        for (RateHistory history : histories) {

            if (history == null
                    || history.getTimestamp() == null
                    || history.getRate() == null) {

                continue;
            }

            LocalDate historyDate =
                    history.getTimestamp()
                            .toLocalDate();

            if (historyDate.isBefore(today)
                    && history.getRate().compareTo(
                            BigDecimal.ZERO
                    ) > 0) {

                return history.getRate();
            }
        }

        return null;
    }

    private String calculateChange(
            BigDecimal current,
            BigDecimal previous) {

        if (current == null
                || previous == null
                || previous.compareTo(
                        BigDecimal.ZERO
                ) <= 0) {

            return "0.0000%";
        }

        BigDecimal diff =
                current.subtract(previous);

        BigDecimal pct =
                diff
                        .divide(
                                previous,
                                10,
                                RoundingMode.HALF_UP
                        )
                        .multiply(
                                new BigDecimal("100")
                        );

        String sign =
                pct.compareTo(
                        BigDecimal.ZERO
                ) > 0
                        ? "+"
                        : "";

        return sign
                + pct.setScale(
                        4,
                        RoundingMode.HALF_UP
                ).toPlainString()
                + "%";
    }

    @Transactional(readOnly = true)
    public List<RateHistory> getRateHistory(
            String code) {

        return rateHistoryRepository
                .findByCurrencyCodeOrderByTimestampAsc(
                        code.toUpperCase()
                );
    }

    public void initializeRates() {
        fetchAndPersistRates();
    }
}