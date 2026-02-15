import requests

def test_user_login_with_valid_credentials():
    base_url = "http://localhost:8080"
    login_url = f"{base_url}/api/auth/login"
    timeout = 30

    # Known valid user credentials for testing
    valid_username = "validUser"
    valid_password = "ValidPassword123!"

    payload = {
        "username": valid_username,
        "password": valid_password
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(login_url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to login endpoint failed: {e}"

    # Validate HTTP 200 status code
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate token is a non-empty string
    assert "token" in data, "Response JSON does not contain 'token'"
    token = data["token"]
    assert isinstance(token, str) and token.strip() != "", "Token is empty or not a string"

    # Validate user details presence and types
    required_user_fields = ["id", "username", "email", "fullName", "role"]
    for field in required_user_fields:
        assert field in data, f"Response JSON missing required field '{field}'"

    assert isinstance(data["id"], int), "'id' should be an integer"
    assert data["username"] == valid_username, f"Returned username '{data['username']}' does not match login username '{valid_username}'"
    assert isinstance(data["email"], str) and "@" in data["email"], "'email' field is invalid"
    assert isinstance(data["fullName"], str) and data["fullName"].strip() != "", "'fullName' is empty or not a string"
    assert isinstance(data["role"], str) and data["role"].strip() != "", "'role' is empty or not a string"

test_user_login_with_valid_credentials()
