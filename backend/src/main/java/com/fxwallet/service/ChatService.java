package com.fxwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${GEMINI_API_KEY}")
    private String geminiApiKey;

    public ChatService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newHttpClient();
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
                            "parts", new Object[]{
                                    Map.of(
                                            "text", systemPrompt
                                    )
                            }
                    ),
                    "contents", new Object[]{
                            Map.of(
                                    "parts", new Object[]{
                                            Map.of(
                                                    "text", message
                                            )
                                    }
                            )
                    },
                    "generationConfig", Map.of(
                            
                            "maxOutputTokens", 200
                    )
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
                    ))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", geminiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() < 200 ||
                    response.statusCode() >= 300) {

                System.err.println(
                        "Gemini API error: "
                                + response.statusCode()
                                + " "
                                + response.body()
                );

                return "The FXWallet AI Assistant is currently unavailable.";
            }

            JsonNode root = objectMapper.readTree(response.body());

            JsonNode text = root
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            if (!text.isMissingNode() && !text.isNull()) {
                return text.asText().trim();
            }

            return "Sorry, I couldn't generate a response.";

        } catch (Exception e) {

            e.printStackTrace();

            return "The FXWallet AI Assistant is currently unavailable. Please try again shortly.";
        }
    }
}