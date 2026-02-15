"""
Comprehensive API Test Suite for SanitarywareCRM
This test suite covers all endpoints across all 9 controllers:
- Authentication (4 endpoints)
- Brand (6 endpoints)
- Category (8 endpoints)
- Customer (8 endpoints)
- Product (11 endpoints)
- Quotation (7 endpoints)
- Order (9 endpoints)
- Payment (5 endpoints)
- Dashboard (1 endpoint)

Usage: python test_all_endpoints.py
"""

import requests
import json
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# Configuration
BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class TestResult(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED"
    SKIPPED = "⏭️ SKIPPED"


@dataclass
class TestContext:
    """Shared context between tests containing created resource IDs."""
    token: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    user_id: Optional[int] = None
    username: Optional[str] = None
    brand_id: Optional[int] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    customer_id: Optional[int] = None
    product_id: Optional[int] = None
    quotation_id: Optional[int] = None
    order_id: Optional[int] = None
    payment_id: Optional[int] = None


class TestRunner:
    """Test runner with result tracking and reporting."""
    
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.results = []
    
    def run_test(self, test_name: str, test_func, *args, **kwargs) -> TestResult:
        """Execute a test function and track results."""
        try:
            result = test_func(*args, **kwargs)
            if result:
                self.passed += 1
                self.results.append((test_name, TestResult.PASSED, None))
                print(f"  {TestResult.PASSED.value}: {test_name}")
                return TestResult.PASSED
            else:
                self.failed += 1
                self.results.append((test_name, TestResult.FAILED, "Test returned False"))
                print(f"  {TestResult.FAILED.value}: {test_name} - Test function returned False")
                return TestResult.FAILED
        except AssertionError as e:
            self.failed += 1
            self.results.append((test_name, TestResult.FAILED, str(e)))
            print(f"  {TestResult.FAILED.value}: {test_name} - {str(e)}")
            return TestResult.FAILED
        except Exception as e:
            self.failed += 1
            self.results.append((test_name, TestResult.FAILED, str(e)))
            print(f"  {TestResult.FAILED.value}: {test_name} - Error: {str(e)}")
            return TestResult.FAILED
    
    def skip_test(self, test_name: str, reason: str):
        """Mark a test as skipped."""
        self.skipped += 1
        self.results.append((test_name, TestResult.SKIPPED, reason))
        print(f"  {TestResult.SKIPPED.value}: {test_name} - {reason}")
    
    def print_summary(self):
        """Print test execution summary."""
        total = self.passed + self.failed + self.skipped
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"  ✅ Passed:  {self.passed}")
        print(f"  ❌ Failed:  {self.failed}")
        print(f"  ⏭️  Skipped: {self.skipped}")
        print("=" * 60)
        
        if self.failed > 0:
            print("\nFailed Tests:")
            for name, result, error in self.results:
                if result == TestResult.FAILED:
                    print(f"  - {name}: {error}")
        
        return self.failed == 0


# =============================================================================
# AUTHENTICATION TESTS
# =============================================================================

def test_auth_health(ctx: TestContext) -> bool:
    """Test GET /api/auth/test - API health check."""
    response = requests.get(f"{BASE_URL}/auth/test", timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "message" in data, "Response should contain 'message'"
    return True


def test_auth_register(ctx: TestContext) -> bool:
    """Test POST /api/auth/register - Register new user."""
    ctx.username = f"testuser_{uuid.uuid4().hex[:8]}"
    payload = {
        "username": ctx.username,
        "email": f"{ctx.username}@example.com",
        "password": "SecurePass123!",
        "fullName": "Test User",
        "role": "ADMIN"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Registration failed: {response.text}"
    return True


def test_auth_register_duplicate_username(ctx: TestContext) -> bool:
    """Test POST /api/auth/register with duplicate username."""
    payload = {
        "username": ctx.username,  # Reuse same username
        "email": f"duplicate_{uuid.uuid4().hex[:8]}@example.com",
        "password": "SecurePass123!",
        "fullName": "Duplicate User",
        "role": "SALES"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=TIMEOUT)
    assert response.status_code == 400, f"Expected 400 for duplicate username, got {response.status_code}"
    return True


def test_auth_login(ctx: TestContext) -> bool:
    """Test POST /api/auth/login - User login."""
    payload = {
        "username": ctx.username,
        "password": "SecurePass123!"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "Response should contain 'token'"
    ctx.token = data["token"]
    ctx.user_id = data.get("id")
    ctx.headers = {
        "Authorization": f"Bearer {ctx.token}",
        "Content-Type": "application/json"
    }
    return True


def test_auth_login_invalid_credentials(ctx: TestContext) -> bool:
    """Test POST /api/auth/login with invalid credentials."""
    payload = {
        "username": ctx.username,
        "password": "WrongPassword123!"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=TIMEOUT)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    return True


def test_auth_get_current_user(ctx: TestContext) -> bool:
    """Test GET /api/auth/me - Get current authenticated user."""
    response = requests.get(f"{BASE_URL}/auth/me", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get current user failed: {response.text}"
    data = response.json()
    assert data["username"] == ctx.username, "Username mismatch"
    return True


def test_auth_get_current_user_no_token(ctx: TestContext) -> bool:
    """Test GET /api/auth/me without authentication token."""
    response = requests.get(f"{BASE_URL}/auth/me", timeout=TIMEOUT)
    assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    return True


# =============================================================================
# BRAND TESTS
# =============================================================================

def test_brand_create(ctx: TestContext) -> bool:
    """Test POST /api/brands - Create new brand."""
    payload = {
        "name": f"TestBrand_{uuid.uuid4().hex[:6]}",
        "description": "Test brand description",
        "isActive": True
    }
    response = requests.post(f"{BASE_URL}/brands", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Brand creation failed: {response.text}"
    data = response.json()
    ctx.brand_id = data["id"]
    return True


def test_brand_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/brands/{id} - Get brand by ID."""
    response = requests.get(f"{BASE_URL}/brands/{ctx.brand_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get brand failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.brand_id, "Brand ID mismatch"
    return True


def test_brand_get_nonexistent(ctx: TestContext) -> bool:
    """Test GET /api/brands/{id} with nonexistent ID."""
    response = requests.get(f"{BASE_URL}/brands/999999", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    return True


def test_brand_update(ctx: TestContext) -> bool:
    """Test PUT /api/brands/{id} - Update brand."""
    payload = {
        "name": f"UpdatedBrand_{uuid.uuid4().hex[:6]}",
        "description": "Updated description",
        "isActive": True
    }
    response = requests.put(f"{BASE_URL}/brands/{ctx.brand_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Brand update failed: {response.text}"
    return True


def test_brand_get_all(ctx: TestContext) -> bool:
    """Test GET /api/brands - Get all brands."""
    response = requests.get(f"{BASE_URL}/brands", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all brands failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_brand_get_active(ctx: TestContext) -> bool:
    """Test GET /api/brands/active - Get active brands."""
    response = requests.get(f"{BASE_URL}/brands/active", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get active brands failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


# =============================================================================
# CATEGORY TESTS
# =============================================================================

def test_category_create(ctx: TestContext) -> bool:
    """Test POST /api/categories - Create new category."""
    payload = {
        "name": f"TestCategory_{uuid.uuid4().hex[:6]}",
        "description": "Test category description",
        "isActive": True
    }
    response = requests.post(f"{BASE_URL}/categories", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Category creation failed: {response.text}"
    data = response.json()
    ctx.category_id = data["id"]
    return True


def test_category_create_subcategory(ctx: TestContext) -> bool:
    """Test POST /api/categories - Create subcategory with parent."""
    payload = {
        "name": f"SubCategory_{uuid.uuid4().hex[:6]}",
        "description": "Subcategory description",
        "parentId": ctx.category_id,
        "isActive": True
    }
    response = requests.post(f"{BASE_URL}/categories", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Subcategory creation failed: {response.text}"
    data = response.json()
    ctx.subcategory_id = data["id"]
    return True


def test_category_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/categories/{id} - Get category by ID."""
    response = requests.get(f"{BASE_URL}/categories/{ctx.category_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get category failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.category_id, "Category ID mismatch"
    return True


def test_category_update(ctx: TestContext) -> bool:
    """Test PUT /api/categories/{id} - Update category."""
    payload = {
        "name": f"UpdatedCategory_{uuid.uuid4().hex[:6]}",
        "description": "Updated category description",
        "isActive": True
    }
    response = requests.put(f"{BASE_URL}/categories/{ctx.category_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Category update failed: {response.text}"
    return True


def test_category_get_all(ctx: TestContext) -> bool:
    """Test GET /api/categories - Get all categories."""
    response = requests.get(f"{BASE_URL}/categories", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all categories failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_category_get_active(ctx: TestContext) -> bool:
    """Test GET /api/categories/active - Get active categories."""
    response = requests.get(f"{BASE_URL}/categories/active", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get active categories failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_category_get_roots(ctx: TestContext) -> bool:
    """Test GET /api/categories/roots - Get root categories."""
    response = requests.get(f"{BASE_URL}/categories/roots", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get root categories failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_category_get_subcategories(ctx: TestContext) -> bool:
    """Test GET /api/categories/{parentId}/subs - Get subcategories."""
    response = requests.get(f"{BASE_URL}/categories/{ctx.category_id}/subs", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get subcategories failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


# =============================================================================
# CUSTOMER TESTS
# =============================================================================

def test_customer_create(ctx: TestContext) -> bool:
    """Test POST /api/customers - Create new customer."""
    payload = {
        "name": f"Test Customer {uuid.uuid4().hex[:6]}",
        "email": f"customer_{uuid.uuid4().hex[:8]}@example.com",
        "phoneNumber": "9876543210",
        "customerType": "WHOLESALE",
        "company": "Test Company",
        "billingAddress": "123 Test Street",
        "city": "Test City",
        "state": "Test State",
        "pincode": "123456"
    }
    response = requests.post(f"{BASE_URL}/customers", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Customer creation failed: {response.text}"
    data = response.json()
    ctx.customer_id = data["id"]
    return True


def test_customer_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/customers/{id} - Get customer by ID."""
    response = requests.get(f"{BASE_URL}/customers/{ctx.customer_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get customer failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.customer_id, "Customer ID mismatch"
    return True


def test_customer_update(ctx: TestContext) -> bool:
    """Test PUT /api/customers/{id} - Update customer."""
    payload = {
        "name": f"Updated Customer {uuid.uuid4().hex[:6]}",
        "email": f"updated_{uuid.uuid4().hex[:8]}@example.com",
        "phoneNumber": "9876543211",
        "customerType": "RETAIL",
        "company": "Updated Company",
        "billingAddress": "456 Updated Street",
        "city": "Updated City",
        "state": "Updated State",
        "pincode": "654321"
    }
    response = requests.put(f"{BASE_URL}/customers/{ctx.customer_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Customer update failed: {response.text}"
    return True


def test_customer_get_all(ctx: TestContext) -> bool:
    """Test GET /api/customers - Get all customers (paginated)."""
    response = requests.get(f"{BASE_URL}/customers", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all customers failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_customer_search(ctx: TestContext) -> bool:
    """Test GET /api/customers/search - Search customers."""
    response = requests.get(f"{BASE_URL}/customers/search?query=Test", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Customer search failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_customer_get_active(ctx: TestContext) -> bool:
    """Test GET /api/customers/active - Get active customers."""
    response = requests.get(f"{BASE_URL}/customers/active", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get active customers failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_customer_get_by_type(ctx: TestContext) -> bool:
    """Test GET /api/customers/type/{type} - Get customers by type."""
    response = requests.get(f"{BASE_URL}/customers/type/WHOLESALE", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get customers by type failed: {response.text}"
    return True


# =============================================================================
# PRODUCT TESTS
# =============================================================================

def test_product_create(ctx: TestContext) -> bool:
    """Test POST /api/products - Create new product."""
    payload = {
        "name": f"Test Product {uuid.uuid4().hex[:6]}",
        "sku": f"SKU-{uuid.uuid4().hex[:8]}",
        "description": "Test product description",
        "categoryId": ctx.category_id,
        "brandId": ctx.brand_id,
        "mrp": 1000.00,
        "sellingPrice": 850.00,
        "stockQuantity": 100,
        "reorderLevel": 10,
        "unit": "pieces",
        "isActive": True,
        "isFeatured": False
    }
    response = requests.post(f"{BASE_URL}/products", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 201, f"Product creation failed: {response.text}"
    data = response.json()
    ctx.product_id = data["id"]
    return True


def test_product_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/products/{id} - Get product by ID."""
    response = requests.get(f"{BASE_URL}/products/{ctx.product_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get product failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.product_id, "Product ID mismatch"
    return True


def test_product_update(ctx: TestContext) -> bool:
    """Test PUT /api/products/{id} - Update product."""
    payload = {
        "name": f"Updated Product {uuid.uuid4().hex[:6]}",
        "sku": f"SKU-UP-{uuid.uuid4().hex[:6]}",
        "description": "Updated product description",
        "categoryId": ctx.category_id,
        "brandId": ctx.brand_id,
        "mrp": 1200.00,
        "sellingPrice": 999.00,
        "stockQuantity": 150,
        "reorderLevel": 15,
        "unit": "pieces",
        "isActive": True,
        "isFeatured": True
    }
    response = requests.put(f"{BASE_URL}/products/{ctx.product_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Product update failed: {response.text}"
    return True


def test_product_get_all(ctx: TestContext) -> bool:
    """Test GET /api/products - Get all products (paginated)."""
    response = requests.get(f"{BASE_URL}/products", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all products failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_product_search(ctx: TestContext) -> bool:
    """Test GET /api/products/search - Search products."""
    response = requests.get(f"{BASE_URL}/products/search?query=Test", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Product search failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_product_get_by_category(ctx: TestContext) -> bool:
    """Test GET /api/products/category/{categoryId} - Get products by category."""
    response = requests.get(f"{BASE_URL}/products/category/{ctx.category_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get products by category failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_product_get_by_brand(ctx: TestContext) -> bool:
    """Test GET /api/products/brand/{brandId} - Get products by brand."""
    response = requests.get(f"{BASE_URL}/products/brand/{ctx.brand_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get products by brand failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_product_get_low_stock(ctx: TestContext) -> bool:
    """Test GET /api/products/low-stock - Get low stock products."""
    response = requests.get(f"{BASE_URL}/products/low-stock", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get low stock products failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_product_get_featured(ctx: TestContext) -> bool:
    """Test GET /api/products/featured - Get featured products."""
    response = requests.get(f"{BASE_URL}/products/featured", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get featured products failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_product_update_stock(ctx: TestContext) -> bool:
    """Test PATCH /api/products/{id}/stock - Update product stock."""
    response = requests.patch(
        f"{BASE_URL}/products/{ctx.product_id}/stock?quantity=200",
        headers=ctx.headers,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Update stock failed: {response.text}"
    return True


# =============================================================================
# QUOTATION TESTS
# =============================================================================

def test_quotation_create(ctx: TestContext) -> bool:
    """Test POST /api/quotations - Create new quotation."""
    today = datetime.now().strftime("%Y-%m-%d")
    valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    payload = {
        "customerId": ctx.customer_id,
        "quotationDate": today,
        "validUntil": valid_until,
        "notes": "Test quotation",
        "items": [
            {
                "productId": ctx.product_id,
                "quantity": 5,
                "unitPrice": 850.00
            }
        ]
    }
    response = requests.post(f"{BASE_URL}/quotations", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code in [200, 201], f"Quotation creation failed: {response.text}"
    data = response.json()
    ctx.quotation_id = data["id"]
    return True


def test_quotation_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/quotations/{id} - Get quotation by ID."""
    response = requests.get(f"{BASE_URL}/quotations/{ctx.quotation_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get quotation failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.quotation_id, "Quotation ID mismatch"
    return True


def test_quotation_update(ctx: TestContext) -> bool:
    """Test PUT /api/quotations/{id} - Update quotation."""
    today = datetime.now().strftime("%Y-%m-%d")
    valid_until = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
    
    payload = {
        "customerId": ctx.customer_id,
        "quotationDate": today,
        "validUntil": valid_until,
        "notes": "Updated test quotation",
        "items": [
            {
                "productId": ctx.product_id,
                "quantity": 10,
                "unitPrice": 800.00
            }
        ]
    }
    response = requests.put(f"{BASE_URL}/quotations/{ctx.quotation_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Quotation update failed: {response.text}"
    return True


def test_quotation_get_all(ctx: TestContext) -> bool:
    """Test GET /api/quotations - Get all quotations (paginated)."""
    response = requests.get(f"{BASE_URL}/quotations", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all quotations failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_quotation_update_status(ctx: TestContext) -> bool:
    """Test PATCH /api/quotations/{id}/status - Update quotation status."""
    response = requests.patch(
        f"{BASE_URL}/quotations/{ctx.quotation_id}/status?status=ACCEPTED",
        headers=ctx.headers,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Update quotation status failed: {response.text}"
    return True


def test_quotation_get_by_customer(ctx: TestContext) -> bool:
    """Test GET /api/quotations/customer/{customerId} - Get quotations by customer."""
    response = requests.get(f"{BASE_URL}/quotations/customer/{ctx.customer_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get quotations by customer failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


# =============================================================================
# ORDER TESTS
# =============================================================================

def test_order_create_from_quotation(ctx: TestContext) -> bool:
    """Test POST /api/orders/from-quotation/{quotationId} - Create order from quotation."""
    response = requests.post(
        f"{BASE_URL}/orders/from-quotation/{ctx.quotation_id}",
        headers=ctx.headers,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Order creation from quotation failed: {response.text}"
    data = response.json()
    ctx.order_id = data["id"]
    return True


def test_order_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/orders/{id} - Get order by ID."""
    response = requests.get(f"{BASE_URL}/orders/{ctx.order_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get order failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.order_id, "Order ID mismatch"
    return True


def test_order_update(ctx: TestContext) -> bool:
    """Test PUT /api/orders/{id} - Update order."""
    today = datetime.now().strftime("%Y-%m-%d")
    delivery_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    payload = {
        "customerId": ctx.customer_id,
        "orderDate": today,
        "deliveryDate": delivery_date,
        "shippingAddress": "456 Delivery Street",
        "notes": "Updated order notes",
        "items": [
            {
                "productId": ctx.product_id,
                "quantity": 8,
                "unitPrice": 850.00
            }
        ]
    }
    response = requests.put(f"{BASE_URL}/orders/{ctx.order_id}", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Order update failed: {response.text}"
    return True


def test_order_get_all(ctx: TestContext) -> bool:
    """Test GET /api/orders - Get all orders (paginated)."""
    response = requests.get(f"{BASE_URL}/orders", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all orders failed: {response.text}"
    data = response.json()
    assert "content" in data, "Response should be paginated with 'content'"
    return True


def test_order_update_status(ctx: TestContext) -> bool:
    """Test PATCH /api/orders/{id}/status - Update order status."""
    response = requests.patch(
        f"{BASE_URL}/orders/{ctx.order_id}/status?status=CONFIRMED",
        headers=ctx.headers,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Update order status failed: {response.text}"
    return True


def test_order_update_payment_status(ctx: TestContext) -> bool:
    """Test PATCH /api/orders/{id}/payment-status - Update payment status."""
    response = requests.patch(
        f"{BASE_URL}/orders/{ctx.order_id}/payment-status?status=PARTIAL",
        headers=ctx.headers,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Update payment status failed: {response.text}"
    return True


def test_order_get_by_customer(ctx: TestContext) -> bool:
    """Test GET /api/orders/customer/{customerId} - Get orders by customer."""
    response = requests.get(f"{BASE_URL}/orders/customer/{ctx.customer_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get orders by customer failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_order_create_direct(ctx: TestContext) -> bool:
    """Test POST /api/orders - Create order directly."""
    today = datetime.now().strftime("%Y-%m-%d")
    delivery_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    
    payload = {
        "customerId": ctx.customer_id,
        "orderDate": today,
        "deliveryDate": delivery_date,
        "shippingAddress": "789 Direct Street",
        "notes": "Direct order test",
        "items": [
            {
                "productId": ctx.product_id,
                "quantity": 3,
                "unitPrice": 850.00
            }
        ]
    }
    response = requests.post(f"{BASE_URL}/orders", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Direct order creation failed: {response.text}"
    return True


# =============================================================================
# PAYMENT TESTS
# =============================================================================

def test_payment_record(ctx: TestContext) -> bool:
    """Test POST /api/payments - Record new payment."""
    today = datetime.now().strftime("%Y-%m-%d")
    
    payload = {
        "orderId": ctx.order_id,
        "paymentDate": today,
        "amount": 2000.00,
        "paymentMethod": "CASH",
        "notes": "Test payment"
    }
    response = requests.post(f"{BASE_URL}/payments", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Payment recording failed: {response.text}"
    data = response.json()
    ctx.payment_id = data["id"]
    return True


def test_payment_get_by_id(ctx: TestContext) -> bool:
    """Test GET /api/payments/{id} - Get payment by ID."""
    response = requests.get(f"{BASE_URL}/payments/{ctx.payment_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get payment failed: {response.text}"
    data = response.json()
    assert data["id"] == ctx.payment_id, "Payment ID mismatch"
    return True


def test_payment_get_by_order(ctx: TestContext) -> bool:
    """Test GET /api/payments/order/{orderId} - Get payments by order."""
    response = requests.get(f"{BASE_URL}/payments/order/{ctx.order_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get payments by order failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


def test_payment_get_all(ctx: TestContext) -> bool:
    """Test GET /api/payments - Get all payments."""
    response = requests.get(f"{BASE_URL}/payments", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get all payments failed: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    return True


# =============================================================================
# DASHBOARD TESTS
# =============================================================================

def test_dashboard_stats(ctx: TestContext) -> bool:
    """Test GET /api/dashboard/stats - Get dashboard statistics."""
    response = requests.get(f"{BASE_URL}/dashboard/stats", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 200, f"Get dashboard stats failed: {response.text}"
    data = response.json()
    # Dashboard should contain various aggregated statistics
    assert isinstance(data, dict), "Response should be a dictionary"
    return True


# =============================================================================
# CLEANUP/DELETE TESTS
# =============================================================================

def test_payment_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/payments/{id} - Delete payment."""
    response = requests.delete(f"{BASE_URL}/payments/{ctx.payment_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 204, f"Payment deletion failed: {response.status_code}"
    return True


def test_order_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/orders/{id} - Delete order."""
    response = requests.delete(f"{BASE_URL}/orders/{ctx.order_id}", headers=ctx.headers, timeout=TIMEOUT)
    assert response.status_code == 204, f"Order deletion failed: {response.status_code}"
    return True


def test_quotation_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/quotations/{id} - Delete quotation."""
    # Create a new quotation for deletion (since original was converted to order)
    today = datetime.now().strftime("%Y-%m-%d")
    valid_until = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    payload = {
        "customerId": ctx.customer_id,
        "quotationDate": today,
        "validUntil": valid_until,
        "notes": "Quotation for deletion test",
        "items": [
            {
                "productId": ctx.product_id,
                "quantity": 1,
                "unitPrice": 850.00
            }
        ]
    }
    create_res = requests.post(f"{BASE_URL}/quotations", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    if create_res.status_code in [200, 201]:
        quotation_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/quotations/{quotation_id}", headers=ctx.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Quotation deletion failed: {response.status_code}"
    return True


def test_product_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/products/{id} - Delete product."""
    # Create a new product for deletion test
    payload = {
        "name": f"Product To Delete {uuid.uuid4().hex[:6]}",
        "sku": f"DEL-{uuid.uuid4().hex[:8]}",
        "categoryId": ctx.category_id,
        "brandId": ctx.brand_id,
        "mrp": 500.00,
        "sellingPrice": 400.00,
        "stockQuantity": 10
    }
    create_res = requests.post(f"{BASE_URL}/products", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    if create_res.status_code == 201:
        product_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/products/{product_id}", headers=ctx.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Product deletion failed: {response.status_code}"
    return True


def test_customer_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/customers/{id} - Delete customer."""
    # Create a new customer for deletion test
    payload = {
        "name": f"Customer To Delete {uuid.uuid4().hex[:6]}",
        "email": f"delete_{uuid.uuid4().hex[:8]}@example.com",
        "phoneNumber": "1111111111",
        "customerType": "RETAIL"
    }
    create_res = requests.post(f"{BASE_URL}/customers", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    if create_res.status_code == 201:
        customer_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/customers/{customer_id}", headers=ctx.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Customer deletion failed: {response.status_code}"
    return True


def test_category_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/categories/{id} - Delete category."""
    # Create a new category for deletion test
    payload = {
        "name": f"Category To Delete {uuid.uuid4().hex[:6]}",
        "description": "For deletion test"
    }
    create_res = requests.post(f"{BASE_URL}/categories", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    if create_res.status_code == 201:
        category_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/categories/{category_id}", headers=ctx.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Category deletion failed: {response.status_code}"
    return True


def test_brand_delete(ctx: TestContext) -> bool:
    """Test DELETE /api/brands/{id} - Delete brand."""
    # Create a new brand for deletion test
    payload = {
        "name": f"Brand To Delete {uuid.uuid4().hex[:6]}",
        "description": "For deletion test"
    }
    create_res = requests.post(f"{BASE_URL}/brands", headers=ctx.headers, json=payload, timeout=TIMEOUT)
    if create_res.status_code == 201:
        brand_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/brands/{brand_id}", headers=ctx.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Brand deletion failed: {response.status_code}"
    return True


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def run_all_tests():
    """Execute all API tests in sequence."""
    print("\n" + "=" * 60)
    print("SANITARYWARE CRM - COMPREHENSIVE API TEST SUITE")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    runner = TestRunner()
    ctx = TestContext()
    
    # =========================================================================
    # AUTHENTICATION TESTS
    # =========================================================================
    print("\n📋 [1/9] AUTHENTICATION TESTS")
    print("-" * 40)
    runner.run_test("GET /api/auth/test - Health check", test_auth_health, ctx)
    runner.run_test("POST /api/auth/register - Register user", test_auth_register, ctx)
    runner.run_test("POST /api/auth/register - Duplicate username", test_auth_register_duplicate_username, ctx)
    runner.run_test("POST /api/auth/login - Valid credentials", test_auth_login, ctx)
    runner.run_test("POST /api/auth/login - Invalid credentials", test_auth_login_invalid_credentials, ctx)
    runner.run_test("GET /api/auth/me - With token", test_auth_get_current_user, ctx)
    runner.run_test("GET /api/auth/me - Without token", test_auth_get_current_user_no_token, ctx)
    
    # Check if we have authentication before continuing
    if not ctx.token:
        print("\n⚠️  Cannot continue without authentication. Exiting.")
        runner.print_summary()
        return False
    
    # =========================================================================
    # BRAND TESTS
    # =========================================================================
    print("\n📋 [2/9] BRAND TESTS")
    print("-" * 40)
    runner.run_test("POST /api/brands - Create brand", test_brand_create, ctx)
    runner.run_test("GET /api/brands/{id} - Get by ID", test_brand_get_by_id, ctx)
    runner.run_test("GET /api/brands/{id} - Nonexistent ID", test_brand_get_nonexistent, ctx)
    runner.run_test("PUT /api/brands/{id} - Update brand", test_brand_update, ctx)
    runner.run_test("GET /api/brands - Get all brands", test_brand_get_all, ctx)
    runner.run_test("GET /api/brands/active - Get active brands", test_brand_get_active, ctx)
    
    # =========================================================================
    # CATEGORY TESTS
    # =========================================================================
    print("\n📋 [3/9] CATEGORY TESTS")
    print("-" * 40)
    runner.run_test("POST /api/categories - Create category", test_category_create, ctx)
    runner.run_test("POST /api/categories - Create subcategory", test_category_create_subcategory, ctx)
    runner.run_test("GET /api/categories/{id} - Get by ID", test_category_get_by_id, ctx)
    runner.run_test("PUT /api/categories/{id} - Update category", test_category_update, ctx)
    runner.run_test("GET /api/categories - Get all categories", test_category_get_all, ctx)
    runner.run_test("GET /api/categories/active - Get active categories", test_category_get_active, ctx)
    runner.run_test("GET /api/categories/roots - Get root categories", test_category_get_roots, ctx)
    runner.run_test("GET /api/categories/{id}/subs - Get subcategories", test_category_get_subcategories, ctx)
    
    # =========================================================================
    # CUSTOMER TESTS
    # =========================================================================
    print("\n📋 [4/9] CUSTOMER TESTS")
    print("-" * 40)
    runner.run_test("POST /api/customers - Create customer", test_customer_create, ctx)
    runner.run_test("GET /api/customers/{id} - Get by ID", test_customer_get_by_id, ctx)
    runner.run_test("PUT /api/customers/{id} - Update customer", test_customer_update, ctx)
    runner.run_test("GET /api/customers - Get all (paginated)", test_customer_get_all, ctx)
    runner.run_test("GET /api/customers/search - Search", test_customer_search, ctx)
    runner.run_test("GET /api/customers/active - Get active", test_customer_get_active, ctx)
    runner.run_test("GET /api/customers/type/{type} - Get by type", test_customer_get_by_type, ctx)
    
    # =========================================================================
    # PRODUCT TESTS
    # =========================================================================
    print("\n📋 [5/9] PRODUCT TESTS")
    print("-" * 40)
    runner.run_test("POST /api/products - Create product", test_product_create, ctx)
    runner.run_test("GET /api/products/{id} - Get by ID", test_product_get_by_id, ctx)
    runner.run_test("PUT /api/products/{id} - Update product", test_product_update, ctx)
    runner.run_test("GET /api/products - Get all (paginated)", test_product_get_all, ctx)
    runner.run_test("GET /api/products/search - Search", test_product_search, ctx)
    runner.run_test("GET /api/products/category/{id} - Get by category", test_product_get_by_category, ctx)
    runner.run_test("GET /api/products/brand/{id} - Get by brand", test_product_get_by_brand, ctx)
    runner.run_test("GET /api/products/low-stock - Get low stock", test_product_get_low_stock, ctx)
    runner.run_test("GET /api/products/featured - Get featured", test_product_get_featured, ctx)
    runner.run_test("PATCH /api/products/{id}/stock - Update stock", test_product_update_stock, ctx)
    
    # =========================================================================
    # QUOTATION TESTS
    # =========================================================================
    print("\n📋 [6/9] QUOTATION TESTS")
    print("-" * 40)
    runner.run_test("POST /api/quotations - Create quotation", test_quotation_create, ctx)
    runner.run_test("GET /api/quotations/{id} - Get by ID", test_quotation_get_by_id, ctx)
    runner.run_test("PUT /api/quotations/{id} - Update quotation", test_quotation_update, ctx)
    runner.run_test("GET /api/quotations - Get all (paginated)", test_quotation_get_all, ctx)
    runner.run_test("PATCH /api/quotations/{id}/status - Update status", test_quotation_update_status, ctx)
    runner.run_test("GET /api/quotations/customer/{id} - Get by customer", test_quotation_get_by_customer, ctx)
    
    # =========================================================================
    # ORDER TESTS
    # =========================================================================
    print("\n📋 [7/9] ORDER TESTS")
    print("-" * 40)
    runner.run_test("POST /api/orders/from-quotation/{id} - Create from quotation", test_order_create_from_quotation, ctx)
    runner.run_test("GET /api/orders/{id} - Get by ID", test_order_get_by_id, ctx)
    runner.run_test("PUT /api/orders/{id} - Update order", test_order_update, ctx)
    runner.run_test("GET /api/orders - Get all (paginated)", test_order_get_all, ctx)
    runner.run_test("PATCH /api/orders/{id}/status - Update status", test_order_update_status, ctx)
    runner.run_test("PATCH /api/orders/{id}/payment-status - Update payment status", test_order_update_payment_status, ctx)
    runner.run_test("GET /api/orders/customer/{id} - Get by customer", test_order_get_by_customer, ctx)
    runner.run_test("POST /api/orders - Create direct order", test_order_create_direct, ctx)
    
    # =========================================================================
    # PAYMENT TESTS
    # =========================================================================
    print("\n📋 [8/9] PAYMENT TESTS")
    print("-" * 40)
    runner.run_test("POST /api/payments - Record payment", test_payment_record, ctx)
    runner.run_test("GET /api/payments/{id} - Get by ID", test_payment_get_by_id, ctx)
    runner.run_test("GET /api/payments/order/{id} - Get by order", test_payment_get_by_order, ctx)
    runner.run_test("GET /api/payments - Get all", test_payment_get_all, ctx)
    
    # =========================================================================
    # DASHBOARD TESTS
    # =========================================================================
    print("\n📋 [9/9] DASHBOARD TESTS")
    print("-" * 40)
    runner.run_test("GET /api/dashboard/stats - Get statistics", test_dashboard_stats, ctx)
    
    # =========================================================================
    # CLEANUP/DELETE TESTS
    # =========================================================================
    print("\n📋 CLEANUP - DELETE TESTS")
    print("-" * 40)
    runner.run_test("DELETE /api/payments/{id} - Delete payment", test_payment_delete, ctx)
    runner.run_test("DELETE /api/orders/{id} - Delete order", test_order_delete, ctx)
    runner.run_test("DELETE /api/quotations/{id} - Delete quotation", test_quotation_delete, ctx)
    runner.run_test("DELETE /api/products/{id} - Delete product", test_product_delete, ctx)
    runner.run_test("DELETE /api/customers/{id} - Delete customer", test_customer_delete, ctx)
    runner.run_test("DELETE /api/categories/{id} - Delete category", test_category_delete, ctx)
    runner.run_test("DELETE /api/brands/{id} - Delete brand", test_brand_delete, ctx)
    
    # Print summary
    success = runner.print_summary()
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    return success


if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to server at", BASE_URL)
        print("Please ensure the backend server is running.")
        exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user.")
        exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        exit(1)
