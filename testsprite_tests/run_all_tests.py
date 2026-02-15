"""
Comprehensive Test Runner for SanitarywareCRM
This script runs all individual test modules and generates a summary report.

Test Case Coverage:
- TC001-TC008: Authentication (existing)
- TC009-TC018: Brand API
- TC019-TC030: Category API  
- TC031-TC045: Customer API
- TC046-TC063: Product API
- TC064-TC083: Quotation & Order API
- TC084-TC097: Payment & Dashboard API

Usage: python run_all_tests.py
"""

import requests
import uuid
import sys
from datetime import datetime

BASE_URL = "http://localhost:8080/api"
TIMEOUT = 30


def setup_authentication():
    """Create a test user and get authentication token."""
    print("🔐 Setting up authentication...")
    
    username = f"testrunner_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"
    password = "SecureTestPass123!"
    
    # Register
    reg_payload = {
        "username": username,
        "email": email,
        "password": password,
        "fullName": "Test Runner User",
        "role": "ADMIN"
    }
    
    try:
        reg_res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload, timeout=TIMEOUT)
        if reg_res.status_code != 201:
            print(f"   Registration failed: {reg_res.text}")
            return None
        print(f"   ✅ Registered user: {username}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Registration error: {e}")
        return None
    
    # Login
    login_payload = {
        "username": username,
        "password": password
    }
    
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=TIMEOUT)
        if login_res.status_code != 200:
            print(f"   Login failed: {login_res.text}")
            return None
        
        data = login_res.json()
        token = data["token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        print(f"   ✅ Logged in successfully")
        return headers
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Login error: {e}")
        return None


def setup_test_data(headers):
    """Create prerequisite test data (brand, category, customer, product)."""
    print("\n📦 Setting up test data...")
    
    context = {}
    
    # Create Brand
    brand_res = requests.post(
        f"{BASE_URL}/brands",
        headers=headers,
        json={"name": f"TestBrand_{uuid.uuid4().hex[:6]}"},
        timeout=TIMEOUT
    )
    if brand_res.status_code == 201:
        context["brand_id"] = brand_res.json()["id"]
        print(f"   ✅ Created brand: {context['brand_id']}")
    else:
        print(f"   ❌ Failed to create brand: {brand_res.text}")
        return None
    
    # Create Category
    cat_res = requests.post(
        f"{BASE_URL}/categories",
        headers=headers,
        json={"name": f"TestCategory_{uuid.uuid4().hex[:6]}"},
        timeout=TIMEOUT
    )
    if cat_res.status_code == 201:
        context["category_id"] = cat_res.json()["id"]
        print(f"   ✅ Created category: {context['category_id']}")
    else:
        print(f"   ❌ Failed to create category: {cat_res.text}")
        return None
    
    # Create Customer
    cust_res = requests.post(
        f"{BASE_URL}/customers",
        headers=headers,
        json={
            "name": f"TestCustomer_{uuid.uuid4().hex[:6]}",
            "email": f"customer_{uuid.uuid4().hex[:8]}@test.com",
            "phoneNumber": "9876543210",
            "customerType": "WHOLESALE"
        },
        timeout=TIMEOUT
    )
    if cust_res.status_code == 201:
        context["customer_id"] = cust_res.json()["id"]
        print(f"   ✅ Created customer: {context['customer_id']}")
    else:
        print(f"   ❌ Failed to create customer: {cust_res.text}")
        return None
    
    # Create Product
    prod_res = requests.post(
        f"{BASE_URL}/products",
        headers=headers,
        json={
            "name": f"TestProduct_{uuid.uuid4().hex[:6]}",
            "sku": f"TST-{uuid.uuid4().hex[:8]}",
            "brandId": context["brand_id"],
            "categoryId": context["category_id"],
            "mrp": 1000.00,
            "sellingPrice": 850.00,
            "stockQuantity": 100
        },
        timeout=TIMEOUT
    )
    if prod_res.status_code == 201:
        context["product_id"] = prod_res.json()["id"]
        print(f"   ✅ Created product: {context['product_id']}")
    else:
        print(f"   ❌ Failed to create product: {prod_res.text}")
        return None
    
    return context


def run_all_test_modules(headers, context):
    """Run all test modules and collect results."""
    total_passed = 0
    total_failed = 0
    
    try:
        # Import test modules
        from TC009_to_TC018_brand_tests import run_brand_tests
        from TC019_to_TC030_category_tests import run_category_tests
        from TC031_to_TC045_customer_tests import run_customer_tests
        from TC046_to_TC063_product_tests import run_product_tests
        from TC064_to_TC083_quotation_order_tests import run_quotation_tests, run_order_tests
        from TC084_to_TC097_payment_dashboard_tests import run_payment_tests, run_dashboard_tests
        
        # Brand Tests
        print("\n" + "=" * 50)
        print("📋 BRAND TESTS (TC009-TC018)")
        print("=" * 50)
        passed, failed = run_brand_tests(headers)
        total_passed += passed
        total_failed += failed
        
        # Category Tests
        print("\n" + "=" * 50)
        print("📋 CATEGORY TESTS (TC019-TC030)")
        print("=" * 50)
        passed, failed = run_category_tests(headers)
        total_passed += passed
        total_failed += failed
        
        # Customer Tests
        print("\n" + "=" * 50)
        print("📋 CUSTOMER TESTS (TC031-TC045)")
        print("=" * 50)
        passed, failed = run_customer_tests(headers)
        total_passed += passed
        total_failed += failed
        
        # Product Tests
        print("\n" + "=" * 50)
        print("📋 PRODUCT TESTS (TC046-TC063)")
        print("=" * 50)
        passed, failed = run_product_tests(headers, context["brand_id"], context["category_id"])
        total_passed += passed
        total_failed += failed
        
        # Quotation Tests
        print("\n" + "=" * 50)
        print("📋 QUOTATION TESTS (TC064-TC072)")
        print("=" * 50)
        passed, failed, quotation_id = run_quotation_tests(headers, context["customer_id"], context["product_id"])
        total_passed += passed
        total_failed += failed
        
        # Order Tests
        print("\n" + "=" * 50)
        print("📋 ORDER TESTS (TC073-TC083)")
        print("=" * 50)
        passed, failed, order_id = run_order_tests(headers, context["customer_id"], context["product_id"], quotation_id)
        total_passed += passed
        total_failed += failed
        
        # Payment Tests
        if order_id:
            print("\n" + "=" * 50)
            print("📋 PAYMENT TESTS (TC084-TC094)")
            print("=" * 50)
            passed, failed = run_payment_tests(headers, order_id)
            total_passed += passed
            total_failed += failed
        
        # Dashboard Tests
        print("\n" + "=" * 50)
        print("📋 DASHBOARD TESTS (TC095-TC097)")
        print("=" * 50)
        passed, failed = run_dashboard_tests(headers)
        total_passed += passed
        total_failed += failed
        
    except ImportError as e:
        print(f"\n⚠️  Could not import test modules: {e}")
        print("Running tests from the main comprehensive file instead...")
        
        # Fallback to running the main test file
        import test_all_endpoints
        return test_all_endpoints.run_all_tests()
    
    return total_passed, total_failed


def main():
    """Main entry point for the test runner."""
    print("\n" + "=" * 60)
    print("   SANITARYWARE CRM - COMPREHENSIVE TEST RUNNER")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Test server connectivity
    try:
        health_res = requests.get(f"{BASE_URL}/auth/test", timeout=5)
        if health_res.status_code != 200:
            print("\n❌ Server health check failed!")
            return 1
        print("✅ Server is reachable")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to server at {BASE_URL}")
        print("Please ensure the backend server is running.")
        return 1
    
    # Setup authentication
    headers = setup_authentication()
    if not headers:
        print("\n❌ Failed to setup authentication. Exiting.")
        return 1
    
    # Setup test data
    context = setup_test_data(headers)
    if not context:
        print("\n❌ Failed to setup test data. Exiting.")
        return 1
    
    # Run all tests
    result = run_all_test_modules(headers, context)
    
    if isinstance(result, tuple):
        passed, failed = result
        total = passed + failed
        
        # Print summary
        print("\n" + "=" * 60)
        print("   TEST EXECUTION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"  ✅ Passed:  {passed} ({100*passed//total if total > 0 else 0}%)")
        print(f"  ❌ Failed:  {failed} ({100*failed//total if total > 0 else 0}%)")
        print("=" * 60)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED!")
            return 0
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please review.")
            return 1
    else:
        # Boolean result from fallback
        return 0 if result else 1


if __name__ == "__main__":
    sys.exit(main())
