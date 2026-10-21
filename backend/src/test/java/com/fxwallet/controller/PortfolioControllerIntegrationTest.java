package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.User;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.service.RateService;

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

import static org.hamcrest.Matchers.nullValue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public class PortfolioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrencyRepository currencyRepository;

    @Autowired
    private HoldingRepository holdingRepository;

    @MockBean
    private RateService rateService;

    private String token;
    private User user;

    @BeforeEach
    public void setup() throws Exception {

        holdingRepository.deleteAll();
        userRepository.deleteAll();
        currencyRepository.deleteAll();

        Currency usd = new Currency();
        usd.setCode("USD");
        usd.setName("US Dollar");
        usd.setSymbol("$");
        usd.setActive(true);

        currencyRepository.save(usd);

        RegisterRequest registerRequest =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        String registerResponse =
                mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                registerRequest
                                        )
                                )
                )
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        user = userRepository
                .findByEmail("john@example.com")
                .orElseThrow();

        token = objectMapper
                .readTree(registerResponse)
                .get("token")
                .asText();
    }

    private String authHeader() {
        return "Bearer " + token;
    }

    @Test
    public void getPortfolio_shouldReturnEmptyPortfolioForNewUser()
            throws Exception {

        mockMvc.perform(
                get("/api/portfolio")
                        .header("Authorization", authHeader())
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalPortfolioValue").value(0))
        .andExpect(jsonPath("$.holdings").isArray())
        .andExpect(jsonPath("$.holdings").isEmpty());
    }

    @Test
    public void getPortfolio_shouldReturnHoldings()
            throws Exception {

        Currency usd =
                currencyRepository
                        .findByCode("USD")
                        .orElseThrow();

        Holding holding =
                new Holding(
                        null,
                        user,
                        usd,
                        new BigDecimal("100"),
                        new BigDecimal("85"),
                        null,
                        null
                );

        holdingRepository.save(holding);

        mockMvc.perform(
                get("/api/portfolio")
                        .header("Authorization", authHeader())
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.holdings").isArray())
        .andExpect(jsonPath("$.holdings[0].code").value("USD"))
        .andExpect(jsonPath("$.holdings[0].quantity").value(100));
    }

    @Test
    public void getPortfolio_shouldMarkValuationUnavailableWhenRateMissing()
            throws Exception {

        Mockito.when(
                rateService.getCurrentRate("USD")
        ).thenReturn(null);

        Currency usd =
                currencyRepository
                        .findByCode("USD")
                        .orElseThrow();

        Holding holding =
                new Holding(
                        null,
                        user,
                        usd,
                        new BigDecimal("100"),
                        new BigDecimal("85"),
                        null,
                        null
                );

        holdingRepository.save(holding);

        mockMvc.perform(
                get("/api/portfolio")
                        .header("Authorization", authHeader())
        )
        .andExpect(status().isOk())
        .andExpect(
                jsonPath("$.totalPortfolioValue")
                        .value(nullValue())
        )
        .andExpect(
                jsonPath("$.totalInvested")
                        .value(8500)
        )
        .andExpect(
                jsonPath("$.totalProfitLoss")
                        .value(nullValue())
        )
        .andExpect(
                jsonPath("$.holdings[0].quantity")
                        .value(100)
        )
        .andExpect(
                jsonPath("$.holdings[0].currentValue")
                        .value(nullValue())
        )
        .andExpect(
                jsonPath("$.holdings[0].profitLoss")
                        .value(nullValue())
        );
    }
}