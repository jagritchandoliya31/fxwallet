package com.fxwallet.service;

import com.fxwallet.dto.BuyRequest;
import com.fxwallet.dto.SellRequest;
import com.fxwallet.dto.TransactionResponse;
import com.fxwallet.entity.*;
import com.fxwallet.exception.InsufficientBalanceException;
import com.fxwallet.exception.InsufficientHoldingsException;
import com.fxwallet.exception.ResourceNotFoundException;
import com.fxwallet.repository.*;
import com.fxwallet.util.BigDecimalUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionService {
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final CurrencyRepository currencyRepository;
    private final HoldingRepository holdingRepository;
    private final TransactionRepository transactionRepository;
    private final RateService rateService;

    public TransactionService(WalletRepository walletRepository, UserRepository userRepository,
                              CurrencyRepository currencyRepository, HoldingRepository holdingRepository,
                              TransactionRepository transactionRepository, RateService rateService) {
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
        this.currencyRepository = currencyRepository;
        this.holdingRepository = holdingRepository;
        this.transactionRepository = transactionRepository;
        this.rateService = rateService;
    }

    @Transactional
    public TransactionResponse buy(BuyRequest request) {
        User user = getCurrentUser();
        Currency currency = currencyRepository.findByCode(request.currencyCode().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Currency not found: " + request.currencyCode()));

        BigDecimal amountInr = BigDecimalUtil.scale(request.amountInr());
        BigDecimal rate = BigDecimalUtil.scale(rateService.getCurrentRate(currency.getCode()));
        BigDecimal quantity = amountInr.divide(rate, 6, java.math.RoundingMode.HALF_UP);

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        if (wallet.getBalance().compareTo(amountInr) < 0) {
            throw new InsufficientBalanceException("Insufficient wallet balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(amountInr));
        walletRepository.save(wallet);

        Holding holding = holdingRepository.findByUserIdAndCurrencyCode(user.getId(), currency.getCode())
                .orElse(null);
        if (holding == null) {
            holding = new Holding();
            holding.setUser(user);
            holding.setCurrency(currency);
            holding.setQuantity(quantity);
            holding.setAvgBuyRate(rate);
        } else {
            BigDecimal totalInvested = holding.getAvgBuyRate().multiply(holding.getQuantity());
            BigDecimal newTotalInvested = totalInvested.add(amountInr);
            BigDecimal newQuantity = holding.getQuantity().add(quantity);
            holding.setQuantity(newQuantity);
            holding.setAvgBuyRate(newTotalInvested.divide(newQuantity, 6, java.math.RoundingMode.HALF_UP));
        }
        holdingRepository.save(holding);

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setCurrency(currency);
        transaction.setType(Transaction.Type.BUY);
        transaction.setInrAmount(amountInr);
        transaction.setQuantity(quantity);
        transaction.setExchangeRate(rate);
        transaction.setRealizedPl(BigDecimal.ZERO);
        transactionRepository.save(transaction);

        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse sell(SellRequest request) {
        User user = getCurrentUser();
        Currency currency = currencyRepository.findByCode(request.currencyCode().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Currency not found: " + request.currencyCode()));

        BigDecimal quantity = request.quantity();
        BigDecimal rate = BigDecimalUtil.scale(rateService.getCurrentRate(currency.getCode()));

        Holding holding = holdingRepository.findByUserIdAndCurrencyCode(user.getId(), currency.getCode())
                .orElseThrow(() -> new InsufficientHoldingsException("No holdings found for " + currency.getCode()));

        if (holding.getQuantity().compareTo(quantity) < 0) {
            throw new InsufficientHoldingsException("Insufficient " + currency.getCode() + " holdings");
        }

        BigDecimal proceeds = BigDecimalUtil.scale(quantity.multiply(rate));
        BigDecimal invested = BigDecimalUtil.scale(holding.getAvgBuyRate().multiply(quantity));
        BigDecimal realizedPl = proceeds.subtract(invested);

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        wallet.setBalance(wallet.getBalance().add(proceeds));
        walletRepository.save(wallet);

        holding.setQuantity(holding.getQuantity().subtract(quantity));
        if (holding.getQuantity().compareTo(BigDecimal.ZERO) == 0) {
            holding.setAvgBuyRate(BigDecimal.ZERO);
        }
        holdingRepository.save(holding);

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setCurrency(currency);
        transaction.setType(Transaction.Type.SELL);
        transaction.setInrAmount(proceeds);
        transaction.setQuantity(quantity);
        transaction.setExchangeRate(rate);
        transaction.setRealizedPl(realizedPl);
        transactionRepository.save(transaction);

        return toResponse(transaction);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(Pageable pageable) {
        User user = getCurrentUser();
        return transactionRepository.findByUserIdOrderByTimestampDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    private TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getCurrency().getCode(),
                transaction.getCurrency().getName(),
                transaction.getType().name(),
                transaction.getInrAmount(),
                transaction.getQuantity(),
                transaction.getExchangeRate(),
                transaction.getRealizedPl(),
                transaction.getTimestamp()
        );
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("User not found"));
    }
}
