package com.fxwallet.repository;

import com.fxwallet.entity.PremiumSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PremiumSubscriptionRepository
        extends JpaRepository<PremiumSubscription, Long> {

    Optional<PremiumSubscription> findByUserId(Long userId);
}