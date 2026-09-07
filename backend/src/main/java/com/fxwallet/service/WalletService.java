package com.fxwallet.service;

import com.fxwallet.dto.WalletResponse;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class WalletService {
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public WalletService(WalletRepository walletRepository, UserRepository userRepository) {
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponse getCurrentUserWallet() {
        Wallet wallet = getCurrentWallet();
        return new WalletResponse(wallet.getBalance(), wallet.getCurrency());
    }

    @Transactional
    public void credit(BigDecimal amount) {
        Wallet wallet = getCurrentWallet();
        wallet.setBalance(wallet.getBalance().add(amount));
        walletRepository.save(wallet);
    }

    @Transactional
    public void debit(BigDecimal amount) {
        Wallet wallet = getCurrentWallet();
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new com.fxwallet.exception.InsufficientBalanceException("Insufficient wallet balance");
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        walletRepository.save(wallet);
    }

    private Wallet getCurrentWallet() {
        User user = getCurrentUser();
        return walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("Wallet not found"));
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("User not found"));
    }
}
