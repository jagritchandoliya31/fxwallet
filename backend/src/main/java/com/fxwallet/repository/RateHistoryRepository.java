package com.fxwallet.repository;

import com.fxwallet.entity.RateHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface RateHistoryRepository extends JpaRepository<RateHistory, Long> {
    List<RateHistory> findByCurrencyCodeOrderByTimestampAsc(String currencyCode);
    List<RateHistory> findByCurrencyCodeOrderByTimestampDesc(String currencyCode);
    List<RateHistory> findByCurrencyCodeAndTimestampBetweenOrderByTimestampAsc(String currencyCode, LocalDateTime from, LocalDateTime to);
}
