import requests
import uuid

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = "/api/auth/register"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_user_registration_with_unique_username_and_email():
    unique_suffix = str(uuid.uuid4())
    user_data = {
        "username": f"testuser_{unique_suffix}",
        "email": f"testuser_{unique_suffix}@example.com",
        "password": "StrongPass!123",
        "fullName": "Test User",
        "phoneNumber": "1234567890",
        "role": "USER"
    }

    response = None
    try:
        response = requests.post(
            BASE_URL + REGISTER_ENDPOINT,
            json=user_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"
        json_response = response.json()
        assert "message" in json_response, "Response JSON should contain 'message' field"
        assert isinstance(json_response["message"], str) and len(json_response["message"]) > 0, \
            "Response 'message' should be a non-empty string"
    finally:
        pass

test_user_registration_with_unique_username_and_email()
