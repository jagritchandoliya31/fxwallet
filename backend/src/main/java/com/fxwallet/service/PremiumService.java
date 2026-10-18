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
import java.time.LocalDate;

@Service
public class PremiumService {

    private static final BigDecimal PREMIUM_PRICE = new BigDecimal("999.00");

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PremiumSubscriptionRepository premiumSubscriptionRepository;
    private final OtpService otpService;

    public PremiumService(
            UserRepository userRepository,
            WalletRepository walletRepository,
            PremiumSubscriptionRepository premiumSubscriptionRepository,
            OtpService otpService) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.premiumSubscriptionRepository = premiumSubscriptionRepository;
        this.otpService = otpService;
    }

    public void sendPurchaseVerificationCode() {
        otpService.sendPremiumPurchaseOtp(currentUser());
    }

    public User verifyPurchaseAndActivate(String otp) {
        User user = currentUser();

        try {
            otpService.verify(
                    user,
                    otp,
                    com.fxwallet.entity.OtpVerification.Purpose.PREMIUM_PURCHASE
            );
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(ex.getMessage());
        }

        return activatePremium();
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("User is not authenticated");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional
    public User activatePremium() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("User is not authenticated");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        BigDecimal currentBalance = wallet.getBalance();

        if (currentBalance == null || currentBalance.compareTo(PREMIUM_PRICE) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient virtual wallet balance. ₹999 is required."
            );
        }

        PremiumSubscription existingSubscription =
                premiumSubscriptionRepository.findByUserId(user.getId()).orElse(null);

        if (existingSubscription != null &&
                existingSubscription.getStatus() == PremiumSubscription.SubscriptionStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Premium subscription is already active."
            );
        }

        wallet.setBalance(currentBalance.subtract(PREMIUM_PRICE));
        walletRepository.save(wallet);

        user.setUserType(User.UserType.PREMIUM);
        userRepository.save(user);

        PremiumSubscription subscription;

        if (existingSubscription == null) {
            subscription = new PremiumSubscription();
        } else {
            subscription = existingSubscription;
            subscription.setMonthlyPrice(PREMIUM_PRICE);
            subscription.setBillingCycle(PremiumSubscription.BillingCycle.MONTHLY);
            subscription.setStatus(PremiumSubscription.SubscriptionStatus.ACTIVE);
            subscription.setStartDate(LocalDate.now());
            subscription.setNextBillingDate(LocalDate.now().plusMonths(1));
        }

        subscription.setUser(user);
        premiumSubscriptionRepository.save(subscription);

        return user;
    }
}
