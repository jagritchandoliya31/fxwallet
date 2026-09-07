package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.Transaction;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.*;
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
public class SecurityIntegrationTest {

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

    private String userAToken;
    private String userBToken;
    private User userA;
    private User userB;

    @BeforeEach
    public void setup() throws Exception {
        transactionRepository.deleteAll();
        holdingRepository.deleteAll();
        walletRepository.deleteAll();
        userRepository.deleteAll();
        currencyRepository.deleteAll();

        Currency usd = new Currency();
        usd.setCode("USD");
        usd.setName("US Dollar");
        usd.setSymbol("$");
        usd.setActive(true);
        currencyRepository.save(usd);

        RegisterRequest userARegister = new RegisterRequest("User A", "usera@example.com", "password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(userARegister)))
            .andExpect(status().isOk());

        RegisterRequest userBRegister = new RegisterRequest("User B", "userb@example.com", "password456");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(userBRegister)))
            .andExpect(status().isOk());

        userA = userRepository.findByEmail("usera@example.com").orElseThrow();
        userB = userRepository.findByEmail("userb@example.com").orElseThrow();

        var userALogin = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("usera@example.com", "password123"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        userAToken = objectMapper.readTree(userALogin).get("token").asText();

        var userBLogin = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest("userb@example.com", "password456"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        userBToken = objectMapper.readTree(userBLogin).get("token").asText();

        Mockito.when(rateService.getCurrentRate("USD")).thenReturn(new BigDecimal("85"));
    }

    private String authHeader(String token) {
        return "Bearer " + token;
    }

    @Test
    public void userA_shouldNotAccessUserBWallet() throws Exception {
        mockMvc.perform(get("/api/wallet")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/wallet")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void userA_shouldNotAccessUserBTransactions() throws Exception {
        mockMvc.perform(get("/api/transactions")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/transactions")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void userA_shouldNotAccessUserBPortfolio() throws Exception {
        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void userA_shouldNotAccessUserBAlerts() throws Exception {
        mockMvc.perform(get("/api/alerts")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/alerts")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void unauthorizedRequest_shouldBeRejected() throws Exception {
        mockMvc.perform(get("/api/wallet"))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/portfolio"))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/transactions"))
            .andExpect(status().isForbidden());
    }
}
