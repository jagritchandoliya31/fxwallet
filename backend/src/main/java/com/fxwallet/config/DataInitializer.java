package com.fxwallet.config;

import com.fxwallet.entity.Currency;
import com.fxwallet.repository.CurrencyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner init(CurrencyRepository currencyRepository) {
        return args -> {
            if (currencyRepository.count() == 0) {
                List<Currency> currencies = List.of(
                        createCurrency("USD", "US Dollar", "$"),
                        createCurrency("EUR", "Euro", "€"),
                        createCurrency("GBP", "British Pound", "£")
                );
                currencyRepository.saveAll(currencies);
            }
        };
    }

    private Currency createCurrency(String code, String name, String symbol) {
        Currency c = new Currency();
        c.setCode(code);
        c.setName(name);
        c.setSymbol(symbol);
        c.setActive(true);
        return c;
    }
}
