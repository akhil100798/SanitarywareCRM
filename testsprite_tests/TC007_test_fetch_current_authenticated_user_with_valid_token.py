import requests
import uuid

base_url = "http://localhost:8080"

def test_fetch_current_authenticated_user_with_valid_token():
    # Prepare unique user registration data
    unique_suffix = str(uuid.uuid4())[:8]
    register_payload = {
        "username": f"testuser_{unique_suffix}",
        "email": f"testuser_{unique_suffix}@example.com",
        "password": "TestPass123!",
        "fullName": "Test User",
        "phoneNumber": "1234567890",
        "role": "USER"
    }

    # Register a new user
    register_response = requests.post(
        f"{base_url}/api/auth/register",
        json=register_payload,
        timeout=30
    )
    assert register_response.status_code == 201, f"Registration failed: {register_response.text}"

    try:
        # Login with the registered user to get JWT token
        login_payload = {
            "username": register_payload["username"],
            "password": register_payload["password"]
        }
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_payload,
            timeout=30
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        token = login_data.get("token")
        assert token and isinstance(token, str), "JWT token not found in login response"

        # Use token to fetch current authenticated user details
        headers = {
            "Authorization": f"Bearer {token}"
        }
        me_response = requests.get(
            f"{base_url}/api/auth/me",
            headers=headers,
            timeout=30
        )
        assert me_response.status_code == 200, f"/api/auth/me request failed: {me_response.text}"

        me_data = me_response.json()

        # Validate that details in /me response match login response (except token which can be nullable)
        assert me_data.get("id") == login_data.get("id"), "User ID mismatch between /login and /me"
        assert me_data.get("username") == login_data.get("username"), "Username mismatch between /login and /me"
        assert me_data.get("email") == login_data.get("email"), "Email mismatch between /login and /me"
        assert me_data.get("fullName") == login_data.get("fullName"), "FullName mismatch between /login and /me"
        assert me_data.get("role") == login_data.get("role"), "Role mismatch between /login and /me"

    finally:
        # Cleanup: delete the registered user if such endpoint existed
        # Given no delete user endpoint in PRD, skipping deletion.
        # If there was a delete endpoint, would call it here.
        pass


test_fetch_current_authenticated_user_with_valid_token()
