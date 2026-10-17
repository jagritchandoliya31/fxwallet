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
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PremiumService {

    private static final BigDecimal PREMIUM_PRICE = new BigDecimal("999.00");

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PremiumSubscriptionRepository premiumSubscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public PremiumService(
            UserRepository userRepository,
            WalletRepository walletRepository,
            PremiumSubscriptionRepository premiumSubscriptionRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {

        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.premiumSubscriptionRepository = premiumSubscriptionRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public void sendPurchaseVerificationCode() {
        User user = currentUser();
        String otp = String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
        user.setMfaOtpHash(passwordEncoder.encode(otp));
        user.setMfaOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
        user.setMfaOtpAttempts(0);
        userRepository.save(user);

        emailService.sendOtp(
                user.getEmail(),
                "FXWallet Premium Purchase Verification",
                otp,
                "Premium purchase"
        );
    }

    public User verifyPurchaseAndActivate(String otp) {
        User user = currentUser();
        if (user.getMfaOtpHash() == null || user.getMfaOtpExpiresAt() == null
                || user.getMfaOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification code expired. Please request a new code.");
        }

        int attempts = user.getMfaOtpAttempts() == null ? 0 : user.getMfaOtpAttempts();
        if (attempts >= 5) {
            throw new IllegalArgumentException("Too many verification attempts. Please request a new code.");
        }

        user.setMfaOtpAttempts(attempts + 1);
        if (!passwordEncoder.matches(otp, user.getMfaOtpHash())) {
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid verification code.");
        }

        user.setMfaOtpHash(null);
        user.setMfaOtpExpiresAt(null);
        user.setMfaOtpAttempts(0);
        userRepository.save(user);

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
