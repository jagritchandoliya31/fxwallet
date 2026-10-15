package com.fxwallet.service;

import com.fxwallet.dto.BuyRequest;
import com.fxwallet.dto.SellRequest;
import com.fxwallet.dto.TransactionResponse;
import com.fxwallet.entity.*;
import com.fxwallet.exception.ExchangeRateUnavailableException;
import com.fxwallet.exception.InsufficientBalanceException;
import com.fxwallet.exception.InsufficientHoldingsException;
import com.fxwallet.exception.ResourceNotFoundException;
import com.fxwallet.repository.*;
import com.fxwallet.util.BigDecimalUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class TransactionService {
    private static final BigDecimal DEFAULT_PLATFORM_FEE_RATE = new BigDecimal("0.0010");

    @Value("${app.platform-fee-rate:0.0010}")
    private BigDecimal platformFeeRate = DEFAULT_PLATFORM_FEE_RATE;

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
        BigDecimal rate = getValidRate(currency.getCode());
        BigDecimal quantity = amountInr.divide(rate, 6, RoundingMode.HALF_UP);
        BigDecimal platformFee = calculatePlatformFee(amountInr);
        BigDecimal totalDebit = BigDecimalUtil.scale(amountInr.add(platformFee));

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        if (wallet.getBalance().compareTo(totalDebit) < 0) {
            throw new InsufficientBalanceException("Insufficient wallet balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(totalDebit));
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
            holding.setAvgBuyRate(newTotalInvested.divide(newQuantity, 6, RoundingMode.HALF_UP));
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
        transaction.setPlatformFee(platformFee);
        transactionRepository.save(transaction);

        return toResponse(transaction);
    }

    @Transactional
    public TransactionResponse sell(SellRequest request) {
        User user = getCurrentUser();
        Currency currency = currencyRepository.findByCode(request.currencyCode().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Currency not found: " + request.currencyCode()));

        BigDecimal quantity = request.quantity();
        BigDecimal rate = getValidRate(currency.getCode());

        Holding holding = holdingRepository.findByUserIdAndCurrencyCode(user.getId(), currency.getCode())
                .orElseThrow(() -> new InsufficientHoldingsException("No holdings found for " + currency.getCode()));

        if (holding.getQuantity().compareTo(quantity) < 0) {
            throw new InsufficientHoldingsException("Insufficient " + currency.getCode() + " holdings");
        }

        BigDecimal proceeds = BigDecimalUtil.scale(quantity.multiply(rate));
        BigDecimal platformFee = calculatePlatformFee(proceeds);
        BigDecimal netProceeds = BigDecimalUtil.scale(proceeds.subtract(platformFee));
        BigDecimal invested = BigDecimalUtil.scale(holding.getAvgBuyRate().multiply(quantity));

        // Realized P/L is the economic result after transaction costs.
        BigDecimal realizedPl = BigDecimalUtil.scale(netProceeds.subtract(invested));

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        wallet.setBalance(wallet.getBalance().add(netProceeds));
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
        transaction.setPlatformFee(platformFee);
        transactionRepository.save(transaction);

        return toResponse(transaction);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(Pageable pageable) {
        User user = getCurrentUser();
        return transactionRepository.findByUserIdOrderByTimestampDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    private BigDecimal calculatePlatformFee(BigDecimal tradeValue) {
        return BigDecimalUtil.scale(tradeValue.multiply(platformFeeRate));
    }

    private BigDecimal getValidRate(String currencyCode) {
        BigDecimal rate = rateService.getCurrentRate(currencyCode);
        if (rate == null || rate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ExchangeRateUnavailableException("Exchange rate currently unavailable. Please try again.");
        }
        return BigDecimalUtil.scale(rate);
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
                transaction.getPlatformFee(),
                transaction.getTimestamp()
        );
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
