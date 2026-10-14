package com.fxwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Service
public class ChatService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ChatService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    public String getResponse(String message) {

        String systemPrompt = """
                You are the FXWallet Assistant.

                FXWallet is a foreign-exchange wallet application.
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
                    "model", "qwen3:8b",
                    "stream", false,
                    "think", false,
                    "options", Map.of(
                            "temperature", 0.3,
                            "num_predict", 200
                    ),
                    "messages", new Object[]{
                            Map.of(
                                    "role", "system",
                                    "content", systemPrompt
                            ),
                            Map.of(
                                    "role", "user",
                                    "content", message
                            )
                    }
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:11434/api/chat"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return "The FXWallet AI Assistant is currently unavailable.";
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("message").path("content");

            if (!content.isMissingNode() && !content.isNull()) {
                return content.asText().trim();
            }

            return "Sorry, I couldn't generate a response.";

        } catch (Exception e) {
            return "The FXWallet AI Assistant is currently unavailable. Please try again shortly.";
        }
    }
}