package com.sanitaryware.crm.service;

import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.entity.User;
import com.sanitaryware.crm.exception.ResourceNotFoundException;
import com.sanitaryware.crm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessControlService {

    private final UserRepository userRepository;

    public User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException("Authentication is required");
        }

        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public boolean isSales(User user) {
        return user != null && user.getRole() == User.UserRole.SALES;
    }

    public void requireOrderAccess(Order order) {
        User currentUser = currentUser();
        if (isSales(currentUser) && !isOwner(order.getCreatedBy(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to access or modify this order.");
        }
    }

    public void requireQuotationAccess(Quotation quotation) {
        User currentUser = currentUser();
        if (isSales(currentUser) && !isOwner(quotation.getCreatedBy(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to access or modify this quotation.");
        }
    }

    private boolean isOwner(User owner, User currentUser) {
        return owner != null && owner.getUsername() != null && owner.getUsername().equals(currentUser.getUsername());
    }
}
