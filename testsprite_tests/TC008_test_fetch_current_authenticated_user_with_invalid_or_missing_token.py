import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_fetch_current_authenticated_user_with_invalid_or_missing_token():
    url = f"{BASE_URL}/api/auth/me"
    headers_list = [
        {},  # Missing token
        {"Authorization": "Bearer invalid.token.here"}  # Invalid token
    ]

    for headers in headers_list:
        try:
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request failed: {e}"
        
        assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
        try:
            json_data = response.json()
        except ValueError:
            assert False, "Response is not in JSON format"
        assert "message" in json_data and isinstance(json_data["message"], str) and len(json_data["message"]) > 0, \
            "Response JSON does not contain a valid 'message' field"

test_fetch_current_authenticated_user_with_invalid_or_missing_token()
