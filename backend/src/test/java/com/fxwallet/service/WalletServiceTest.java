package com.fxwallet.service;

import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.exception.InsufficientBalanceException;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WalletService walletService;

    @BeforeEach
    public void setup() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test@example.com", null, List.of()));
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    public void debit_shouldThrowWhenBalanceInsufficient() {
        Wallet wallet = new Wallet();
        wallet.setId(1L);
        wallet.setUser(new User());
        wallet.setBalance(new BigDecimal("1000"));
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(wallet));

        assertThrows(InsufficientBalanceException.class, () -> walletService.debit(new BigDecimal("2000")));
    }
}
