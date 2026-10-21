package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.RateAlert;
import com.fxwallet.entity.Transaction;
import com.fxwallet.entity.User;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

    @Autowired
    private RateAlertRepository rateAlertRepository;

    @MockBean
    private com.fxwallet.service.RateService rateService;

    private String userAToken;
    private String userBToken;

    private User userA;
    private User userB;

    @BeforeEach
    public void setup() throws Exception {

        // Clean database
        rateAlertRepository.deleteAll();
        transactionRepository.deleteAll();
        holdingRepository.deleteAll();
        walletRepository.deleteAll();
        userRepository.deleteAll();
        currencyRepository.deleteAll();

        // Create USD currency
        Currency usd = new Currency();
        usd.setCode("USD");
        usd.setName("US Dollar");
        usd.setSymbol("$");
        usd.setActive(true);

        currencyRepository.save(usd);

        // -----------------------------
        // Register User A
        // -----------------------------
        RegisterRequest userARegister =
                new RegisterRequest(
                        "User A",
                        "usera@example.com",
                        "password123"
                );

        String userAResponse =
                mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userARegister)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").exists())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

        // Registration already returns JWT.
        userAToken = objectMapper
                .readTree(userAResponse)
                .get("token")
                .asText();

        // -----------------------------
        // Register User B
        // -----------------------------
        RegisterRequest userBRegister =
                new RegisterRequest(
                        "User B",
                        "userb@example.com",
                        "password456"
                );

        String userBResponse =
                mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userBRegister)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").exists())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

        // Registration already returns JWT.
        userBToken = objectMapper
                .readTree(userBResponse)
                .get("token")
                .asText();

        // Fetch users from DB
        userA = userRepository
                .findByEmail("usera@example.com")
                .orElseThrow();

        userB = userRepository
                .findByEmail("userb@example.com")
                .orElseThrow();

        // Mock exchange rate
        Mockito.when(rateService.getCurrentRate("USD"))
                .thenReturn(new BigDecimal("85"));
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
    public void users_shouldOnlySeeTheirOwnTransactions() throws Exception {

        Currency usd =
                currencyRepository
                        .findByCode("USD")
                        .orElseThrow();

        Transaction bTransaction = new Transaction();

        bTransaction.setUser(userB);
        bTransaction.setCurrency(usd);
        bTransaction.setType(Transaction.Type.BUY);
        bTransaction.setInrAmount(new BigDecimal("1000"));
        bTransaction.setQuantity(new BigDecimal("10"));
        bTransaction.setExchangeRate(new BigDecimal("85"));
        bTransaction.setRealizedPl(BigDecimal.ZERO);
        bTransaction.setPlatformFee(BigDecimal.ONE);

        transactionRepository.save(bTransaction);

        // User A should see zero transactions
        mockMvc.perform(get("/api/transactions")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isEmpty());

        // User B should see his transaction
        mockMvc.perform(get("/api/transactions")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    public void users_shouldOnlySeeTheirOwnPortfolio() throws Exception {

        Currency usd =
                currencyRepository
                        .findByCode("USD")
                        .orElseThrow();

        Holding holding =
                new Holding(
                        null,
                        userB,
                        usd,
                        new BigDecimal("25"),
                        new BigDecimal("85"),
                        null,
                        null
                );

        holdingRepository.save(holding);

        // User A should see empty portfolio
        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.holdings").isEmpty());

        // User B should see his USD holding
        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader(userBToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.holdings.length()").value(1))
            .andExpect(jsonPath("$.holdings[0].code").value("USD"));
    }

    @Test
    public void users_shouldNotDeleteAnotherUsersAlert() throws Exception {

        Currency usd =
                currencyRepository
                        .findByCode("USD")
                        .orElseThrow();

        RateAlert alert = new RateAlert();

        alert.setUser(userB);
        alert.setCurrency(usd);
        alert.setTargetRate(new BigDecimal("90"));
        alert.setTriggered(false);

        rateAlertRepository.save(alert);

        // User A tries to delete User B's alert.
        // Should be rejected because alert belongs to User B.
        mockMvc.perform(delete("/api/alerts/" + alert.getId())
                .header("Authorization", authHeader(userAToken)))
            .andExpect(status().isNotFound());

        // User B's alert must still exist.
        assertEquals(
                1,
                rateAlertRepository
                        .findByUserId(userB.getId())
                        .size()
        );
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