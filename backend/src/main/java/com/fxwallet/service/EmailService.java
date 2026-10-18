package com.fxwallet.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Service
public class EmailService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String fromEmail;

    public EmailService(
            ObjectMapper objectMapper,
            @Value("${resend.api-key:}") String apiKey,
            @Value("${resend.from-email:onboarding@resend.dev}") String fromEmail) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public void sendOtp(String to, String subject, String otp, String purpose) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Resend email service is not configured. Please set RESEND_API_KEY.");
        }

        try {
            String html = """
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
                      <h2 style="color:#1d4ed8">FXWallet</h2>
                      <p>Your %s verification code is:</p>
                      <div style="font-size:36px;font-weight:800;letter-spacing:10px;margin:24px 0">%s</div>
                      <p>This verification code expires in <strong>5 minutes</strong>.</p>
                      <p style="color:#64748b;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
                    </div>
                    """.formatted(purpose, otp);

            Map<String, Object> payload = Map.of(
                    "from", fromEmail,
                    "to", new String[]{to},
                    "subject", subject,
                    "html", html
            );

            String body = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Resend email delivery failed (" + response.statusCode() + "): " + response.body());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Resend email delivery was interrupted.", e);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to send verification email through Resend.", e);
        }
    }
}
