package com.fxwallet.service;

import com.fxwallet.dto.AuthResponse;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.MfaResponse;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.OtpVerification;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.exception.InvalidOtpException;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import com.fxwallet.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            WalletRepository walletRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            OtpService otpService) {

        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.otpService = otpService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.ROLE_USER);

        user = userRepository.save(user);

        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setBalance(new BigDecimal("100000.0000"));
        wallet.setCurrency("INR");

        walletRepository.save(wallet);

        return buildAuthResponse(user);
    }

    /**
     * Normal login:
     *
     * Email + Password
     *       ↓
     * Password authentication
     *       ↓
     * Login OTP
     *       ↓
     * Verify OTP
     *       ↓
     * JWT
     */
    public MfaResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() ->
                        new BadCredentialsException("Invalid credentials")
                );

        otpService.sendLoginOtp(user);

        return new MfaResponse(
                true,
                user.getEmail(),
                user.getName()
        );
    }

    /**
     * Passwordless OTP login.
     *
     * Security requirement:
     * Never reveal whether the supplied email exists.
     *
     * Existing user:
     *      Send OTP
     *
     * Non-existing user:
     *      Do nothing
     *
     * Both cases return the same generic response.
     */
    public MfaResponse loginWithOtp(String email) {

        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            otpService.sendLoginOtp(user);
        }

        /*
         * Important:
         * Do not return user's name here.
         * Returning a real user's name would reveal
         * that the email exists.
         *
         * The email is simply the email supplied by the
         * client, so echoing it does not reveal existence.
         */
        return new MfaResponse(
                true,
                email,
                null
        );
    }

    /**
     * Verify login OTP and issue JWT.
     */
    public AuthResponse verifyLoginOtp(String email, String otp) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new InvalidOtpException("Invalid or expired OTP")
                );

        try {

            otpService.verify(
                    user,
                    otp,
                    OtpVerification.Purpose.LOGIN
            );

        } catch (IllegalArgumentException ex) {

            /*
             * Do not expose internal OTP failure details.
             */
            throw new InvalidOtpException(
                    "Invalid or expired OTP"
            );
        }

        return buildAuthResponse(user);
    }

    /**
     * Resend login OTP.
     *
     * Security requirement:
     * Never reveal whether the email exists.
     *
     * Existing email:
     *      Send OTP
     *
     * Non-existing email:
     *      Do nothing
     *
     * Both cases return successfully.
     *
     * OTP cooldown/rate limiting is handled inside OtpService.
     */
    public void resendOtp(String email) {

        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            otpService.sendLoginOtp(user);
        }
    }

    /**
     * Build JWT authentication response.
     */
    private AuthResponse buildAuthResponse(User user) {

        UserDetails userDetails =
                org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPassword())
                        .roles(
                                user.getRole()
                                        .name()
                                        .replace("ROLE_", "")
                        )
                        .build();

        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}