package com.fxwallet.service;

import com.fxwallet.entity.Currency;
import com.fxwallet.repository.CurrencyRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CurrencyService {
    private final CurrencyRepository currencyRepository;

    public CurrencyService(CurrencyRepository currencyRepository) {
        this.currencyRepository = currencyRepository;
    }

    @Transactional(readOnly = true)
    public List<Currency> getAllActive() {
        return currencyRepository.findByActiveTrue();
    }

    @Transactional(readOnly = true)
    public Currency getByCode(String code) {
        return currencyRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("Currency not found: " + code));
    }

    @Transactional(readOnly = true)
    public boolean existsByCode(String code) {
        return currencyRepository.findByCode(code.toUpperCase()).isPresent();
    }
}
