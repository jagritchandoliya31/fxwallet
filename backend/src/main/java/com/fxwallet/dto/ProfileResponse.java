package com.fxwallet.dto;

import java.math.BigDecimal;

public record ProfileResponse(
        String name,
        String username,
        String email,
        String phoneNo,
        BigDecimal balance,
        String currency,
        String userType,
        String profileImageUrl
) {}