package com.fxwallet.repository;

import com.fxwallet.entity.RateAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RateAlertRepository extends JpaRepository<RateAlert, Long> {
    List<RateAlert> findByUserId(Long userId);
    List<RateAlert> findByUserIdAndCurrencyCode(Long userId, String currencyCode);
}
