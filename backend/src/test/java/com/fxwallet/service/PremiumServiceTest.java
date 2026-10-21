package com.fxwallet.service;

import com.fxwallet.entity.PremiumSubscription;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.PremiumSubscriptionRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.junit.jupiter.api.AfterEach;
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
class PremiumServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private PremiumSubscriptionRepository premiumSubscriptionRepository;

    @Mock
    private OtpService otpService;

    @InjectMocks
    private PremiumService premiumService;

    private User user;
    private Wallet wallet;

    @BeforeEach
    void setup() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");

        wallet = new Wallet();
        wallet.setId(1L);
        wallet.setUser(user);
        wallet.setBalance(new BigDecimal("1500.00"));

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test@example.com",
                        null,
                        List.of()
                )
        );

        when(userRepository.findByEmail("test@example.com"))
                .thenReturn(Optional.of(user));

        when(walletRepository.findByUserIdForUpdate(1L))
                .thenReturn(Optional.of(wallet));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void activatePremium_shouldDeduct999AndActivateSubscription() {

        when(premiumSubscriptionRepository.findByUserId(1L))
                .thenReturn(Optional.empty());

        when(premiumSubscriptionRepository.save(any(PremiumSubscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        User result = premiumService.activatePremium();

        assertNotNull(result);

        assertEquals(
                new BigDecimal("501.00"),
                wallet.getBalance()
        );

        assertEquals(
                User.UserType.PREMIUM,
                user.getUserType()
        );

        verify(walletRepository)
                .findByUserIdForUpdate(1L);

        verify(walletRepository)
                .save(wallet);

        verify(userRepository)
                .save(user);

        verify(premiumSubscriptionRepository)
                .save(argThat(subscription ->
                        subscription.getUser() == user
                                && subscription.getMonthlyPrice()
                                .compareTo(new BigDecimal("999.00")) == 0
                                && subscription.getBillingCycle()
                                == PremiumSubscription.BillingCycle.MONTHLY
                                && subscription.getStatus()
                                == PremiumSubscription.SubscriptionStatus.ACTIVE
                ));
    }

    @Test
    void activatePremium_shouldRejectSecondPurchase() {

        PremiumSubscription existingSubscription =
                new PremiumSubscription();

        existingSubscription.setUser(user);
        existingSubscription.setMonthlyPrice(
                new BigDecimal("999.00")
        );
        existingSubscription.setBillingCycle(
                PremiumSubscription.BillingCycle.MONTHLY
        );
        existingSubscription.setStatus(
                PremiumSubscription.SubscriptionStatus.ACTIVE
        );

        when(premiumSubscriptionRepository.findByUserId(1L))
                .thenReturn(Optional.of(existingSubscription));

        BigDecimal balanceBefore = wallet.getBalance();

        IllegalArgumentException exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> premiumService.activatePremium()
                );

        assertEquals(
                "Premium subscription is already active.",
                exception.getMessage()
        );

        assertEquals(
                balanceBefore,
                wallet.getBalance()
        );

        verify(walletRepository)
                .findByUserIdForUpdate(1L);

        verify(walletRepository, never())
                .save(any(Wallet.class));

        verify(userRepository, never())
                .save(any(User.class));

        verify(premiumSubscriptionRepository, never())
                .save(any(PremiumSubscription.class));
    }

    @Test
    void activatePremium_shouldRejectWhenBalanceInsufficient() {

        wallet.setBalance(new BigDecimal("500.00"));

        when(premiumSubscriptionRepository.findByUserId(1L))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> premiumService.activatePremium()
                );

        assertEquals(
                "Insufficient virtual wallet balance. ₹999 is required.",
                exception.getMessage()
        );

        assertEquals(
                new BigDecimal("500.00"),
                wallet.getBalance()
        );

        verify(walletRepository)
                .findByUserIdForUpdate(1L);

        verify(walletRepository, never())
                .save(any(Wallet.class));

        verify(userRepository, never())
                .save(any(User.class));

        verify(premiumSubscriptionRepository, never())
                .save(any(PremiumSubscription.class));
    }
}