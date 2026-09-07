package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.AlertRequest;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.entity.Currency;
import com.fxwallet.entity.RateAlert;
import com.fxwallet.entity.User;
import com.fxwallet.repository.CurrencyRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.RateAlertRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public class AlertControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrencyRepository currencyRepository;

    @Autowired
    private RateAlertRepository rateAlertRepository;

    private String token;
    private User user;

    @BeforeEach
    public void setup() throws Exception {
        rateAlertRepository.deleteAll();
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
    public void createAlert_shouldCreateAndReturnAlert() throws Exception {
        AlertRequest request = new AlertRequest("USD", new BigDecimal("90"));

        mockMvc.perform(post("/api/alerts")
                .header("Authorization", authHeader())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currencyCode").value("USD"))
            .andExpect(jsonPath("$.targetRate").value(90))
            .andExpect(jsonPath("$.triggered").value(false));

        var alerts = rateAlertRepository.findByUserId(user.getId());
        assertEquals(1, alerts.size());
    }

    @Test
    public void getMyAlerts_shouldReturnEmptyListForNewUser() throws Exception {
        mockMvc.perform(get("/api/alerts")
                .header("Authorization", authHeader()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void deleteAlert_shouldRemoveAlert() throws Exception {
        Currency usd = currencyRepository.findByCode("USD").orElseThrow();
        RateAlert alert = new RateAlert();
        alert.setUser(user);
        alert.setCurrency(usd);
        alert.setTargetRate(new BigDecimal("90"));
        alert.setTriggered(false);
        rateAlertRepository.save(alert);

        mockMvc.perform(delete("/api/alerts/" + alert.getId())
                .header("Authorization", authHeader()))
            .andExpect(status().isNoContent());

        assertEquals(0, rateAlertRepository.findByUserId(user.getId()).size());
    }
}
