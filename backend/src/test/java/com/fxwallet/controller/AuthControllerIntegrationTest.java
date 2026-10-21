package com.fxwallet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fxwallet.dto.LoginRequest;
import com.fxwallet.dto.RegisterRequest;
import com.fxwallet.repository.HoldingRepository;
import com.fxwallet.repository.OtpVerificationRepository;
import com.fxwallet.repository.RateAlertRepository;
import com.fxwallet.repository.TransactionRepository;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import com.fxwallet.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
public class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private HoldingRepository holdingRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private RateAlertRepository rateAlertRepository;

    @Autowired
    private OtpVerificationRepository otpVerificationRepository;

    @MockBean
    private EmailService emailService;

    @BeforeEach
    public void setup() {
        rateAlertRepository.deleteAll();
        transactionRepository.deleteAll();
        holdingRepository.deleteAll();
        walletRepository.deleteAll();
        otpVerificationRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    public void register_shouldCreateUserAndReturnToken() throws Exception {
        RegisterRequest request =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.name").value("John Doe"))
            .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    public void register_shouldRejectDuplicateEmail() throws Exception {
        RegisterRequest request1 =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        RegisterRequest request2 =
                new RegisterRequest(
                        "Jane Doe",
                        "john@example.com",
                        "password456"
                );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message")
                    .value("Email already registered"));
    }

    @Test
    public void login_shouldSendOtpForValidCredentials() throws Exception {
        RegisterRequest registerRequest =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isOk());

        LoginRequest loginRequest =
                new LoginRequest(
                        "john@example.com",
                        "password123"
                );

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mfaRequired").value(true))
            .andExpect(jsonPath("$.email")
                    .value("john@example.com"))
            .andExpect(jsonPath("$.name")
                    .value("John Doe"));
    }

    @Test
    public void login_shouldRejectInvalidCredentials() throws Exception {
        LoginRequest loginRequest =
                new LoginRequest(
                        "nonexistent@example.com",
                        "wrongpassword"
                );

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message")
                    .value("Invalid email or password"));
    }

    @Test
    public void loginWithOtp_shouldSendOtpForValidEmail() throws Exception {
        RegisterRequest registerRequest =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login-with-otp")
                .param("email", "john@example.com"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mfaRequired").value(true))
            .andExpect(jsonPath("$.email")
                    .value("john@example.com"));
    }

    @Test
    public void verifyOtp_shouldRejectInvalidOtp() throws Exception {
        RegisterRequest registerRequest =
                new RegisterRequest(
                        "John Doe",
                        "john@example.com",
                        "password123"
                );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login-with-otp")
                .param("email", "john@example.com"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/verify-otp")
                .param("email", "john@example.com")
                .param("otp", "000000"))
            .andExpect(status().isUnauthorized());
    }
}