import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_api_health_endpoint():
    url = f"{BASE_URL}/api/auth/test"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request to /api/auth/test failed: {e}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    assert "message" in json_data, "Response JSON does not contain 'message' key"
    assert isinstance(json_data["message"], str), "'message' value is not a string"
    assert len(json_data["message"]) > 0, "'message' value is empty"

test_api_health_endpoint()
