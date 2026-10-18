package com.fxwallet.repository;

import com.fxwallet.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(
            Long userId,
            OtpVerification.Purpose purpose
    );
}
