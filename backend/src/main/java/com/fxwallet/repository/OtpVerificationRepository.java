package com.fxwallet.repository;

import com.fxwallet.entity.OtpVerification;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(
            Long userId,
            OtpVerification.Purpose purpose
    );

    /*
     * Pessimistic database lock.
     *
     * When an OTP is being verified, the selected row is locked
     * until the current transaction completes.
     *
     * This prevents two simultaneous requests from successfully
     * consuming the same OTP.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT o
            FROM OtpVerification o
            WHERE o.user.id = :userId
              AND o.purpose = :purpose
              AND o.used = false
            ORDER BY o.createdAt DESC
            """)
    Optional<OtpVerification> findLatestUnusedForUpdate(
            @Param("userId") Long userId,
            @Param("purpose") OtpVerification.Purpose purpose
    );

    /*
     * OTP request rate limiting.
     */
    long countByUserIdAndPurposeAndCreatedAtAfter(
            Long userId,
            OtpVerification.Purpose purpose,
            LocalDateTime after
    );
}