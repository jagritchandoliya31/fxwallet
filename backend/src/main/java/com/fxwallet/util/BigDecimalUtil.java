package com.fxwallet.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class BigDecimalUtil {
    private static final int DEFAULT_SCALE = 4;
    private static final int HIGH_SCALE = 6;

    public static BigDecimal scale(BigDecimal value) {
        return value.setScale(DEFAULT_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal scaleHigh(BigDecimal value) {
        return value.setScale(HIGH_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal divide(BigDecimal a, BigDecimal b) {
        if (b.equals(BigDecimal.ZERO)) {
            throw new ArithmeticException("Division by zero");
        }
        return a.divide(b, DEFAULT_SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal multiply(BigDecimal a, BigDecimal b) {
        return a.multiply(b).setScale(DEFAULT_SCALE, RoundingMode.HALF_UP);
    }
}
