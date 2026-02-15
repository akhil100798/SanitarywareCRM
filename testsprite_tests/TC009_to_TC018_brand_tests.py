"""
Brand API Test Cases
Tests for /api/brands/* endpoints
"""
import requests
import uuid

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class BrandTests:
    """Test cases for Brand endpoints."""
    
    def __init__(self, headers: dict):
        self.headers = headers
        self.brand_id = None
    
    def test_create_brand(self) -> bool:
        """TC009: Test POST /api/brands - Create new brand with valid data."""
        payload = {
            "name": f"TestBrand_{uuid.uuid4().hex[:6]}",
            "description": "Test brand description for sanitaryware products",
            "isActive": True
        }
        response = requests.post(f"{BASE_URL}/brands", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == payload["name"], "Brand name mismatch"
        
        self.brand_id = data["id"]
        print(f"Created brand ID: {self.brand_id}")
        return True
    
    def test_create_brand_empty_name(self) -> bool:
        """TC010: Test POST /api/brands - Create brand with empty name (validation)."""
        payload = {
            "name": "",
            "description": "Empty name test"
        }
        response = requests.post(f"{BASE_URL}/brands", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected 400 for validation error, got {response.status_code}"
        return True
    
    def test_get_brand_by_id(self) -> bool:
        """TC011: Test GET /api/brands/{id} - Get brand by valid ID."""
        assert self.brand_id is not None, "Brand ID not set - run create test first"
        
        response = requests.get(f"{BASE_URL}/brands/{self.brand_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.brand_id, "Brand ID mismatch"
        return True
    
    def test_get_brand_nonexistent(self) -> bool:
        """TC012: Test GET /api/brands/{id} - Get brand with nonexistent ID."""
        response = requests.get(f"{BASE_URL}/brands/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_brand(self) -> bool:
        """TC013: Test PUT /api/brands/{id} - Update existing brand."""
        assert self.brand_id is not None, "Brand ID not set - run create test first"
        
        payload = {
            "name": f"UpdatedBrand_{uuid.uuid4().hex[:6]}",
            "description": "Updated brand description",
            "isActive": True
        }
        response = requests.put(f"{BASE_URL}/brands/{self.brand_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == payload["name"], "Updated name mismatch"
        return True
    
    def test_update_brand_nonexistent(self) -> bool:
        """TC014: Test PUT /api/brands/{id} - Update nonexistent brand."""
        payload = {
            "name": "NonexistentBrand",
            "description": "Should fail"
        }
        response = requests.put(f"{BASE_URL}/brands/999999", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_get_all_brands(self) -> bool:
        """TC015: Test GET /api/brands - Get all brands."""
        response = requests.get(f"{BASE_URL}/brands", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_active_brands(self) -> bool:
        """TC016: Test GET /api/brands/active - Get only active brands."""
        response = requests.get(f"{BASE_URL}/brands/active", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All returned brands should be active
        for brand in data:
            assert brand.get("isActive", True), f"Brand {brand['id']} is not active"
        return True
    
    def test_delete_brand(self) -> bool:
        """TC017: Test DELETE /api/brands/{id} - Delete existing brand."""
        # Create a brand specifically for deletion
        payload = {"name": f"DeleteBrand_{uuid.uuid4().hex[:6]}"}
        create_res = requests.post(f"{BASE_URL}/brands", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert create_res.status_code == 201, "Failed to create brand for deletion test"
        
        brand_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/brands/{brand_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        
        # Verify it's deleted
        verify_res = requests.get(f"{BASE_URL}/brands/{brand_id}", headers=self.headers, timeout=TIMEOUT)
        assert verify_res.status_code == 404, "Brand should not exist after deletion"
        return True
    
    def test_delete_brand_nonexistent(self) -> bool:
        """TC018: Test DELETE /api/brands/{id} - Delete nonexistent brand."""
        response = requests.delete(f"{BASE_URL}/brands/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True


def run_brand_tests(headers: dict) -> tuple:
    """Run all brand tests and return (passed, failed) counts."""
    tests = BrandTests(headers)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC009: Create brand", tests.test_create_brand),
        ("TC010: Create brand empty name", tests.test_create_brand_empty_name),
        ("TC011: Get brand by ID", tests.test_get_brand_by_id),
        ("TC012: Get brand nonexistent", tests.test_get_brand_nonexistent),
        ("TC013: Update brand", tests.test_update_brand),
        ("TC014: Update brand nonexistent", tests.test_update_brand_nonexistent),
        ("TC015: Get all brands", tests.test_get_all_brands),
        ("TC016: Get active brands", tests.test_get_active_brands),
        ("TC017: Delete brand", tests.test_delete_brand),
        ("TC018: Delete brand nonexistent", tests.test_delete_brand_nonexistent),
    ]
    
    for name, test_func in test_methods:
        try:
            result = test_func()
            if result:
                passed += 1
                print(f"  ✅ {name}")
            else:
                failed += 1
                print(f"  ❌ {name}")
        except AssertionError as e:
            failed += 1
            print(f"  ❌ {name}: {str(e)}")
        except Exception as e:
            failed += 1
            print(f"  ❌ {name}: Error - {str(e)}")
    
    return passed, failed


if __name__ == "__main__":
    print("Brand API Tests require authentication headers.")
    print("Please run through the main test suite or provide headers.")
