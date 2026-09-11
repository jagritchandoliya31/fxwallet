package com.fxwallet.controller;

import com.fxwallet.dto.TransactionResponse;
import com.fxwallet.entity.Transaction;
import com.fxwallet.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("timestamp", "amount", "quantity", "currency", "type");
    private static final Map<String, String> SORT_FIELD_MAP = Map.of(
            "timestamp", "timestamp",
            "amount", "inrAmount",
            "quantity", "quantity",
            "currency", "currency.code",
            "type", "type"
    );

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/buy")
    public ResponseEntity<TransactionResponse> buy(@Valid @RequestBody com.fxwallet.dto.BuyRequest request) {
        return ResponseEntity.ok(transactionService.buy(request));
    }

    @PostMapping("/sell")
    public ResponseEntity<TransactionResponse> sell(@Valid @RequestBody com.fxwallet.dto.SellRequest request) {
        return ResponseEntity.ok(transactionService.sell(request));
    }

    @GetMapping
    public ResponseEntity<Page<TransactionResponse>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must be greater than or equal to 0");
        }
        if (size < 1) {
            throw new IllegalArgumentException("Size must be greater than 0");
        }
        if (sortBy == null || sortBy.isBlank()) {
            sortBy = "timestamp";
        }
        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Invalid sort field: " + sortBy);
        }
        String sortProperty = SORT_FIELD_MAP.get(sortBy);
        if (!direction.equalsIgnoreCase("ASC") && !direction.equalsIgnoreCase("DESC")) {
            throw new IllegalArgumentException("Direction must be either ASC or DESC");
        }
        Sort sort = direction.equalsIgnoreCase("ASC") ? Sort.by(sortProperty).ascending() : Sort.by(sortProperty).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(transactionService.getTransactions(pageable));
    }
}
