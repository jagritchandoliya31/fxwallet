package com.fxwallet.dto;

public record MfaResponse(
    boolean mfaRequired,
    String email,
    String name
) {}
