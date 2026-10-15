package com.fxwallet.controller;

import com.fxwallet.dto.ChatRequest;
import com.fxwallet.dto.ChatResponse;
import com.fxwallet.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request) {

        String response = chatService.getResponse(request.message());

        return ResponseEntity.ok(new ChatResponse(response));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> stream(
            @Valid @RequestBody ChatRequest request) {

        StreamingResponseBody body = outputStream -> {
            try {
                chatService.streamResponse(request.message(), outputStream);
            } catch (Exception e) {
                outputStream.write(("data: {\"text\":\"The FXWallet AI Assistant is currently unavailable.\"}\n\n")
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
                outputStream.flush();
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(body);
    }
}