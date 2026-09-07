package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.Transaction;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.TransactionRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public class TransactionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private CurrencyRepository currencyRepository;

    @Autowired
    private HoldingRepository holdingRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @MockBean
    private com.fxwallet.service.RateService rateService;

    private String token;
    private User user;
    private Currency usd;

    @BeforeEach
    public void setup() throws Exception {
        transactionRepository.deleteAll();
        holdingRepository.deleteAll();
        walletRepository.deleteAll();
        userRepository.deleteAll();
        currencyRepository.deleteAll();

        Currency usdCurrency = new Currency();
        usdCurrency.setCode("USD");
        usdCurrency.setName("US Dollar");
        usdCurrency.setSymbol("$");
        usdCurrency.setActive(true);
        currencyRepository.save(usdCurrency);

        RegisterRequest registerRequest = new RegisterRequest("John Doe", "john@example.com", "password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isOk());

        user = userRepository.findByEmail("john@example.com").orElseThrow();
        usd = usdCurrency;

        LoginRequest loginRequest = new LoginRequest("john@example.com", "password123");
        String response = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        token = objectMapper.readTree(response).get("token").asText();

        Mockito.when(rateService.getCurrentRate("USD")).thenReturn(new BigDecimal("85"));
    }

    private String authHeader() {
        return "Bearer " + token;
    }

    @Test
    public void buy_shouldCreateHoldingAndTransaction() throws Exception {
        String requestBody = "{\"currencyCode\":\"USD\",\"amountInr\":10000}";

        mockMvc.perform(post("/api/transactions/buy")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.type").value("BUY"))
            .andExpect(jsonPath("$.currencyCode").value("USD"))
            .andExpect(jsonPath("$.inrAmount").value(10000));

        var holdings = holdingRepository.findByUserId(user.getId());
        assertEquals(1, holdings.size());

        var transactions = transactionRepository.findByUserIdOrderByTimestampDesc(user.getId(), org.springframework.data.domain.PageRequest.of(0, 10));
        assertEquals(1, transactions.getContent().size());
        assertEquals(Transaction.Type.BUY, transactions.getContent().get(0).getType());
    }

    @Test
    public void buy_shouldFailWithInsufficientBalance() throws Exception {
        String requestBody = "{\"currencyCode\":\"USD\",\"amountInr\":999999}";

        mockMvc.perform(post("/api/transactions/buy")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Insufficient wallet balance"));
    }

    @Test
    public void sell_shouldUpdateWalletAndHolding() throws Exception {
        holdingRepository.save(new Holding(null, user, usd, new BigDecimal("100"), new BigDecimal("85"), null, null));

        String requestBody = "{\"currencyCode\":\"USD\",\"quantity\":50}";

        mockMvc.perform(post("/api/transactions/sell")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.type").value("SELL"))
            .andExpect(jsonPath("$.currencyCode").value("USD"));

        var holdings = holdingRepository.findByUserId(user.getId());
        assertEquals(1, holdings.size());
        assertEquals(new BigDecimal("50.000000"), holdings.get(0).getQuantity());
    }

    @Test
    public void sell_shouldFailWithInsufficientHoldings() throws Exception {
        String requestBody = "{\"currencyCode\":\"USD\",\"quantity\":50}";

        mockMvc.perform(post("/api/transactions/sell")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("No holdings found for USD"));
    }

    @Test
    public void getTransactions_shouldReturnUserTransactions() throws Exception {
        mockMvc.perform(get("/api/transactions")
                .header("Authorization", authHeader()))
            .andExpect(status().isOk());
    }
}
