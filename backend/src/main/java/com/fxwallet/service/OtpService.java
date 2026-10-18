package com.fxwallet.service;

import com.fxwallet.entity.OtpVerification;
import com.fxwallet.entity.User;
import com.fxwallet.repository.OtpVerificationRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOGIN_DIGITS = 6;
    private static final int PREMIUM_DIGITS = 4;
    private static final int EXPIRY_MINUTES = 5;

    private final OtpVerificationRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            OtpVerificationRepository otpRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Transactional
    public void sendLoginOtp(User user) {
        issueOtp(user, OtpVerification.Purpose.LOGIN, LOGIN_DIGITS,
                "FXWallet Login Verification Code");
    }

    @Transactional
    public void sendPremiumPurchaseOtp(User user) {
        issueOtp(user, OtpVerification.Purpose.PREMIUM_PURCHASE, PREMIUM_DIGITS,
                "FXWallet Premium Purchase Verification");
    }

    @Transactional
    public void verify(User user, String rawOtp, OtpVerification.Purpose purpose) {
        OtpVerification verification = otpRepository
                .findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(user.getId(), purpose)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Verification code expired or not requested. Please request a new code."
                ));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Verification code expired. Please request a new code."
            );
        }

        int attempts = verification.getAttempts() == null ? 0 : verification.getAttempts();

        if (attempts >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException(
                    "Too many verification attempts. Please request a new code."
            );
        }

        verification.setAttempts(attempts + 1);

        if (rawOtp == null || !passwordEncoder.matches(rawOtp, verification.getOtpHash())) {
            otpRepository.save(verification);
            throw new IllegalArgumentException("Invalid verification code.");
        }

        verification.setUsed(true);
        otpRepository.save(verification);
    }

    private void issueOtp(
            User user,
            OtpVerification.Purpose purpose,
            int digits,
            String subject) {

        // Invalidate any previous unused OTP for this purpose.
        otpRepository.findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(user.getId(), purpose)
                .ifPresent(previous -> {
                    previous.setUsed(true);
                    otpRepository.save(previous);
                });

        int bound = (int) Math.pow(10, digits);
        int number = secureRandom.nextInt(bound);
        String otp = String.format("%0" + digits + "d", number);

        OtpVerification verification = new OtpVerification();
        verification.setUser(user);
        verification.setOtpHash(passwordEncoder.encode(otp));
        verification.setPurpose(purpose);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));
        verification.setAttempts(0);
        verification.setUsed(false);
        otpRepository.save(verification);

        String purposeText = purpose == OtpVerification.Purpose.LOGIN
                ? "login"
                : "Premium purchase";

        emailService.sendOtp(user.getEmail(), subject, otp, purposeText);
    }
}
