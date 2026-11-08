package com.sanitaryware.crm.service;

import com.sanitaryware.crm.dto.CreateManagedUserRequest;
import com.sanitaryware.crm.dto.UpdateUserAccessRequest;
import com.sanitaryware.crm.dto.UserAdminDTO;
import java.util.List;

public interface UserManagementService {
    List<UserAdminDTO> listUsers();
    UserAdminDTO createUser(CreateManagedUserRequest request);
    UserAdminDTO updateAccess(Long userId, UpdateUserAccessRequest request);
}
