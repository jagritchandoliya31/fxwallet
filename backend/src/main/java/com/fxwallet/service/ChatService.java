package com.fxwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${GEMINI_API_KEY}")
    private String geminiApiKey;

    public ChatService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = objectMapper;
    }

    public String getResponse(String message) {
        String systemPrompt = """
                You are the FXWallet Assistant.

                FXWallet is a foreign-exchange (FX) wallet application.
                Help users understand:
                - Currency exchange rates
                - Portfolio and holdings
                - BUY and SELL transactions
                - Profit and loss
                - Currency alerts
                - Market and historical rates
                - FXWallet features

                Give concise, clear and helpful answers.
                Do not invent account-specific information.
                If a user asks for information that requires their actual
                account data, tell them to check the relevant FXWallet section.
                """;

        try {
            Map<String, Object> requestBody = Map.of(
                    "system_instruction", Map.of(
                            "parts", new Object[]{Map.of("text", systemPrompt)}
                    ),
                    "contents", new Object[]{
                            Map.of(
                                    "parts", new Object[]{Map.of("text", message)}
                            )
                    },
                    "generationConfig", Map.of("maxOutputTokens", 200)
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
                    ))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", geminiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Gemini API returned status {}", response.statusCode());
                return "The FXWallet AI Assistant is currently unavailable.";
            }

            JsonNode text = objectMapper.readTree(response.body())
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            if (!text.isMissingNode() && !text.isNull()) {
                return text.asText().trim();
            }

            log.warn("Gemini API returned no response text");
            return "Sorry, I couldn't generate a response.";

        } catch (Exception e) {
            log.error("Gemini request failed", e);
            return "The FXWallet AI Assistant is currently unavailable. Please try again shortly.";
        }
    }
}
