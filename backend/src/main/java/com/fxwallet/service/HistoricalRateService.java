package com.fxwallet.service;

import com.fxwallet.entity.Currency;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HistoricalRateService {

    private static final String FRANKFURTER_API =
            "https://api.frankfurter.dev";

    private final RestClient restClient;

    public HistoricalRateService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl(FRANKFURTER_API)
                .build();
    }

    public Map<String, Map<LocalDate, BigDecimal>> fetchHistoricalRates(
            List<Currency> currencies,
            LocalDate from,
            LocalDate to) {

        Map<String, Map<LocalDate, BigDecimal>> result =
                new HashMap<>();

        if (currencies == null || currencies.isEmpty()) {
            return result;
        }

        List<String> quotes = new ArrayList<>();

        for (Currency currency : currencies) {

            String code = currency.getCode()
                    .toUpperCase()
                    .trim();

            if (!"INR".equals(code)) {
                quotes.add(code);
            } else {
                result.put(
                        "INR",
                        createInrSeries(from, to)
                );
            }
        }

        if (quotes.isEmpty()) {
            return result;
        }

        String quoteParameter =
                String.join(",", quotes);

        String uri =
                UriComponentsBuilder
                        .fromPath("/v2/rates")
                        .queryParam("base", "INR")
                        .queryParam("quotes", quoteParameter)
                        .queryParam("from", from)
                        .queryParam("to", to)
                        .build()
                        .toUriString();

        FrankfurterRate[] rates =
                restClient
                        .get()
                        .uri(uri)
                        .retrieve()
                        .body(FrankfurterRate[].class);

        if (rates == null) {
            return result;
        }

        /*
         * Frankfurter returns:
         *
         * base = INR
         * quote = USD
         * rate = USD per INR
         *
         * FXWallet stores:
         *
         * INR per USD
         *
         * Therefore:
         *
         * INR per USD = 1 / (USD per INR)
         */

        for (FrankfurterRate item : rates) {

            if (item == null
                    || item.date() == null
                    || item.quote() == null
                    || item.rate() == null
                    || item.rate().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String currencyCode =
                    item.quote()
                            .toUpperCase();

            BigDecimal inrPerCurrency =
                    BigDecimal.ONE.divide(
                            item.rate(),
                            10,
                            java.math.RoundingMode.HALF_UP
                    );

            result
                    .computeIfAbsent(
                            currencyCode,
                            key -> new HashMap<>()
                    )
                    .put(
                            item.date(),
                            inrPerCurrency
                    );
        }

        return result;
    }

    private Map<LocalDate, BigDecimal> createInrSeries(
            LocalDate from,
            LocalDate to) {

        Map<LocalDate, BigDecimal> result =
                new HashMap<>();

        LocalDate current = from;

        while (!current.isAfter(to)) {

            result.put(
                    current,
                    BigDecimal.ONE
            );

            current = current.plusDays(1);
        }

        return result;
    }

    private record FrankfurterRate(
            LocalDate date,
            String base,
            String quote,
            BigDecimal rate
    ) {
    }
}