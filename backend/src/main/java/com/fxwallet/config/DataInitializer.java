package com.fxwallet.config;

import com.fxwallet.entity.Currency;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.service.RateService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner init(
            CurrencyRepository currencyRepository,
            RateService rateService) {

        return args -> {

            List<Currency> supportedCurrencies = List.of(
                    createCurrency("USD", "US Dollar", "$"),
                    createCurrency("EUR", "Euro", "€"),
                    createCurrency("GBP", "British Pound", "£"),
                    createCurrency("AED", "UAE Dirham", "د.إ"),
                    createCurrency("JPY", "Japanese Yen", "¥"),
                    createCurrency("AUD", "Australian Dollar", "A$"),
                    createCurrency("CAD", "Canadian Dollar", "C$"),
                    createCurrency("CHF", "Swiss Franc", "CHF"),
                    createCurrency("SGD", "Singapore Dollar", "S$"),
                    createCurrency("CNY", "Chinese Yuan", "¥"),
                    createCurrency("SAR", "Saudi Riyal", "﷼"),
                    createCurrency("HKD", "Hong Kong Dollar", "HK$"),
                    createCurrency("NZD", "New Zealand Dollar", "NZ$")
            );

            for (Currency currency : supportedCurrencies) {

                if (currencyRepository
                        .findByCode(currency.getCode())
                        .isEmpty()) {

                    currencyRepository.save(currency);

                    System.out.println(
                            "=== FXWallet: Added currency "
                                    + currency.getCode()
                                    + " ==="
                    );
                }
            }

            // Fetch exchange rates when the application starts
            rateService.fetchAndPersistRates();
        };
    }

    private Currency createCurrency(
            String code,
            String name,
            String symbol) {

        Currency currency = new Currency();
        currency.setCode(code);
        currency.setName(name);
        currency.setSymbol(symbol);
        currency.setActive(true);

        return currency;
    }
}