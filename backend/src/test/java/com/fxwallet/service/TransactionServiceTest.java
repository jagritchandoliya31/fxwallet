package com.fxwallet.service;

import com.fxwallet.dto.BuyRequest;
import com.fxwallet.dto.SellRequest;
import com.fxwallet.entity.*;
import com.fxwallet.exception.ExchangeRateUnavailableException;
import com.fxwallet.exception.InsufficientBalanceException;
import com.fxwallet.exception.InsufficientHoldingsException;
import com.fxwallet.exception.ResourceNotFoundException;
import com.fxwallet.repository.*;
import com.fxwallet.util.BigDecimalUtil;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransactionServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrencyRepository currencyRepository;

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private RateService rateService;

    @InjectMocks
    private TransactionService transactionService;

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
    public void buy_shouldThrowWhenCurrencyNotFound() {
        BuyRequest request = new BuyRequest("XYZ", new BigDecimal("1000"));
        when(currencyRepository.findByCode("XYZ")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> transactionService.buy(request));
    }

    @Test
    public void buy_shouldThrowWhenRateIsZero() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));
        when(rateService.getCurrentRate("USD")).thenReturn(BigDecimal.ZERO);

        assertThrows(ExchangeRateUnavailableException.class,
                () -> transactionService.buy(new BuyRequest("USD", new BigDecimal("1000"))));
        verify(walletRepository, never()).findByUserId(anyLong());
        verify(holdingRepository, never()).save(any(Holding.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    public void buy_shouldThrowWhenRateIsNull() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));
        when(rateService.getCurrentRate("USD")).thenReturn(null);

        assertThrows(ExchangeRateUnavailableException.class,
                () -> transactionService.buy(new BuyRequest("USD", new BigDecimal("1000"))));
        verify(walletRepository, never()).findByUserId(anyLong());
        verify(holdingRepository, never()).save(any(Holding.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    public void sell_shouldThrowWhenRateIsZero() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));
        when(rateService.getCurrentRate("USD")).thenReturn(BigDecimal.ZERO);

        assertThrows(ExchangeRateUnavailableException.class,
                () -> transactionService.sell(new SellRequest("USD", new BigDecimal("10"))));
        verify(walletRepository, never()).findByUserId(anyLong());
        verify(holdingRepository, never()).save(any(Holding.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    public void sell_shouldThrowWhenInsufficientHoldings() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        User user = new User();
        user.setId(1L);
        Holding holding = new Holding();
        holding.setId(1L);
        holding.setUser(user);
        holding.setCurrency(currency);
        holding.setQuantity(new BigDecimal("10"));
        holding.setAvgBuyRate(new BigDecimal("85"));
        when(holdingRepository.findByUserIdAndCurrencyCode(1L, "USD")).thenReturn(Optional.of(holding));

        when(rateService.getCurrentRate("USD")).thenReturn(new BigDecimal("87"));

        assertThrows(InsufficientHoldingsException.class, () -> transactionService.sell(new SellRequest("USD", new BigDecimal("20"))));
    }

    @Test
    public void sell_shouldThrowWhenRateIsNull() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        currency.setSymbol("$");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));
        when(rateService.getCurrentRate("USD")).thenReturn(null);

        assertThrows(ExchangeRateUnavailableException.class,
                () -> transactionService.sell(new SellRequest("USD", new BigDecimal("10"))));
        verify(walletRepository, never()).findByUserId(anyLong());
        verify(holdingRepository, never()).save(any(Holding.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }
}
