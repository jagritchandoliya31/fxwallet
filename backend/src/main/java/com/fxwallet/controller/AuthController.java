package com.fxwallet.controller;

import com.fxwallet.dto.AuthResponse;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.MfaResponse;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login-with-otp")
    public ResponseEntity<MfaResponse> loginWithOtp(@RequestParam String email) {
        return ResponseEntity.ok(authService.loginWithOtp(email));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(
            @RequestParam String email,
            @RequestParam String otp) {
        return ResponseEntity.ok(authService.verifyLoginOtp(email, otp));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Void> resendOtp(@RequestParam String email) {
        authService.resendOtp(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<MfaResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
