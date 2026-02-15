"""
Customer API Test Cases
Tests for /api/customers/* endpoints
"""
import requests
import uuid

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class CustomerTests:
    """Test cases for Customer endpoints."""
    
    def __init__(self, headers: dict):
        self.headers = headers
        self.customer_id = None
        self.customer_name = None
    
    def test_create_customer_retail(self) -> bool:
        """TC031: Test POST /api/customers - Create retail customer."""
        self.customer_name = f"Test Customer {uuid.uuid4().hex[:6]}"
        payload = {
            "name": self.customer_name,
            "email": f"customer_{uuid.uuid4().hex[:8]}@example.com",
            "phoneNumber": "9876543210",
            "customerType": "RETAIL",
            "billingAddress": "123 Test Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001"
        }
        response = requests.post(f"{BASE_URL}/customers", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == self.customer_name, "Customer name mismatch"
        assert data["customerType"] == "RETAIL", "Customer type mismatch"
        
        self.customer_id = data["id"]
        print(f"Created customer ID: {self.customer_id}")
        return True
    
    def test_create_customer_wholesale(self) -> bool:
        """TC032: Test POST /api/customers - Create wholesale customer with GST."""
        payload = {
            "name": f"Wholesale Corp {uuid.uuid4().hex[:6]}",
            "email": f"wholesale_{uuid.uuid4().hex[:8]}@company.com",
            "phoneNumber": "9876543211",
            "customerType": "WHOLESALE",
            "company": "Wholesale Trading Co.",
            "gstNumber": "27AABCU9603R1ZM",
            "billingAddress": "456 Commercial Complex",
            "shippingAddress": "789 Warehouse District",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001"
        }
        response = requests.post(f"{BASE_URL}/customers", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        
        data = response.json()
        assert data["customerType"] == "WHOLESALE", "Customer type mismatch"
        assert data["gstNumber"] == payload["gstNumber"], "GST number mismatch"
        return True
    
    def test_create_customer_missing_required(self) -> bool:
        """TC033: Test POST /api/customers - Create customer missing required fields."""
        payload = {
            "email": "incomplete@example.com"
            # Missing name and phone
        }
        response = requests.post(f"{BASE_URL}/customers", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected 400 for validation, got {response.status_code}"
        return True
    
    def test_create_customer_invalid_email(self) -> bool:
        """TC034: Test POST /api/customers - Create customer with invalid email."""
        payload = {
            "name": "Invalid Email Customer",
            "email": "not-an-email",
            "phoneNumber": "9876543212",
            "customerType": "RETAIL"
        }
        response = requests.post(f"{BASE_URL}/customers", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 400, f"Expected 400 for invalid email, got {response.status_code}"
        return True
    
    def test_get_customer_by_id(self) -> bool:
        """TC035: Test GET /api/customers/{id} - Get customer by valid ID."""
        assert self.customer_id is not None, "Customer ID not set"
        
        response = requests.get(f"{BASE_URL}/customers/{self.customer_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.customer_id, "Customer ID mismatch"
        return True
    
    def test_get_customer_nonexistent(self) -> bool:
        """TC036: Test GET /api/customers/{id} - Get nonexistent customer."""
        response = requests.get(f"{BASE_URL}/customers/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_customer(self) -> bool:
        """TC037: Test PUT /api/customers/{id} - Update existing customer."""
        assert self.customer_id is not None, "Customer ID not set"
        
        payload = {
            "name": f"Updated Customer {uuid.uuid4().hex[:6]}",
            "email": f"updated_{uuid.uuid4().hex[:8]}@example.com",
            "phoneNumber": "9876543213",
            "alternatePhone": "9876543214",
            "customerType": "RETAIL",
            "billingAddress": "Updated Address 123",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001",
            "notes": "Updated customer notes"
        }
        response = requests.put(f"{BASE_URL}/customers/{self.customer_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["city"] == "Bangalore", "City update failed"
        return True
    
    def test_get_all_customers(self) -> bool:
        """TC038: Test GET /api/customers - Get all customers (paginated)."""
        response = requests.get(f"{BASE_URL}/customers", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated with 'content'"
        assert "totalElements" in data, "Response should have 'totalElements'"
        return True
    
    def test_get_all_customers_pagination(self) -> bool:
        """TC039: Test GET /api/customers - Test pagination parameters."""
        response = requests.get(f"{BASE_URL}/customers?page=0&size=5", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "size" in data, "Response should have 'size'"
        assert data["size"] <= 5, "Page size should respect limit"
        return True
    
    def test_search_customers(self) -> bool:
        """TC040: Test GET /api/customers/search - Search customers by name."""
        assert self.customer_name is not None, "Customer name not set"
        
        # Search by partial name
        search_term = self.customer_name.split()[0]  # "Test"
        response = requests.get(f"{BASE_URL}/customers/search?query={search_term}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated"
        return True
    
    def test_search_customers_no_results(self) -> bool:
        """TC041: Test GET /api/customers/search - Search with no matching results."""
        response = requests.get(f"{BASE_URL}/customers/search?query=ZZZNONEXISTENT123", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["content"] == [] or len(data["content"]) == 0, "Should return empty results"
        return True
    
    def test_get_active_customers(self) -> bool:
        """TC042: Test GET /api/customers/active - Get only active customers."""
        response = requests.get(f"{BASE_URL}/customers/active", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_customers_by_type_retail(self) -> bool:
        """TC043: Test GET /api/customers/type/{type} - Get RETAIL customers."""
        response = requests.get(f"{BASE_URL}/customers/type/RETAIL", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all returned customers are RETAIL
        for customer in data.get("content", data if isinstance(data, list) else []):
            if "customerType" in customer:
                assert customer["customerType"] == "RETAIL", "Non-RETAIL customer returned"
        return True
    
    def test_get_customers_by_type_wholesale(self) -> bool:
        """TC044: Test GET /api/customers/type/{type} - Get WHOLESALE customers."""
        response = requests.get(f"{BASE_URL}/customers/type/WHOLESALE", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_delete_customer(self) -> bool:
        """TC045: Test DELETE /api/customers/{id} - Delete customer."""
        # Create a customer specifically for deletion
        payload = {
            "name": f"DeleteCustomer_{uuid.uuid4().hex[:6]}",
            "email": f"delete_{uuid.uuid4().hex[:8]}@example.com",
            "phoneNumber": "1111111111",
            "customerType": "RETAIL"
        }
        create_res = requests.post(f"{BASE_URL}/customers", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert create_res.status_code == 201, "Failed to create customer for deletion test"
        
        customer_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/customers/{customer_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        
        # Verify it's deleted
        verify_res = requests.get(f"{BASE_URL}/customers/{customer_id}", headers=self.headers, timeout=TIMEOUT)
        assert verify_res.status_code == 404, "Customer should not exist after deletion"
        return True


def run_customer_tests(headers: dict) -> tuple:
    """Run all customer tests and return (passed, failed) counts."""
    tests = CustomerTests(headers)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC031: Create retail customer", tests.test_create_customer_retail),
        ("TC032: Create wholesale customer", tests.test_create_customer_wholesale),
        ("TC033: Create customer missing required", tests.test_create_customer_missing_required),
        ("TC034: Create customer invalid email", tests.test_create_customer_invalid_email),
        ("TC035: Get customer by ID", tests.test_get_customer_by_id),
        ("TC036: Get customer nonexistent", tests.test_get_customer_nonexistent),
        ("TC037: Update customer", tests.test_update_customer),
        ("TC038: Get all customers", tests.test_get_all_customers),
        ("TC039: Get all customers pagination", tests.test_get_all_customers_pagination),
        ("TC040: Search customers", tests.test_search_customers),
        ("TC041: Search customers no results", tests.test_search_customers_no_results),
        ("TC042: Get active customers", tests.test_get_active_customers),
        ("TC043: Get customers by type RETAIL", tests.test_get_customers_by_type_retail),
        ("TC044: Get customers by type WHOLESALE", tests.test_get_customers_by_type_wholesale),
        ("TC045: Delete customer", tests.test_delete_customer),
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
    print("Customer API Tests require authentication headers.")
    print("Please run through the main test suite or provide headers.")
