package com.fxwallet.controller;

import com.fxwallet.dto.ChatRequest;
import com.fxwallet.dto.ChatResponse;
import com.fxwallet.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
}