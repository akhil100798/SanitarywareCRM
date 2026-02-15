import requests

BASE_URL = "http://localhost:8080"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_user_login_with_invalid_credentials():
    url = BASE_URL + LOGIN_ENDPOINT
    headers = {"Content-Type": "application/json"}
    invalid_payload = {
        "username": "invalidUser123",
        "password": "wrongPassword!"
    }

    try:
        response = requests.post(url, json=invalid_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"

    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "message" in resp_json, "Response JSON does not contain 'message' field"
    assert isinstance(resp_json["message"], str) and len(resp_json["message"]) > 0, "Error message is empty or not a string"

test_user_login_with_invalid_credentials()
