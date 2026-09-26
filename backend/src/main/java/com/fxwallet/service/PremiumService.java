package com.fxwallet.service;

import com.fxwallet.entity.PremiumSubscription;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.PremiumSubscriptionRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PremiumService {

    private static final BigDecimal PREMIUM_PRICE = new BigDecimal("999.00");

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PremiumSubscriptionRepository premiumSubscriptionRepository;

    public PremiumService(
            UserRepository userRepository,
            WalletRepository walletRepository,
            PremiumSubscriptionRepository premiumSubscriptionRepository) {

        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.premiumSubscriptionRepository = premiumSubscriptionRepository;
    }

    @Transactional
    public User activatePremium() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("User is not authenticated");
        }

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Wallet not found"));

        BigDecimal currentBalance = wallet.getBalance();

        if (currentBalance == null ||
                currentBalance.compareTo(PREMIUM_PRICE) < 0) {

            throw new IllegalArgumentException(
                    "Insufficient virtual wallet balance. ₹999 is required."
            );
        }

        PremiumSubscription existingSubscription =
                premiumSubscriptionRepository
                        .findByUserId(user.getId())
                        .orElse(null);

        if (existingSubscription != null &&
                existingSubscription.getStatus()
                        == PremiumSubscription.SubscriptionStatus.ACTIVE) {

            throw new IllegalArgumentException(
                    "Premium subscription is already active."
            );
        }

        // Deduct ₹999 from the virtual wallet
        wallet.setBalance(
                currentBalance.subtract(PREMIUM_PRICE)
        );

        walletRepository.save(wallet);

        // Activate Premium
        user.setUserType(User.UserType.PREMIUM);
        userRepository.save(user);

        // Create a new monthly subscription
        PremiumSubscription subscription;

        if (existingSubscription == null) {
            subscription = new PremiumSubscription();
        } else {
            subscription = existingSubscription;
            subscription.setMonthlyPrice(PREMIUM_PRICE);
            subscription.setBillingCycle(
                    PremiumSubscription.BillingCycle.MONTHLY
            );
            subscription.setStatus(
                    PremiumSubscription.SubscriptionStatus.ACTIVE
            );
            subscription.setStartDate(java.time.LocalDate.now());
            subscription.setNextBillingDate(
                    java.time.LocalDate.now().plusMonths(1)
            );
        }

        subscription.setUser(user);

        premiumSubscriptionRepository.save(subscription);

        return user;
    }
}
