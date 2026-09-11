package com.fxwallet.service;

import com.fxwallet.dto.AlertRequest;
import com.fxwallet.dto.AlertResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateAlert;
import com.fxwallet.entity.User;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateAlertRepository;
import com.fxwallet.repository.UserRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AlertServiceTest {

    @Mock
    private RateAlertRepository rateAlertRepository;

    @Mock
    private CurrencyRepository currencyRepository;

    @Mock
    private RateService rateService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AlertService alertService;

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
    public void createAlert_shouldSaveAlert() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        AlertRequest request = new AlertRequest("USD", new BigDecimal("90"));
        AlertResponse response = alertService.createAlert(request);

        assertEquals("USD", response.currencyCode());
        assertEquals(new BigDecimal("90"), response.targetRate());
        assertFalse(response.triggered());
        verify(rateAlertRepository).save(any(RateAlert.class));
    }

    @Test
    public void getMyAlerts_shouldReturnUserAlerts() {
        Currency currency = new Currency();
        currency.setCode("USD");
        currency.setName("US Dollar");

        RateAlert alert = new RateAlert();
        alert.setId(1L);
        alert.setUser(new User());
        alert.setCurrency(currency);
        alert.setTargetRate(new BigDecimal("90"));
        alert.setTriggered(false);

        when(rateAlertRepository.findByUserId(1L)).thenReturn(List.of(alert));

        List<AlertResponse> alerts = alertService.getMyAlerts();

        assertEquals(1, alerts.size());
        assertEquals("USD", alerts.get(0).currencyCode());
    }

    @Test
    public void createAlert_shouldRejectDuplicateActiveAlert() {
        Currency currency = new Currency();
        currency.setId(1L);
        currency.setCode("USD");
        currency.setName("US Dollar");
        when(currencyRepository.findByCode("USD")).thenReturn(Optional.of(currency));

        RateAlert existingAlert = new RateAlert();
        existingAlert.setId(1L);
        existingAlert.setUser(new User());
        existingAlert.setCurrency(currency);
        existingAlert.setTargetRate(new BigDecimal("90"));
        existingAlert.setTriggered(false);
        when(rateAlertRepository.findByUserIdAndCurrencyCode(1L, "USD"))
                .thenReturn(List.of(existingAlert));

        assertThrows(IllegalArgumentException.class,
                () -> alertService.createAlert(new AlertRequest("USD", new BigDecimal("95"))));
        verify(rateAlertRepository, never()).save(any(RateAlert.class));
    }

    @Test
    public void deleteAlert_shouldDeleteWhenOwned() {
        RateAlert alert = new RateAlert();
        alert.setId(1L);
        User user = new User();
        user.setId(1L);
        alert.setUser(user);

        when(rateAlertRepository.findById(1L)).thenReturn(Optional.of(alert));

        alertService.deleteAlert(1L);

        verify(rateAlertRepository).delete(alert);
    }
}
