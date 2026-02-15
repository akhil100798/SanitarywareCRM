import requests
import uuid

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = f"{BASE_URL}/api/auth/register"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_user_registration_with_duplicate_username_or_email():
    # Create a unique user first
    unique_id = str(uuid.uuid4())[:8]
    existing_user = {
        "username": f"testuser_{unique_id}",
        "email": f"testuser_{unique_id}@example.com",
        "password": "TestPass123!",
        "fullName": "Test User",
        "phoneNumber": "1234567890",
        "role": "USER"
    }

    try:
        # Register the initial user
        resp = requests.post(REGISTER_ENDPOINT, json=existing_user, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Setup user registration failed with status {resp.status_code}, response: {resp.text}"

        # Attempt to register a new user with same username, different email
        duplicate_username_user = {
            "username": existing_user["username"],
            "email": f"diffemail_{unique_id}@example.com",
            "password": "AnotherPass123!",
            "fullName": "Another User",
            "phoneNumber": "0987654321",
            "role": "USER"
        }
        resp_dup_username = requests.post(REGISTER_ENDPOINT, json=duplicate_username_user, headers=HEADERS, timeout=TIMEOUT)
        assert resp_dup_username.status_code == 400, f"Duplicate username registration did not fail as expected, status: {resp_dup_username.status_code}"
        message_json = resp_dup_username.json()
        assert "username" in message_json.get("message", "").lower() or "exists" in message_json.get("message", "").lower(), \
            f"Unexpected error message for duplicate username: {message_json.get('message')}"

        # Attempt to register a new user with same email, different username
        duplicate_email_user = {
            "username": f"diffuser_{unique_id}",
            "email": existing_user["email"],
            "password": "YetAnotherPass123!",
            "fullName": "Yet Another User",
            "phoneNumber": "1122334455",
            "role": "USER"
        }
        resp_dup_email = requests.post(REGISTER_ENDPOINT, json=duplicate_email_user, headers=HEADERS, timeout=TIMEOUT)
        assert resp_dup_email.status_code == 400, f"Duplicate email registration did not fail as expected, status: {resp_dup_email.status_code}"
        message_json = resp_dup_email.json()
        assert "email" in message_json.get("message", "").lower() or "exists" in message_json.get("message", "").lower(), \
            f"Unexpected error message for duplicate email: {message_json.get('message')}"

    finally:
        # Cleanup: there is no delete user API provided in the spec, so cleanup can't be automated here.
        # Normally, you would delete the created user from the database or via API if supported.
        pass

test_user_registration_with_duplicate_username_or_email()
