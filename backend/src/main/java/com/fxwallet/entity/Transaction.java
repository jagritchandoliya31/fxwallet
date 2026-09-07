package com.fxwallet.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_user_id", columnList = "user_id"),
    @Index(name = "idx_transactions_currency_id", columnList = "currency_id"),
    @Index(name = "idx_transactions_type", columnList = "type"),
    @Index(name = "idx_transactions_timestamp", columnList = "timestamp")
})
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "currency_id", nullable = false)
    private Currency currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Type type;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal inrAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal exchangeRate = BigDecimal.ZERO;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal realizedPl = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }

    public Transaction() {}

    public Transaction(Long id, User user, Currency currency, Type type, BigDecimal inrAmount, BigDecimal quantity, BigDecimal exchangeRate, BigDecimal realizedPl, LocalDateTime timestamp) {
        this.id = id;
        this.user = user;
        this.currency = currency;
        this.type = type;
        this.inrAmount = inrAmount;
        this.quantity = quantity;
        this.exchangeRate = exchangeRate;
        this.realizedPl = realizedPl;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Currency getCurrency() { return currency; }
    public void setCurrency(Currency currency) { this.currency = currency; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public BigDecimal getInrAmount() { return inrAmount; }
    public void setInrAmount(BigDecimal inrAmount) { this.inrAmount = inrAmount; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }
    public BigDecimal getRealizedPl() { return realizedPl; }
    public void setRealizedPl(BigDecimal realizedPl) { this.realizedPl = realizedPl; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public enum Type {
        BUY, SELL
    }
}
