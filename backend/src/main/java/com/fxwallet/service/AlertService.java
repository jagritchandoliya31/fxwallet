package com.fxwallet.service;

import com.fxwallet.dto.AlertRequest;
import com.fxwallet.dto.AlertResponse;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateAlert;
import com.fxwallet.entity.User;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.RateAlertRepository;
import com.fxwallet.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AlertService {
    private final RateAlertRepository rateAlertRepository;
    private final CurrencyRepository currencyRepository;
    private final RateService rateService;
    private final UserRepository userRepository;

    public AlertService(RateAlertRepository rateAlertRepository, CurrencyRepository currencyRepository,
                        RateService rateService, UserRepository userRepository) {
        this.rateAlertRepository = rateAlertRepository;
        this.currencyRepository = currencyRepository;
        this.rateService = rateService;
        this.userRepository = userRepository;
    }

    @Transactional
    public AlertResponse createAlert(AlertRequest request) {
        User user = getCurrentUser();
        Currency currency = currencyRepository.findByCode(request.currencyCode().toUpperCase())
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("Currency not found: " + request.currencyCode()));

        RateAlert alert = new RateAlert();
        alert.setUser(user);
        alert.setCurrency(currency);
        alert.setTargetRate(request.targetRate());
        alert.setTriggered(false);
        rateAlertRepository.save(alert);
        return toResponse(alert);
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getMyAlerts() {
        User user = getCurrentUser();
        return rateAlertRepository.findByUserId(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAlert(Long alertId) {
        RateAlert alert = rateAlertRepository.findById(alertId)
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("Alert not found"));
        if (!alert.getUser().getId().equals(getCurrentUser().getId())) {
            throw new com.fxwallet.exception.ResourceNotFoundException("Alert not found");
        }
        rateAlertRepository.delete(alert);
    }

    @Transactional
    @Scheduled(fixedRate = 300000)
    public void checkAndTriggerAllAlerts() {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            checkAndTriggerAlertsForUser(user);
        }
    }

    private void checkAndTriggerAlertsForUser(User user) {
        List<RateAlert> alerts = rateAlertRepository.findByUserId(user.getId());
        for (RateAlert alert : alerts) {
            if (alert.isTriggered()) continue;
            java.math.BigDecimal currentRate = rateService.getCurrentRate(alert.getCurrency().getCode());
            if (currentRate.compareTo(alert.getTargetRate()) >= 0) {
                alert.setTriggered(true);
                rateAlertRepository.save(alert);
            }
        }
    }

    private AlertResponse toResponse(RateAlert alert) {
        return new AlertResponse(
                alert.getId(),
                alert.getCurrency().getCode(),
                alert.getCurrency().getName(),
                alert.getTargetRate(),
                alert.isTriggered()
        );
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new com.fxwallet.exception.ResourceNotFoundException("User not found"));
    }
}
