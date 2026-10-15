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

    private String cleanResponse(String response) {
        return response
                .replace("*", "")
                .replace("#", "")
                .replace("__", "")
                .replaceAll("\\[([^\\]]+)\\]\\([^\\)]+\\)", "$1")
                .trim();
    }

    public void streamResponse(String message, java.io.OutputStream outputStream) throws Exception {
        String systemPrompt = """
                You are the FXWallet Assistant.
                Help users understand FXWallet features, rates, holdings, BUY/SELL,
                profit and loss, alerts, and transactions.
                Answer in 2 to 4 short sentences unless the user asks for detail.
                Use plain text only. Never use Markdown, asterisks, hashtags, bullets,
                or other formatting symbols. Do not invent account-specific data.
                For account-specific questions, direct the user to the relevant section.
                """;

        Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of(
                        "parts", new Object[]{Map.of("text", systemPrompt)}
                ),
                "contents", new Object[]{
                        Map.of(
                                "parts", new Object[]{Map.of("text", message)}
                        )
                },
                "generationConfig", Map.of("maxOutputTokens", 256, "thinkingConfig", Map.of("thinkingLevel", "low"))
        );

        String json = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse"
                ))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", geminiApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<java.util.stream.Stream<String>> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofLines()
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("Gemini streaming API returned status {}", response.statusCode());
            writeStreamEvent(outputStream, "The FXWallet AI Assistant is currently unavailable.");
            return;
        }

        try (java.util.stream.Stream<String> lines = response.body()) {
            lines.filter(line -> line.startsWith("data:"))
                    .map(line -> line.substring(5).trim())
                    .filter(data -> !data.isEmpty())
                    .forEach(data -> {
                        try {
                            JsonNode parts = objectMapper.readTree(data)
                                    .path("candidates")
                                    .path(0)
                                    .path("content")
                                    .path("parts");

                            if (parts.isArray()) {
                                for (JsonNode part : parts) {
                                    JsonNode text = part.path("text");
                                    if (!text.isMissingNode() && !text.isNull() && !text.asText().isBlank()) {
                                        writeStreamEvent(outputStream, cleanResponse(text.asText()));
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Failed to parse Gemini streaming chunk");
                        }
                    });
        }

        outputStream.flush();
    }

    private void writeStreamEvent(java.io.OutputStream outputStream, String text) {
        try {
            String event = objectMapper.writeValueAsString(Map.of("text", text));
            outputStream.write(("data: " + event + "\n\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }
    }

    public String getResponse(String message) {
        String systemPrompt = """
                You are the FXWallet Assistant.

                FXWallet is a foreign-exchange (FX) wallet application.
                Help users understand FXWallet features, rates, holdings, BUY/SELL,
                profit and loss, alerts, and transactions.

                Answer in 2 to 4 short sentences unless the user asks for detail.
                Use plain text only. Never use Markdown, asterisks, hashtags, bullets,
                or other formatting symbols. Do not invent account-specific data.
                For account-specific questions, direct the user to the relevant section.
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
                    "generationConfig", Map.of("maxOutputTokens", 256, "thinkingConfig", Map.of("thinkingLevel", "low"))
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
                    ))
                    .timeout(Duration.ofSeconds(15))
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

            JsonNode parts = objectMapper.readTree(response.body())
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts");

            if (parts.isArray()) {
                StringBuilder answer = new StringBuilder();

                for (JsonNode part : parts) {
                    JsonNode text = part.path("text");
                    if (!text.isMissingNode() && !text.isNull() && !text.asText().isBlank()) {
                        if (answer.length() > 0) {
                            answer.append("\n");
                        }
                        answer.append(text.asText());
                    }
                }

                if (answer.length() > 0) {
                    return cleanResponse(answer.toString());
                }
            }

            log.warn("Gemini API returned no response text");
            return "Sorry, I couldn't generate a response.";

        } catch (Exception e) {
            log.error("Gemini request failed", e);
            return "The FXWallet AI Assistant is currently unavailable. Please try again shortly.";
        }
    }
}
