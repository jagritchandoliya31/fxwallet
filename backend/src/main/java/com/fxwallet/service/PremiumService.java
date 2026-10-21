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

    private static final BigDecimal PREMIUM_PRICE =
            new BigDecimal("999.00");

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
        this.premiumSubscriptionRepository =
                premiumSubscriptionRepository;
        this.otpService = otpService;
    }

    /**
     * Sends the Premium purchase verification OTP.
     */
    public void sendPurchaseVerificationCode() {
        otpService.sendPremiumPurchaseOtp(currentUser());
    }

    /**
     * Verifies the Premium purchase OTP and activates Premium.
     */
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

    /**
     * Gets the currently authenticated user.
     */
    private User currentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            throw new IllegalArgumentException(
                    "User is not authenticated"
            );
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found"
                        ));
    }

    /**
     * Activates Premium and deducts ₹999.
     *
     * The wallet row is locked using PESSIMISTIC_WRITE.
     * This prevents concurrent requests from spending the same
     * wallet balance.
     */
    @Transactional
    public User activatePremium() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            throw new IllegalArgumentException(
                    "User is not authenticated"
            );
        }

        User user = userRepository.findByEmail(
                authentication.getName()
        ).orElseThrow(() ->
                new IllegalArgumentException(
                        "User not found"
                ));

        /*
         * IMPORTANT:
         *
         * Lock the wallet row before reading its balance.
         *
         * If two purchase requests arrive simultaneously,
         * the second request waits until the first transaction
         * finishes.
         */
        Wallet wallet = walletRepository
                .findByUserIdForUpdate(user.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Wallet not found"
                        ));

        /*
         * Check whether Premium is already active
         * while holding the wallet lock.
         */
        PremiumSubscription existingSubscription =
                premiumSubscriptionRepository
                        .findByUserId(user.getId())
                        .orElse(null);

        if (existingSubscription != null
                && existingSubscription.getStatus()
                == PremiumSubscription.SubscriptionStatus.ACTIVE) {

            throw new IllegalArgumentException(
                    "Premium subscription is already active."
            );
        }

        /*
         * Read the balance AFTER acquiring the lock.
         */
        BigDecimal currentBalance =
                wallet.getBalance();

        if (currentBalance == null
                || currentBalance.compareTo(PREMIUM_PRICE) < 0) {

            throw new IllegalArgumentException(
                    "Insufficient virtual wallet balance. ₹999 is required."
            );
        }

        /*
         * Deduct Premium price.
         */
        wallet.setBalance(
                currentBalance.subtract(PREMIUM_PRICE)
        );

        walletRepository.save(wallet);

        /*
         * Activate Premium role/type.
         */
        user.setUserType(User.UserType.PREMIUM);

        userRepository.save(user);

        /*
         * Create or reactivate subscription.
         */
        PremiumSubscription subscription;

        if (existingSubscription == null) {

            subscription =
                    new PremiumSubscription();

        } else {

            subscription =
                    existingSubscription;

            subscription.setMonthlyPrice(
                    PREMIUM_PRICE
            );

            subscription.setBillingCycle(
                    PremiumSubscription.BillingCycle.MONTHLY
            );

            subscription.setStatus(
                    PremiumSubscription.SubscriptionStatus.ACTIVE
            );

            subscription.setStartDate(
                    LocalDate.now()
            );

            subscription.setNextBillingDate(
                    LocalDate.now().plusMonths(1)
            );
        }

        subscription.setUser(user);

        premiumSubscriptionRepository.save(
                subscription
        );

        return user;
    }
}