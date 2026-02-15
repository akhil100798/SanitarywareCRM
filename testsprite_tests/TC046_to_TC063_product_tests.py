"""
Product API Test Cases
Tests for /api/products/* endpoints
"""
import requests
import uuid

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


class ProductTests:
    """Test cases for Product endpoints."""
    
    def __init__(self, headers: dict, brand_id: int, category_id: int):
        self.headers = headers
        self.brand_id = brand_id
        self.category_id = category_id
        self.product_id = None
        self.product_sku = None
    
    def test_create_product(self) -> bool:
        """TC046: Test POST /api/products - Create new product with all fields."""
        self.product_sku = f"SKU-{uuid.uuid4().hex[:8]}"
        payload = {
            "name": f"Test Product {uuid.uuid4().hex[:6]}",
            "sku": self.product_sku,
            "description": "Premium sanitaryware product for testing",
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 1500.00,
            "sellingPrice": 1200.00,
            "stockQuantity": 100,
            "reorderLevel": 10,
            "unit": "pieces",
            "color": "White",
            "material": "Ceramic",
            "size": "Medium",
            "isActive": True,
            "isFeatured": False
        }
        response = requests.post(f"{BASE_URL}/products", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["sku"] == self.product_sku, "SKU mismatch"
        
        self.product_id = data["id"]
        print(f"Created product ID: {self.product_id}")
        return True
    
    def test_create_product_minimal(self) -> bool:
        """TC047: Test POST /api/products - Create product with minimal fields."""
        payload = {
            "name": f"Minimal Product {uuid.uuid4().hex[:6]}",
            "sku": f"MIN-{uuid.uuid4().hex[:8]}",
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 500.00,
            "sellingPrice": 400.00,
            "stockQuantity": 50
        }
        response = requests.post(f"{BASE_URL}/products", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        return True
    
    def test_create_product_duplicate_sku(self) -> bool:
        """TC048: Test POST /api/products - Create product with duplicate SKU."""
        assert self.product_sku is not None, "Product SKU not set"
        
        payload = {
            "name": "Duplicate SKU Product",
            "sku": self.product_sku,  # Reuse existing SKU
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 600.00,
            "sellingPrice": 500.00,
            "stockQuantity": 20
        }
        response = requests.post(f"{BASE_URL}/products", headers=self.headers, json=payload, timeout=TIMEOUT)
        # Should fail with conflict or bad request
        assert response.status_code in [400, 409], f"Expected 400/409 for duplicate SKU, got {response.status_code}"
        return True
    
    def test_create_product_invalid_price(self) -> bool:
        """TC049: Test POST /api/products - Create product with selling > MRP."""
        payload = {
            "name": "Invalid Price Product",
            "sku": f"INV-{uuid.uuid4().hex[:8]}",
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 100.00,
            "sellingPrice": 200.00,  # Greater than MRP - may be invalid
            "stockQuantity": 10
        }
        response = requests.post(f"{BASE_URL}/products", headers=self.headers, json=payload, timeout=TIMEOUT)
        # Accept either success (if allowed) or validation error
        assert response.status_code in [201, 400], f"Unexpected status: {response.status_code}"
        return True
    
    def test_get_product_by_id(self) -> bool:
        """TC050: Test GET /api/products/{id} - Get product by valid ID."""
        assert self.product_id is not None, "Product ID not set"
        
        response = requests.get(f"{BASE_URL}/products/{self.product_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == self.product_id, "Product ID mismatch"
        assert "brandName" in data, "Should include brand name"
        assert "categoryName" in data, "Should include category name"
        return True
    
    def test_get_product_nonexistent(self) -> bool:
        """TC051: Test GET /api/products/{id} - Get nonexistent product."""
        response = requests.get(f"{BASE_URL}/products/999999", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        return True
    
    def test_update_product(self) -> bool:
        """TC052: Test PUT /api/products/{id} - Update existing product."""
        assert self.product_id is not None, "Product ID not set"
        
        payload = {
            "name": f"Updated Product {uuid.uuid4().hex[:6]}",
            "sku": f"UPD-{uuid.uuid4().hex[:8]}",
            "description": "Updated product description",
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 1800.00,
            "sellingPrice": 1500.00,
            "stockQuantity": 150,
            "reorderLevel": 20,
            "unit": "pieces",
            "color": "Ivory",
            "isActive": True,
            "isFeatured": True
        }
        response = requests.put(f"{BASE_URL}/products/{self.product_id}", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["isFeatured"] == True, "Featured flag not updated"
        return True
    
    def test_get_all_products(self) -> bool:
        """TC053: Test GET /api/products - Get all products (paginated)."""
        response = requests.get(f"{BASE_URL}/products", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated with 'content'"
        return True
    
    def test_get_all_products_pagination(self) -> bool:
        """TC054: Test GET /api/products - Test pagination and sorting."""
        response = requests.get(f"{BASE_URL}/products?page=0&size=10&sort=name,asc", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "size" in data, "Response should have size info"
        return True
    
    def test_search_products(self) -> bool:
        """TC055: Test GET /api/products/search - Search products."""
        response = requests.get(f"{BASE_URL}/products/search?query=Test", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated"
        return True
    
    def test_search_products_by_sku(self) -> bool:
        """TC056: Test GET /api/products/search - Search by SKU prefix."""
        response = requests.get(f"{BASE_URL}/products/search?query=SKU", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return True
    
    def test_get_products_by_category(self) -> bool:
        """TC057: Test GET /api/products/category/{categoryId} - Get products by category."""
        response = requests.get(f"{BASE_URL}/products/category/{self.category_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated"
        return True
    
    def test_get_products_by_brand(self) -> bool:
        """TC058: Test GET /api/products/brand/{brandId} - Get products by brand."""
        response = requests.get(f"{BASE_URL}/products/brand/{self.brand_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "content" in data, "Response should be paginated"
        return True
    
    def test_get_low_stock_products(self) -> bool:
        """TC059: Test GET /api/products/low-stock - Get low stock products."""
        response = requests.get(f"{BASE_URL}/products/low-stock", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        return True
    
    def test_get_featured_products(self) -> bool:
        """TC060: Test GET /api/products/featured - Get featured products."""
        response = requests.get(f"{BASE_URL}/products/featured", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All returned products should be featured
        for product in data:
            if "isFeatured" in product:
                assert product["isFeatured"] == True, "Non-featured product returned"
        return True
    
    def test_update_stock(self) -> bool:
        """TC061: Test PATCH /api/products/{id}/stock - Update product stock."""
        assert self.product_id is not None, "Product ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/products/{self.product_id}/stock?quantity=500",
            headers=self.headers,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify stock was updated
        get_res = requests.get(f"{BASE_URL}/products/{self.product_id}", headers=self.headers, timeout=TIMEOUT)
        if get_res.status_code == 200:
            data = get_res.json()
            assert data["stockQuantity"] == 500, "Stock quantity not updated"
        return True
    
    def test_update_stock_negative(self) -> bool:
        """TC062: Test PATCH /api/products/{id}/stock - Update with negative quantity."""
        assert self.product_id is not None, "Product ID not set"
        
        response = requests.patch(
            f"{BASE_URL}/products/{self.product_id}/stock?quantity=-10",
            headers=self.headers,
            timeout=TIMEOUT
        )
        # Should either fail validation or allow (for adjustments)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        return True
    
    def test_delete_product(self) -> bool:
        """TC063: Test DELETE /api/products/{id} - Delete product."""
        # Create a product specifically for deletion
        payload = {
            "name": f"DeleteProduct_{uuid.uuid4().hex[:6]}",
            "sku": f"DEL-{uuid.uuid4().hex[:8]}",
            "categoryId": self.category_id,
            "brandId": self.brand_id,
            "mrp": 300.00,
            "sellingPrice": 250.00,
            "stockQuantity": 5
        }
        create_res = requests.post(f"{BASE_URL}/products", headers=self.headers, json=payload, timeout=TIMEOUT)
        assert create_res.status_code == 201, "Failed to create product for deletion test"
        
        product_id = create_res.json()["id"]
        response = requests.delete(f"{BASE_URL}/products/{product_id}", headers=self.headers, timeout=TIMEOUT)
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        
        # Verify it's deleted
        verify_res = requests.get(f"{BASE_URL}/products/{product_id}", headers=self.headers, timeout=TIMEOUT)
        assert verify_res.status_code == 404, "Product should not exist after deletion"
        return True


def run_product_tests(headers: dict, brand_id: int, category_id: int) -> tuple:
    """Run all product tests and return (passed, failed) counts."""
    tests = ProductTests(headers, brand_id, category_id)
    passed = 0
    failed = 0
    
    test_methods = [
        ("TC046: Create product full", tests.test_create_product),
        ("TC047: Create product minimal", tests.test_create_product_minimal),
        ("TC048: Create product duplicate SKU", tests.test_create_product_duplicate_sku),
        ("TC049: Create product invalid price", tests.test_create_product_invalid_price),
        ("TC050: Get product by ID", tests.test_get_product_by_id),
        ("TC051: Get product nonexistent", tests.test_get_product_nonexistent),
        ("TC052: Update product", tests.test_update_product),
        ("TC053: Get all products", tests.test_get_all_products),
        ("TC054: Get all products pagination", tests.test_get_all_products_pagination),
        ("TC055: Search products", tests.test_search_products),
        ("TC056: Search products by SKU", tests.test_search_products_by_sku),
        ("TC057: Get products by category", tests.test_get_products_by_category),
        ("TC058: Get products by brand", tests.test_get_products_by_brand),
        ("TC059: Get low stock products", tests.test_get_low_stock_products),
        ("TC060: Get featured products", tests.test_get_featured_products),
        ("TC061: Update stock", tests.test_update_stock),
        ("TC062: Update stock negative", tests.test_update_stock_negative),
        ("TC063: Delete product", tests.test_delete_product),
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
    print("Product API Tests require authentication headers, brand_id, and category_id.")
    print("Please run through the main test suite.")
