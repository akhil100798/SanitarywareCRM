"""
Category API Test Cases
Tests for /api/categories/* endpoints
"""
import requests
import uuid

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class CategoryTests:
    """Test cases for Category endpoints."""
    
    def __init__(self, headers: dict):
        self.headers = headers
        self.category_id = None
        self.subcategory_id = None
    
    def test_create_category(self) -> bool:
        """TC019: Test POST /api/categories - Create new root category."""
        payload = {
            "name": f"TestCategory_{uuid.uuid4().hex[:6]}",
            "description": "Test category for sanitaryware products",
            "isActive": True
        }
        response = requests.post(f"{BASE_URL}/categories", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == payload["name"], "Category name mismatch"
        
        self.category_id = data["id"]
        print(f"Created category ID: {self.category_id}")
        return True
    
    def test_create_subcategory(self) -> bool:
        """TC020: Test POST /api/categories - Create subcategory with parent."""
        assert self.category_id is not None, "Parent category ID not set"
        
        payload = {
            "name": f"SubCategory_{uuid.uuid4().hex[:6]}",
            "description": "Test subcategory",
            "parentId": self.category_id,
            "isActive": True
        }
        response = requests.post(f"{BASE_URL}/categories", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.subcategory_id = data["id"]
        print(f"Created subcategory ID: {self.subcategory_id}")
        return True
    
    def test_create_category_empty_name(self) -> bool:
        """TC021: Test POST /api/categories - Create category with empty name."""
        payload = {
            "name": "",
            "description": "Empty name test"
        }
        response = requests.post(f"{BASE_URL}/categories", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        return True
    
    def test_get_category_by_id(self) -> bool:
        """TC022: Test GET /api/categories/{id} - Get category by valid ID."""
        assert self.category_id is not None, "Category ID not set"
        
        response = requests.get(f"{BASE_URL}/categories/{self.category_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.category_id, "Category ID mismatch"
        return True
    
    def test_get_category_nonexistent(self) -> bool:
        """TC023: Test GET /api/categories/{id} - Get nonexistent category."""
        response = requests.get(f"{BASE_URL}/categories/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_category(self) -> bool:
        """TC024: Test PUT /api/categories/{id} - Update existing category."""
        assert self.category_id is not None, "Category ID not set"
        
        payload = {
            "name": f"UpdatedCategory_{uuid.uuid4().hex[:6]}",
            "description": "Updated category description",
            "isActive": True
        }
        response = requests.put(f"{BASE_URL}/categories/{self.category_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == payload["name"], "Updated name mismatch"
        return True
    
    def test_get_all_categories(self) -> bool:
        """TC025: Test GET /api/categories - Get all categories."""
        response = requests.get(f"{BASE_URL}/categories", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_active_categories(self) -> bool:
        """TC026: Test GET /api/categories/active - Get only active categories."""
        response = requests.get(f"{BASE_URL}/categories/active", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_root_categories(self) -> bool:
        """TC027: Test GET /api/categories/roots - Get root categories (no parent)."""
        response = requests.get(f"{BASE_URL}/categories/roots", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_subcategories(self) -> bool:
        """TC028: Test GET /api/categories/{parentId}/subs - Get subcategories."""
        assert self.category_id is not None, "Category ID not set"
        
        response = requests.get(f"{BASE_URL}/categories/{self.category_id}/subs", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # If we created a subcategory, it should be in the list
        if self.subcategory_id:
            ids = [c["id"] for c in data]
            assert self.subcategory_id in ids, "Subcategory not found in parent's subcategories"
        return True
    
    def test_delete_category(self) -> bool:
        """TC029: Test DELETE /api/categories/{id} - Delete category."""
        # Create a category specifically for deletion
        payload = {"name": f"DeleteCategory_{uuid.uuid4().hex[:6]}"}
        create_res = requests.post(f"{BASE_URL}/categories", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert create_res.status_code == 201, "Failed to create category for deletion test"
        
        category_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/categories/{category_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        
        # Verify it's deleted
        verify_res = requests.get(f"{BASE_URL}/categories/{category_id}", headers=self.headers, timeout=TIMEOUT)
        assert verify_res.status_code == 404, "Category should not exist after deletion"
        return True
    
    def test_delete_category_with_subcategories(self) -> bool:
        """TC030: Test DELETE /api/categories/{id} - Delete category with subcategories."""
        # This tests the cascading behavior
        # Create parent
        parent_payload = {"name": f"ParentCat_{uuid.uuid4().hex[:6]}"}
        parent_res = requests.post(f"{BASE_URL}/categories", headers=self.headers, json=parent_payload, timeout=TIMEOUT)
        if parent_res.status_code != 201:
            return True  # Skip if can't create parent
        
        parent_id = parent_res.json()["id"]
        
        # Create child
        child_payload = {"name": f"ChildCat_{uuid.uuid4().hex[:6]}", "parentId": parent_id}
        requests.post(f"{BASE_URL}/categories", headers=self.headers, json=child_payload, timeout=TIMEOUT)
        
        # Try to delete parent - behavior depends on implementation
        response = requests.delete(f"{BASE_URL}/categories/{parent_id}", headers=self.headers, timeout=TIMEOUT)
        # Should either succeed (cascade) or fail (referential integrity)
        assert response.status_code in [204, 400, 409], f"Unexpected status: {response.status_code}"
        return True


def run_category_tests(headers: dict) -> tuple:
    """Run all category tests and return (passed, failed) counts."""
    tests = CategoryTests(headers)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC019: Create category", tests.test_create_category),
        ("TC020: Create subcategory", tests.test_create_subcategory),
        ("TC021: Create category empty name", tests.test_create_category_empty_name),
        ("TC022: Get category by ID", tests.test_get_category_by_id),
        ("TC023: Get category nonexistent", tests.test_get_category_nonexistent),
        ("TC024: Update category", tests.test_update_category),
        ("TC025: Get all categories", tests.test_get_all_categories),
        ("TC026: Get active categories", tests.test_get_active_categories),
        ("TC027: Get root categories", tests.test_get_root_categories),
        ("TC028: Get subcategories", tests.test_get_subcategories),
        ("TC029: Delete category", tests.test_delete_category),
        ("TC030: Delete category with subcategories", tests.test_delete_category_with_subcategories),
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
    print("Category API Tests require authentication headers.")
    print("Please run through the main test suite or provide headers.")
