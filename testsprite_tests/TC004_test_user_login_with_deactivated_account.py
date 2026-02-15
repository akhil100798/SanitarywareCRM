import requests

BASE_URL = "http://localhost:5173/8080"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30

def test_user_login_with_deactivated_account():
    url = BASE_URL + LOGIN_ENDPOINT

    # Example credentials for a deactivated account - these must be valid in the test environment
    payload = {
        "username": "deactivated_user",
        "password": "anyPassword123!"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 403, f"Expected status code 403, got {response.status_code}"
    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    assert "message" in resp_json, "Response JSON must contain 'message'"
    # Optionally check if the message contains info about deactivated account
    assert "deactivated" in resp_json["message"].lower() or "forbidden" in resp_json["message"].lower()

test_user_login_with_deactivated_account()