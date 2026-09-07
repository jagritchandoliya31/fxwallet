package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.Holding;
import com.fxwallet.entity.User;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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

        RegisterRequest registerRequest = new RegisterRequest("John Doe", "john@example.com", "password123");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isOk());

        user = userRepository.findByEmail("john@example.com").orElseThrow();

        var loginResponse = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new com.fxwallet.dto.LoginRequest("john@example.com", "password123"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        token = objectMapper.readTree(loginResponse).get("token").asText();
    }

    private String authHeader() {
        return "Bearer " + token;
    }

    @Test
    public void getPortfolio_shouldReturnEmptyPortfolioForNewUser() throws Exception {
        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPortfolioValue").value(0))
            .andExpect(jsonPath("$.holdings").isArray())
            .andExpect(jsonPath("$.holdings").isEmpty());
    }

    @Test
    public void getPortfolio_shouldReturnHoldings() throws Exception {
        Currency usd = currencyRepository.findByCode("USD").orElseThrow();
        holdingRepository.save(new Holding(null, user, usd, new BigDecimal("100"), new BigDecimal("85"), null, null));

        mockMvc.perform(get("/api/portfolio")
                .header("Authorization", authHeader()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.holdings").isArray())
            .andExpect(jsonPath("$.holdings[0].code").value("USD"))
            .andExpect(jsonPath("$.holdings[0].quantity").value(100));
    }
}
