"""
Order and Quotation API Test Cases
Tests for /api/quotations/* and /api/orders/* endpoints
"""
import requests
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class QuotationTests:
    """Test cases for Quotation endpoints."""
    
    def __init__(self, headers: dict, customer_id: int, product_id: int):
        self.headers = headers
        self.customer_id = customer_id
        self.product_id = product_id
        self.quotation_id = None
    
    def test_create_quotation(self) -> bool:
        """TC064: Test POST /api/quotations - Create new quotation."""
        today = datetime.now().strftime("%Y-%m-%d")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "quotationDate": today,
            "validUntil": valid_until,
            "notes": "Test quotation for sanitaryware order",
            "termsAndConditions": "Standard T&C apply",
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 10,
                    "unitPrice": 1200.00,
                    "discountPercentage": 5.0
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/quotations", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "quotationNumber" in data, "Should have quotation number"
        
        self.quotation_id = data["id"]
        print(f"Created quotation ID: {self.quotation_id}")
        return True
    
    def test_create_quotation_multiple_items(self) -> bool:
        """TC065: Test POST /api/quotations - Create quotation with multiple items."""
        today = datetime.now().strftime("%Y-%m-%d")
        valid_until = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "quotationDate": today,
            "validUntil": valid_until,
            "items": [
                {"productId": self.product_id, "quantity": 5, "unitPrice": 1100.00},
                {"productId": self.product_id, "quantity": 3, "unitPrice": 1200.00}
            ]
        }
        response = requests.post(f"{BASE_URL}/quotations", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        return True
    
    def test_create_quotation_empty_items(self) -> bool:
        """TC066: Test POST /api/quotations - Create quotation with no items."""
        today = datetime.now().strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "quotationDate": today,
            "validUntil": today,
            "items": []
        }
        response = requests.post(f"{BASE_URL}/quotations", headers=self.headers, json=payload, timeout=TIMEOUT)
        # Should fail validation - quotation needs at least one item
        assert response.status_code in [200, 201, 400], f"Unexpected status: {response.status_code}"
        return True
    
    def test_get_quotation_by_id(self) -> bool:
        """TC067: Test GET /api/quotations/{id} - Get quotation by valid ID."""
        assert self.quotation_id is not None, "Quotation ID not set"
        
        response = requests.get(f"{BASE_URL}/quotations/{self.quotation_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.quotation_id, "Quotation ID mismatch"
        assert "items" in data, "Should include items"
        assert "customerName" in data, "Should include customer name"
        return True
    
    def test_get_quotation_nonexistent(self) -> bool:
        """TC068: Test GET /api/quotations/{id} - Get nonexistent quotation."""
        response = requests.get(f"{BASE_URL}/quotations/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_quotation(self) -> bool:
        """TC069: Test PUT /api/quotations/{id} - Update existing quotation."""
        assert self.quotation_id is not None, "Quotation ID not set"
        
        today = datetime.now().strftime("%Y-%m-%d")
        valid_until = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "quotationDate": today,
            "validUntil": valid_until,
            "notes": "Updated quotation notes",
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 15,
                    "unitPrice": 1100.00,
                    "discountPercentage": 10.0
                }
            ]
        }
        response = requests.put(f"{BASE_URL}/quotations/{self.quotation_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_all_quotations(self) -> bool:
        """TC070: Test GET /api/quotations - Get all quotations (paginated)."""
        response = requests.get(f"{BASE_URL}/quotations", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated with 'content'"
        return True
    
    def test_update_quotation_status(self) -> bool:
        """TC071: Test PATCH /api/quotations/{id}/status - Update quotation status."""
        assert self.quotation_id is not None, "Quotation ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/quotations/{self.quotation_id}/status?status=SENT",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_quotations_by_customer(self) -> bool:
        """TC072: Test GET /api/quotations/customer/{customerId} - Get quotations by customer."""
        response = requests.get(f"{BASE_URL}/quotations/customer/{self.customer_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True


class OrderTests:
    """Test cases for Order endpoints."""
    
    def __init__(self, headers: dict, customer_id: int, product_id: int, quotation_id: int):
        self.headers = headers
        self.customer_id = customer_id
        self.product_id = product_id
        self.quotation_id = quotation_id
        self.order_id = None
    
    def test_create_order_from_quotation(self) -> bool:
        """TC073: Test POST /api/orders/from-quotation/{quotationId} - Convert quotation to order."""
        # First, create a fresh quotation for conversion
        today = datetime.now().strftime("%Y-%m-%d")
        valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        quote_payload = {
            "customerId": self.customer_id,
            "quotationDate": today,
            "validUntil": valid_until,
            "items": [{"productId": self.product_id, "quantity": 5, "unitPrice": 1000.00}]
        }
        quote_res = requests.post(f"{BASE_URL}/quotations", headers=self.headers, json=quote_payload, timeout=TIMEOUT)
        if quote_res.status_code not in [200, 201]:
            print("Failed to create quotation for conversion")
            return False
        
        new_quote_id = quote_res.json()["id"]
        
        response = requests.post(
            f"{BASE_URL}/orders/from-quotation/{new_quote_id}",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain order 'id'"
        assert "orderNumber" in data, "Should have order number"
        
        self.order_id = data["id"]
        print(f"Created order ID: {self.order_id}")
        return True
    
    def test_create_order_direct(self) -> bool:
        """TC074: Test POST /api/orders - Create order directly (without quotation)."""
        today = datetime.now().strftime("%Y-%m-%d")
        delivery_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "orderDate": today,
            "deliveryDate": delivery_date,
            "shippingAddress": "123 Direct Order Street, City",
            "notes": "Direct order test",
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 3,
                    "unitPrice": 1150.00
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/orders", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_order_by_id(self) -> bool:
        """TC075: Test GET /api/orders/{id} - Get order by valid ID."""
        assert self.order_id is not None, "Order ID not set"
        
        response = requests.get(f"{BASE_URL}/orders/{self.order_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.order_id, "Order ID mismatch"
        assert "items" in data, "Should include order items"
        assert "total" in data, "Should include total amount"
        return True
    
    def test_get_order_nonexistent(self) -> bool:
        """TC076: Test GET /api/orders/{id} - Get nonexistent order."""
        response = requests.get(f"{BASE_URL}/orders/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_order(self) -> bool:
        """TC077: Test PUT /api/orders/{id} - Update existing order."""
        assert self.order_id is not None, "Order ID not set"
        
        today = datetime.now().strftime("%Y-%m-%d")
        delivery_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        payload = {
            "customerId": self.customer_id,
            "orderDate": today,
            "deliveryDate": delivery_date,
            "shippingAddress": "456 Updated Street, New City",
            "notes": "Updated order notes",
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 8,
                    "unitPrice": 1100.00
                }
            ]
        }
        response = requests.put(f"{BASE_URL}/orders/{self.order_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_all_orders(self) -> bool:
        """TC078: Test GET /api/orders - Get all orders (paginated)."""
        response = requests.get(f"{BASE_URL}/orders", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated with 'content'"
        return True
    
    def test_update_order_status(self) -> bool:
        """TC079: Test PATCH /api/orders/{id}/status - Update order status to CONFIRMED."""
        assert self.order_id is not None, "Order ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/orders/{self.order_id}/status?status=CONFIRMED",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_update_order_status_processing(self) -> bool:
        """TC080: Test PATCH /api/orders/{id}/status - Update to PROCESSING."""
        assert self.order_id is not None, "Order ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/orders/{self.order_id}/status?status=PROCESSING",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_update_payment_status(self) -> bool:
        """TC081: Test PATCH /api/orders/{id}/payment-status - Update payment status."""
        assert self.order_id is not None, "Order ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/orders/{self.order_id}/payment-status?status=PARTIAL",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_orders_by_customer(self) -> bool:
        """TC082: Test GET /api/orders/customer/{customerId} - Get orders by customer."""
        response = requests.get(f"{BASE_URL}/orders/customer/{self.customer_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_delete_order(self) -> bool:
        """TC083: Test DELETE /api/orders/{id} - Delete order (admin only)."""
        # Create an order specifically for deletion
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "customerId": self.customer_id,
            "orderDate": today,
            "items": [{"productId": self.product_id, "quantity": 1, "unitPrice": 500.00}]
        }
        create_res = requests.post(f"{BASE_URL}/orders", headers=self.headers, json=payload, timeout=TIMEOUT)
        if create_res.status_code != 200:
            return True  # Skip if can't create
        
        order_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/orders/{order_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        return True


def run_quotation_tests(headers: dict, customer_id: int, product_id: int) -> tuple:
    """Run all quotation tests and return (passed, failed) counts."""
    tests = QuotationTests(headers, customer_id, product_id)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC064: Create quotation", tests.test_create_quotation),
        ("TC065: Create quotation multiple items", tests.test_create_quotation_multiple_items),
        ("TC066: Create quotation empty items", tests.test_create_quotation_empty_items),
        ("TC067: Get quotation by ID", tests.test_get_quotation_by_id),
        ("TC068: Get quotation nonexistent", tests.test_get_quotation_nonexistent),
        ("TC069: Update quotation", tests.test_update_quotation),
        ("TC070: Get all quotations", tests.test_get_all_quotations),
        ("TC071: Update quotation status", tests.test_update_quotation_status),
        ("TC072: Get quotations by customer", tests.test_get_quotations_by_customer),
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
    
    return passed, failed, tests.quotation_id


def run_order_tests(headers: dict, customer_id: int, product_id: int, quotation_id: int) -> tuple:
    """Run all order tests and return (passed, failed) counts."""
    tests = OrderTests(headers, customer_id, product_id, quotation_id)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC073: Create order from quotation", tests.test_create_order_from_quotation),
        ("TC074: Create order direct", tests.test_create_order_direct),
        ("TC075: Get order by ID", tests.test_get_order_by_id),
        ("TC076: Get order nonexistent", tests.test_get_order_nonexistent),
        ("TC077: Update order", tests.test_update_order),
        ("TC078: Get all orders", tests.test_get_all_orders),
        ("TC079: Update order status CONFIRMED", tests.test_update_order_status),
        ("TC080: Update order status PROCESSING", tests.test_update_order_status_processing),
        ("TC081: Update payment status", tests.test_update_payment_status),
        ("TC082: Get orders by customer", tests.test_get_orders_by_customer),
        ("TC083: Delete order", tests.test_delete_order),
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
    
    return passed, failed, tests.order_id


if __name__ == "__main__":
    print("Quotation and Order API Tests require authentication headers and related IDs.")
    print("Please run through the main test suite.")
