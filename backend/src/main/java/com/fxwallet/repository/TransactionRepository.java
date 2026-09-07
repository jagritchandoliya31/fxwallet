package com.fxwallet.repository;

import com.fxwallet.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Page<Transaction> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
    List<Transaction> findByUserIdAndTimestampBetweenOrderByTimestampDesc(Long userId, LocalDateTime from, LocalDateTime to);
    Page<Transaction> findByUserIdAndCurrencyCodeOrderByTimestampDesc(Long userId, String currencyCode, Pageable pageable);
    Page<Transaction> findByUserIdAndTypeOrderByTimestampDesc(Long userId, Transaction.Type type, Pageable pageable);
}
