package com.sanitaryware.crm.controller;

import com.sanitaryware.crm.dto.CreateManagedUserRequest;
import com.sanitaryware.crm.dto.UpdateUserAccessRequest;
import com.sanitaryware.crm.dto.UserAdminDTO;
import com.sanitaryware.crm.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class UserManagementController {

    private final UserManagementService userManagementService;

    @GetMapping
    public List<UserAdminDTO> listUsers() {
        return userManagementService.listUsers();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserAdminDTO createUser(@Valid @RequestBody CreateManagedUserRequest request) {
        return userManagementService.createUser(request);
    }

    @PatchMapping("/{id}/access")
    public UserAdminDTO updateAccess(@PathVariable Long id, @Valid @RequestBody UpdateUserAccessRequest request) {
        return userManagementService.updateAccess(id, request);
    }
}
