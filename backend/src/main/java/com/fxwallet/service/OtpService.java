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

    // OTP security / rate limiting
    private static final int OTP_COOLDOWN_SECONDS = 60;
    private static final int MAX_REQUESTS_PER_HOUR = 5;

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

    /**
     * Send login OTP.
     */
    @Transactional
    public void sendLoginOtp(User user) {

        issueOtp(
                user,
                OtpVerification.Purpose.LOGIN,
                LOGIN_DIGITS,
                "FXWallet Login Verification Code"
        );
    }

    /**
     * Send premium purchase OTP.
     */
    @Transactional
    public void sendPremiumPurchaseOtp(User user) {

        issueOtp(
                user,
                OtpVerification.Purpose.PREMIUM_PURCHASE,
                PREMIUM_DIGITS,
                "FXWallet Premium Purchase Verification"
        );
    }

    /**
     * Verify OTP.
     *
     * Pessimistic database locking is used here so that
     * simultaneous requests cannot consume the same OTP.
     */
    @Transactional
    public void verify(
            User user,
            String rawOtp,
            OtpVerification.Purpose purpose) {

        /*
         * IMPORTANT:
         *
         * This query locks the OTP row at the database level.
         *
         * If two requests arrive simultaneously with the same OTP:
         *
         * Request A -> gets lock
         * Request B -> waits
         *
         * Request A -> validates + marks used
         * Request A -> transaction commits
         *
         * Request B -> continues
         * Request B -> sees no unused OTP
         *
         * Therefore the OTP can only be consumed once.
         */
        OtpVerification verification = otpRepository
                .findLatestUnusedForUpdate(
                        user.getId(),
                        purpose
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Verification code expired or not requested. Please request a new code."
                        )
                );

        /*
         * Check expiry.
         */
        if (verification.getExpiresAt() == null
                || verification.getExpiresAt().isBefore(LocalDateTime.now())) {

            verification.setUsed(true);
            otpRepository.save(verification);

            throw new IllegalArgumentException(
                    "Verification code expired. Please request a new code."
            );
        }

        /*
         * Check attempt limit.
         */
        int attempts = verification.getAttempts() == null
                ? 0
                : verification.getAttempts();

        if (attempts >= MAX_ATTEMPTS) {

            verification.setUsed(true);
            otpRepository.save(verification);

            throw new IllegalArgumentException(
                    "Too many verification attempts. Please request a new code."
            );
        }

        /*
         * Count this attempt BEFORE checking the OTP.
         *
         * This protects against brute-force attempts.
         */
        verification.setAttempts(attempts + 1);

        /*
         * Validate supplied OTP.
         */
        boolean valid =
                rawOtp != null
                        && passwordEncoder.matches(
                                rawOtp,
                                verification.getOtpHash()
                        );

        /*
         * Invalid OTP.
         */
        if (!valid) {

            /*
             * If this was the fifth failed attempt,
             * permanently invalidate this OTP.
             */
            if (verification.getAttempts() >= MAX_ATTEMPTS) {
                verification.setUsed(true);
            }

            otpRepository.save(verification);

            throw new IllegalArgumentException(
                    "Invalid verification code."
            );
        }

        /*
         * Valid OTP.
         *
         * Mark as used before transaction commits.
         */
        verification.setUsed(true);

        otpRepository.save(verification);
    }

    /**
     * Generate and send a new OTP.
     */
    private void issueOtp(
            User user,
            OtpVerification.Purpose purpose,
            int digits,
            String subject) {

        LocalDateTime now = LocalDateTime.now();

        /*
         * ---------------------------------------------------------
         * 1. 60-SECOND COOLDOWN
         * ---------------------------------------------------------
         */
        OtpVerification latestOtp = otpRepository
                .findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        user.getId(),
                        purpose
                )
                .orElse(null);

        if (latestOtp != null
                && latestOtp.getCreatedAt() != null
                && latestOtp.getCreatedAt()
                        .plusSeconds(OTP_COOLDOWN_SECONDS)
                        .isAfter(now)) {

            throw new IllegalArgumentException(
                    "Please wait before requesting another verification code."
            );
        }

        /*
         * ---------------------------------------------------------
         * 2. HOURLY RATE LIMIT
         * ---------------------------------------------------------
         */
        long requestsLastHour =
                otpRepository.countByUserIdAndPurposeAndCreatedAtAfter(
                        user.getId(),
                        purpose,
                        now.minusHours(1)
                );

        if (requestsLastHour >= MAX_REQUESTS_PER_HOUR) {

            throw new IllegalArgumentException(
                    "Too many verification code requests. Please try again later."
            );
        }

        /*
         * ---------------------------------------------------------
         * 3. INVALIDATE PREVIOUS OTP
         * ---------------------------------------------------------
         */
        otpRepository
                .findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(
                        user.getId(),
                        purpose
                )
                .ifPresent(previous -> {

                    previous.setUsed(true);
                    otpRepository.save(previous);
                });

        /*
         * ---------------------------------------------------------
         * 4. GENERATE SECURE OTP
         * ---------------------------------------------------------
         */
        int bound = (int) Math.pow(10, digits);

        int number = secureRandom.nextInt(bound);

        String otp = String.format(
                "%0" + digits + "d",
                number
        );

        /*
         * ---------------------------------------------------------
         * 5. STORE HASHED OTP
         * ---------------------------------------------------------
         */
        OtpVerification verification =
                new OtpVerification();

        verification.setUser(user);
        verification.setOtpHash(
                passwordEncoder.encode(otp)
        );
        verification.setPurpose(purpose);
        verification.setExpiresAt(
                now.plusMinutes(EXPIRY_MINUTES)
        );
        verification.setAttempts(0);
        verification.setUsed(false);

        otpRepository.save(verification);

        /*
         * ---------------------------------------------------------
         * 6. SEND EMAIL
         * ---------------------------------------------------------
         */
        String purposeText =
                purpose == OtpVerification.Purpose.LOGIN
                        ? "login"
                        : "Premium purchase";

        emailService.sendOtp(
                user.getEmail(),
                subject,
                otp,
                purposeText
        );
    }
}