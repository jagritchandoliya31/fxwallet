package com.fxwallet.service;

import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.User;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import com.fxwallet.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    @Test
    public void register_shouldCreateUserAndWallet() {
        when(passwordEncoder.encode(any(String.class))).thenReturn("encoded");
        when(jwtUtil.generateToken(any(org.springframework.security.core.userdetails.UserDetails.class))).thenReturn("token");

        RegisterRequest request = new RegisterRequest("John Doe", "john@example.com", "password");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail("john@example.com");
        savedUser.setName("John Doe");
        savedUser.setPassword("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        var response = authService.register(request);

        assertEquals("token", response.token());
        assertEquals("John Doe", response.name());
        assertEquals("john@example.com", response.email());
        verify(userRepository).save(any(User.class));
        verify(walletRepository).save(any(com.fxwallet.entity.Wallet.class));
    }

    @Test
    public void register_shouldThrowWhenEmailExists() {
        RegisterRequest request = new RegisterRequest("John Doe", "john@example.com", "password");
        when(userRepository.existsByEmail("john@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
        verify(walletRepository, never()).save(any(com.fxwallet.entity.Wallet.class));
    }
}