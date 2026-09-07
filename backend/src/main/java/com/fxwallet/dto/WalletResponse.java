package com.fxwallet.dto;

import java.math.BigDecimal;

public record WalletResponse(
    BigDecimal balance,
    String currency
) {}
