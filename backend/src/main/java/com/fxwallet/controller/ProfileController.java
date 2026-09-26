package com.fxwallet.controller;

import com.fxwallet.dto.ProfileResponse;
import com.fxwallet.service.ProfileService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile() {
        return ResponseEntity.ok(profileService.getProfile());
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String phoneNo) {

        return ResponseEntity.ok(
                profileService.updateProfile(name, username, phoneNo)
        );
    }

    @PostMapping(
            value = "/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<String> uploadProfileImage(
            @RequestParam("file") MultipartFile file) {

        profileService.updateProfileImage(file);

        return ResponseEntity.ok("Profile image uploaded successfully");
    }

    @GetMapping("/image")
    public ResponseEntity<byte[]> getProfileImage() {

        byte[] image = profileService.getProfileImage();
        String contentType = profileService.getProfileImageType();

        MediaType mediaType = MediaType.parseMediaType(contentType);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(image);
    }
}