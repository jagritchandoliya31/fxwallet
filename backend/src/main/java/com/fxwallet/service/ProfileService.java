package com.fxwallet.service;

import com.fxwallet.dto.ProfileResponse;
import com.fxwallet.entity.User;
import com.fxwallet.entity.Wallet;
import com.fxwallet.repository.UserRepository;
import com.fxwallet.repository.WalletRepository;
import com.fxwallet.exception.ResourceNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    public ProfileService(
            UserRepository userRepository,
            WalletRepository walletRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile() {

        User user = getCurrentUser();

        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Wallet not found"));

        String profileImageUrl = user.getProfileImage() != null
                ? "/api/profile/image"
                : null;

        return new ProfileResponse(
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNo(),
                wallet.getBalance(),
                wallet.getCurrency(),
                user.getUserType() != null
                        ? user.getUserType().name()
                        : "NORMAL",
                profileImageUrl
        );
    }

    @Transactional
    public ProfileResponse updateProfile(
            String name,
            String username,
            String phoneNo) {

        User user = getCurrentUser();

        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }

        if (username != null && !username.isBlank()) {
            user.setUsername(username.trim());
        }

        if (phoneNo != null) {
            user.setPhoneNo(phoneNo.trim());
        }

        userRepository.save(user);

        return getProfile();
    }

    @Transactional
    public void updateProfileImage(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Profile image is required");
        }

        String contentType = file.getContentType();

        if (contentType == null ||
                (!contentType.equalsIgnoreCase("image/jpeg")
                        && !contentType.equalsIgnoreCase("image/png"))) {

            throw new IllegalArgumentException(
                    "Only JPG and PNG profile images are allowed");
        }

        try {
            User user = getCurrentUser();

            user.setProfileImage(file.getBytes());
            user.setProfileImageType(contentType);

            userRepository.save(user);

        } catch (IOException e) {
            throw new IllegalArgumentException(
                    "Failed to upload profile image", e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] getProfileImage() {

        User user = getCurrentUser();

        if (user.getProfileImage() == null) {
            throw new ResourceNotFoundException(
                    "Profile image not found");
        }

        return user.getProfileImage();
    }

    @Transactional(readOnly = true)
    public String getProfileImageType() {

        User user = getCurrentUser();

        return user.getProfileImageType() != null
                ? user.getProfileImageType()
                : "image/jpeg";
    }

    private User getCurrentUser() {

        String email = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));
    }
}