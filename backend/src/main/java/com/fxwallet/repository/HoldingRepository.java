package com.fxwallet.repository;

import com.fxwallet.entity.Holding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {
    List<Holding> findByUserId(Long userId);
    Optional<Holding> findByUserIdAndCurrencyCode(Long userId, String currencyCode);
    boolean existsByUserIdAndCurrencyCode(Long userId, String currencyCode);
}
