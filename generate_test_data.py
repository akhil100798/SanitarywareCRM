#!/usr/bin/env python3
"""
SanitarywareCRM Test Data Generator
Generates comprehensive random test data for all API endpoints
"""

import requests
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Configuration
BASE_URL = "http://localhost:8080/api"
HEADERS = {"Content-Type": "application/json"}

# Global variables to store created IDs
created_users = []
created_brands = []
created_categories = []
created_customers = []
created_products = []
created_quotations = []
created_orders = []
auth_token = None


def set_auth_header(token: str):
    """Set authorization header with JWT token"""
    global HEADERS
    HEADERS["Authorization"] = f"Bearer {token}"


# ============================================================================
# AUTHENTICATION DATA
# ============================================================================

USERS_DATA = [
    {
        "username": "admin",
        "email": "admin@sanitaryware.com",
        "password": "admin123",
        "fullName": "Admin User",
        "phoneNumber": "+919876543210",
        "role": "ADMIN"
    },
    {
        "username": "sales_manager",
        "email": "sales@sanitaryware.com",
        "password": "sales123",
        "fullName": "Rajesh Kumar",
        "phoneNumber": "+919876543211",
        "role": "MANAGER"
    },
    {
        "username": "sales_rep1",
        "email": "rep1@sanitaryware.com",
        "password": "rep123",
        "fullName": "Priya Sharma",
        "phoneNumber": "+919876543212",
        "role": "USER"
    },
    {
        "username": "sales_rep2",
        "email": "rep2@sanitaryware.com",
        "password": "rep123",
        "fullName": "Amit Patel",
        "phoneNumber": "+919876543213",
        "role": "USER"
    },
    {
        "username": "warehouse_staff",
        "email": "warehouse@sanitaryware.com",
        "password": "warehouse123",
        "fullName": "Suresh Reddy",
        "phoneNumber": "+919876543214",
        "role": "USER"
    }
]


# ============================================================================
# BRAND DATA
# ============================================================================

BRANDS_DATA = [
    {"name": "Kohler", "description": "Premium bathroom and kitchen fixtures", "isActive": True},
    {"name": "TOTO", "description": "Japanese luxury sanitaryware brand", "isActive": True},
    {"name": "American Standard", "description": "Trusted bathroom solutions", "isActive": True},
    {"name": "Jaquar", "description": "Complete bathroom solutions", "isActive": True},
    {"name": "Hindware", "description": "India's leading sanitaryware brand", "isActive": True},
    {"name": "Cera", "description": "Innovative bathroom products", "isActive": True},
    {"name": "Parryware", "description": "Quality sanitaryware products", "isActive": True},
    {"name": "Grohe", "description": "German engineering excellence", "isActive": True},
    {"name": "Roca", "description": "Spanish bathroom solutions", "isActive": True},
    {"name": "Duravit", "description": "Designer bathroom ceramics", "isActive": True}
]


# ============================================================================
# CATEGORY DATA
# ============================================================================

CATEGORIES_DATA = [
    {"name": "Toilets & Commodes", "description": "Water closets, commodes, and toilet seats", "isActive": True},
    {"name": "Wash Basins", "description": "Basins, pedestals, and countertops", "isActive": True},
    {"name": "Faucets & Taps", "description": "Basin taps, shower taps, and mixers", "isActive": True},
    {"name": "Showers", "description": "Shower heads, panels, and enclosures", "isActive": True},
    {"name": "Bathtubs", "description": "Freestanding and built-in bathtubs", "isActive": True},
    {"name": "Kitchen Sinks", "description": "Single and double bowl sinks", "isActive": True},
    {"name": "Bathroom Accessories", "description": "Towel rods, soap dishes, and holders", "isActive": True},
    {"name": "Urinals", "description": "Wall-hung and floor-mounted urinals", "isActive": True},
    {"name": "Flush Tanks", "description": "Concealed and exposed flush tanks", "isActive": True},
    {"name": "Mirrors", "description": "Bathroom mirrors and cabinets", "isActive": True}
]


# ============================================================================
# CUSTOMER DATA
# ============================================================================

CUSTOMER_TYPES = ["RETAIL", "WHOLESALE", "CONTRACTOR", "BUILDER"]
INDIAN_CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
    ("Hyderabad", "Telangana"), ("Chennai", "Tamil Nadu"), ("Kolkata", "West Bengal"),
    ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"), ("Surat", "Gujarat"), ("Kanpur", "Uttar Pradesh"),
    ("Nagpur", "Maharashtra"), ("Indore", "Madhya Pradesh"), ("Bhopal", "Madhya Pradesh")
]

CUSTOMER_NAMES = [
    "Rajesh Builders", "Sharma Construction", "Patel Enterprises", "Kumar Interiors",
    "Singh Developers", "Gupta Trading Co", "Mehta Sanitaryware", "Reddy Constructions",
    "Agarwal Builders", "Verma Enterprises", "Jain Trading", "Chopra Developers",
    "Malhotra Interiors", "Bhatia Construction", "Kapoor Builders", "Nair Enterprises",
    "Iyer Constructions", "Desai Trading", "Shah Developers", "Rao Builders",
    "Srinivasan Interiors", "Krishnan Enterprises", "Menon Constructions", "Pillai Builders",
    "Naidu Trading Co", "Raman Developers", "Subramanian Interiors", "Venkat Builders",
    "Lakshmi Enterprises", "Ganesh Constructions"
]


def generate_customers(count: int = 30) -> List[Dict]:
    """Generate random customer data"""
    customers = []
    for i in range(count):
        city, state = random.choice(INDIAN_CITIES)
        customer_type = random.choice(CUSTOMER_TYPES)
        name = CUSTOMER_NAMES[i] if i < len(CUSTOMER_NAMES) else f"Customer {i+1}"
        
        customer = {
            "name": name,
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "phoneNumber": f"+91{random.randint(7000000000, 9999999999)}",
            "alternatePhone": f"+91{random.randint(7000000000, 9999999999)}" if random.random() > 0.5 else None,
            "company": name if customer_type != "RETAIL" else None,
            "gstNumber": f"{random.randint(10, 37)}ABCDE{random.randint(1000, 9999)}F1Z{random.randint(1, 9)}" if customer_type != "RETAIL" else None,
            "customerType": customer_type,
            "billingAddress": f"{random.randint(1, 999)}, {random.choice(['MG Road', 'Park Street', 'Main Road', 'Station Road', 'Market Street'])}, {city}",
            "shippingAddress": f"{random.randint(1, 999)}, {random.choice(['MG Road', 'Park Street', 'Main Road', 'Station Road', 'Market Street'])}, {city}",
            "city": city,
            "state": state,
            "pincode": f"{random.randint(100000, 999999)}",
            "isActive": True,
            "notes": f"Customer since {random.randint(2018, 2024)}"
        }
        customers.append(customer)
    return customers


# ============================================================================
# PRODUCT DATA
# ============================================================================

PRODUCT_TEMPLATES = {
    "Toilets & Commodes": [
        {"name": "Wall Hung Commode", "colors": ["White", "Ivory", "Black"], "materials": ["Ceramic"], "sizes": ["Standard"]},
        {"name": "Floor Mounted WC", "colors": ["White", "Ivory"], "materials": ["Ceramic", "Vitreous China"], "sizes": ["Standard", "Compact"]},
        {"name": "One Piece Toilet", "colors": ["White", "Ivory"], "materials": ["Ceramic"], "sizes": ["Standard"]},
        {"name": "Squatting Pan", "colors": ["White"], "materials": ["Ceramic"], "sizes": ["Standard", "Orissa"]},
    ],
    "Wash Basins": [
        {"name": "Table Top Basin", "colors": ["White", "Black", "Grey"], "materials": ["Ceramic", "Stone"], "sizes": ["Small", "Medium", "Large"]},
        {"name": "Wall Hung Basin", "colors": ["White", "Ivory"], "materials": ["Ceramic"], "sizes": ["Small", "Medium"]},
        {"name": "Pedestal Basin", "colors": ["White", "Ivory"], "materials": ["Ceramic"], "sizes": ["Standard"]},
        {"name": "Counter Basin", "colors": ["White", "Black"], "materials": ["Ceramic", "Granite"], "sizes": ["Medium", "Large"]},
    ],
    "Faucets & Taps": [
        {"name": "Single Lever Basin Mixer", "colors": ["Chrome", "Matte Black", "Gold"], "materials": ["Brass"], "sizes": ["Standard"]},
        {"name": "Pillar Tap", "colors": ["Chrome", "Brass"], "materials": ["Brass"], "sizes": ["Standard"]},
        {"name": "Wall Mixer", "colors": ["Chrome", "Matte Black"], "materials": ["Brass"], "sizes": ["Standard"]},
        {"name": "Sensor Tap", "colors": ["Chrome"], "materials": ["Brass"], "sizes": ["Standard"]},
    ],
    "Showers": [
        {"name": "Rain Shower Head", "colors": ["Chrome", "Matte Black"], "materials": ["Stainless Steel"], "sizes": ["8 inch", "10 inch", "12 inch"]},
        {"name": "Hand Shower", "colors": ["Chrome", "White"], "materials": ["ABS Plastic"], "sizes": ["Standard"]},
        {"name": "Shower Panel", "colors": ["Chrome", "Black"], "materials": ["Stainless Steel"], "sizes": ["Standard"]},
        {"name": "Overhead Shower", "colors": ["Chrome"], "materials": ["Brass"], "sizes": ["6 inch", "8 inch"]},
    ],
    "Bathtubs": [
        {"name": "Freestanding Bathtub", "colors": ["White", "Black"], "materials": ["Acrylic", "Stone"], "sizes": ["5 ft", "6 ft"]},
        {"name": "Built-in Bathtub", "colors": ["White"], "materials": ["Acrylic"], "sizes": ["5 ft", "5.5 ft"]},
        {"name": "Jacuzzi Tub", "colors": ["White"], "materials": ["Acrylic"], "sizes": ["6 ft"]},
    ],
    "Kitchen Sinks": [
        {"name": "Single Bowl Sink", "colors": ["Silver", "Black"], "materials": ["Stainless Steel", "Granite"], "sizes": ["24 inch", "30 inch"]},
        {"name": "Double Bowl Sink", "colors": ["Silver", "Black"], "materials": ["Stainless Steel"], "sizes": ["32 inch", "36 inch"]},
        {"name": "Undermount Sink", "colors": ["Silver"], "materials": ["Stainless Steel"], "sizes": ["28 inch", "32 inch"]},
    ]
}


def generate_products(brands: List[int], categories: List[int], count_per_category: int = 5) -> List[Dict]:
    """Generate random product data"""
    products = []
    sku_counter = 1000
    
    for category_name, templates in PRODUCT_TEMPLATES.items():
        # Find matching category ID
        category_id = random.choice(categories)  # Simplified for now
        
        for template in templates:
            for _ in range(count_per_category):
                brand_id = random.choice(brands)
                color = random.choice(template["colors"])
                material = random.choice(template["materials"])
                size = random.choice(template["sizes"])
                
                mrp = random.uniform(2000, 50000)
                discount = random.uniform(0.05, 0.25)
                selling_price = mrp * (1 - discount)
                
                product = {
                    "sku": f"SKU{sku_counter:05d}",
                    "name": f"{template['name']} - {color} - {size}",
                    "description": f"High quality {template['name'].lower()} in {color.lower()} color, made of {material.lower()}. Size: {size}",
                    "categoryId": category_id,
                    "brandId": brand_id,
                    "mrp": round(mrp, 2),
                    "sellingPrice": round(selling_price, 2),
                    "stockQuantity": random.randint(0, 200),
                    "reorderLevel": random.randint(5, 20),
                    "unit": "Piece",
                    "color": color,
                    "material": material,
                    "size": size,
                    "specifications": f"Material: {material}, Color: {color}, Size: {size}",
                    "isActive": True,
                    "isFeatured": random.random() > 0.8
                }
                products.append(product)
                sku_counter += 1
                
    return products


# ============================================================================
# QUOTATION DATA
# ============================================================================

def generate_quotations(customer_ids: List[int], product_ids: List[int], count: int = 20) -> List[Dict]:
    """Generate random quotation data"""
    quotations = []
    statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"]
    
    for i in range(count):
        customer_id = random.choice(customer_ids)
        quotation_date = datetime.now() - timedelta(days=random.randint(1, 90))
        valid_until = quotation_date + timedelta(days=random.randint(15, 45))
        
        # Generate quotation items
        num_items = random.randint(2, 8)
        items = []
        for _ in range(num_items):
            product_id = random.choice(product_ids)
            quantity = random.randint(1, 20)
            unit_price = random.uniform(1000, 30000)
            
            items.append({
                "productId": product_id,
                "quantity": quantity,
                "unitPrice": round(unit_price, 2),
                "discount": round(random.uniform(0, 10), 2)
            })
        
        quotation = {
            "customerId": customer_id,
            "quotationDate": quotation_date.strftime("%Y-%m-%d"),
            "validUntil": valid_until.strftime("%Y-%m-%d"),
            "status": random.choice(statuses),
            "taxPercentage": random.choice([0, 5, 12, 18, 28]),
            "discount": round(random.uniform(0, 5000), 2),
            "notes": f"Quotation for {num_items} items",
            "termsAndConditions": "Payment within 30 days. Delivery charges extra.",
            "items": items
        }
        quotations.append(quotation)
    
    return quotations


# ============================================================================
# ORDER DATA
# ============================================================================

def generate_orders(customer_ids: List[int], product_ids: List[int], count: int = 25) -> List[Dict]:
    """Generate random order data"""
    orders = []
    order_statuses = ["PENDING", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED"]
    payment_statuses = ["UNPAID", "PARTIAL", "PAID"]
    
    for i in range(count):
        customer_id = random.choice(customer_ids)
        order_date = datetime.now() - timedelta(days=random.randint(1, 60))
        delivery_date = order_date + timedelta(days=random.randint(3, 15))
        
        # Generate order items
        num_items = random.randint(1, 10)
        items = []
        for _ in range(num_items):
            product_id = random.choice(product_ids)
            quantity = random.randint(1, 15)
            unit_price = random.uniform(1500, 25000)
            
            items.append({
                "productId": product_id,
                "quantity": quantity,
                "unitPrice": round(unit_price, 2),
                "discount": round(random.uniform(0, 8), 2)
            })
        
        order = {
            "customerId": customer_id,
            "orderDate": order_date.strftime("%Y-%m-%d"),
            "deliveryDate": delivery_date.strftime("%Y-%m-%d"),
            "status": random.choice(order_statuses),
            "paymentStatus": random.choice(payment_statuses),
            "taxPercentage": random.choice([5, 12, 18]),
            "discount": round(random.uniform(0, 3000), 2),
            "shippingCharge": round(random.uniform(0, 1000), 2),
            "shippingAddress": f"{random.randint(1, 999)}, {random.choice(['MG Road', 'Park Street', 'Main Road'])}, {random.choice([c[0] for c in INDIAN_CITIES])}",
            "notes": f"Order with {num_items} items",
            "items": items
        }
        orders.append(order)
    
    return orders


# ============================================================================
# PAYMENT DATA
# ============================================================================

def generate_payments(order_ids: List[int], count: int = 30) -> List[Dict]:
    """Generate random payment data"""
    payments = []
    payment_methods = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE"]
    
    for i in range(count):
        order_id = random.choice(order_ids)
        payment_date = datetime.now() - timedelta(days=random.randint(1, 45))
        
        payment = {
            "orderId": order_id,
            "amount": round(random.uniform(5000, 100000), 2),
            "paymentDate": payment_date.strftime("%Y-%m-%d"),
            "paymentMethod": random.choice(payment_methods),
            "transactionReference": f"TXN{random.randint(100000, 999999)}",
            "notes": f"Payment via {random.choice(payment_methods)}"
        }
        payments.append(payment)
    
    return payments


# ============================================================================
# API FUNCTIONS
# ============================================================================

def register_user(user_data: Dict) -> Dict:
    """Register a new user"""
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            print(f"✓ Registered user: {user_data['username']}")
            return response.json()
        else:
            print(f"✗ Failed to register {user_data['username']}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error registering {user_data['username']}: {str(e)}")
        return None


def login_user(username: str, password: str) -> str:
    """Login and get JWT token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password},
            headers=HEADERS
        )
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✓ Logged in as: {username}")
            return token
        else:
            print(f"✗ Failed to login {username}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error logging in {username}: {str(e)}")
        return None


def create_brand(brand_data: Dict) -> int:
    """Create a brand"""
    try:
        response = requests.post(f"{BASE_URL}/brands", json=brand_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            brand_id = response.json().get("id")
            print(f"✓ Created brand: {brand_data['name']} (ID: {brand_id})")
            return brand_id
        else:
            print(f"✗ Failed to create brand {brand_data['name']}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating brand {brand_data['name']}: {str(e)}")
        return None


def create_category(category_data: Dict) -> int:
    """Create a category"""
    try:
        response = requests.post(f"{BASE_URL}/categories", json=category_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            category_id = response.json().get("id")
            print(f"✓ Created category: {category_data['name']} (ID: {category_id})")
            return category_id
        else:
            print(f"✗ Failed to create category {category_data['name']}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating category {category_data['name']}: {str(e)}")
        return None


def create_customer(customer_data: Dict) -> int:
    """Create a customer"""
    try:
        response = requests.post(f"{BASE_URL}/customers", json=customer_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            customer_id = response.json().get("id")
            print(f"✓ Created customer: {customer_data['name']} (ID: {customer_id})")
            return customer_id
        else:
            print(f"✗ Failed to create customer {customer_data['name']}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating customer {customer_data['name']}: {str(e)}")
        return None


def create_product(product_data: Dict) -> int:
    """Create a product"""
    try:
        response = requests.post(f"{BASE_URL}/products", json=product_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            product_id = response.json().get("id")
            print(f"✓ Created product: {product_data['name']} (ID: {product_id})")
            return product_id
        else:
            print(f"✗ Failed to create product {product_data['name']}: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating product {product_data['name']}: {str(e)}")
        return None


def create_quotation(quotation_data: Dict) -> int:
    """Create a quotation"""
    try:
        response = requests.post(f"{BASE_URL}/quotations", json=quotation_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            quotation_id = response.json().get("id")
            print(f"✓ Created quotation (ID: {quotation_id})")
            return quotation_id
        else:
            print(f"✗ Failed to create quotation: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating quotation: {str(e)}")
        return None


def create_order(order_data: Dict) -> int:
    """Create an order"""
    try:
        response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            order_id = response.json().get("id")
            print(f"✓ Created order (ID: {order_id})")
            return order_id
        else:
            print(f"✗ Failed to create order: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating order: {str(e)}")
        return None


def create_payment(payment_data: Dict) -> int:
    """Create a payment"""
    try:
        response = requests.post(f"{BASE_URL}/payments", json=payment_data, headers=HEADERS)
        if response.status_code in [200, 201]:
            payment_id = response.json().get("id")
            print(f"✓ Created payment (ID: {payment_id})")
            return payment_id
        else:
            print(f"✗ Failed to create payment: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error creating payment: {str(e)}")
        return None


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""
    print("=" * 80)
    print("SanitarywareCRM Test Data Generator")
    print("=" * 80)
    print()
    
    # Step 1: Register Users
    print("\n[1/8] Registering Users...")
    print("-" * 80)
    for user in USERS_DATA:
        register_user(user)
    
    # Step 2: Login as admin
    print("\n[2/8] Logging in as admin...")
    print("-" * 80)
    token = login_user("admin", "admin123")
    if not token:
        print("Failed to login. Exiting...")
        return
    set_auth_header(token)
    
    # Step 3: Create Brands
    print("\n[3/8] Creating Brands...")
    print("-" * 80)
    for brand in BRANDS_DATA:
        brand_id = create_brand(brand)
        if brand_id:
            created_brands.append(brand_id)
    
    # Step 4: Create Categories
    print("\n[4/8] Creating Categories...")
    print("-" * 80)
    for category in CATEGORIES_DATA:
        category_id = create_category(category)
        if category_id:
            created_categories.append(category_id)
    
    # Step 5: Create Customers
    print("\n[5/8] Creating Customers...")
    print("-" * 80)
    customers = generate_customers(30)
    for customer in customers:
        customer_id = create_customer(customer)
        if customer_id:
            created_customers.append(customer_id)
    
    # Step 6: Create Products
    print("\n[6/8] Creating Products...")
    print("-" * 80)
    if created_brands and created_categories:
        products = generate_products(created_brands, created_categories, count_per_category=3)
        for product in products[:50]:  # Limit to 50 products
            product_id = create_product(product)
            if product_id:
                created_products.append(product_id)
    
    # Step 7: Create Quotations
    print("\n[7/8] Creating Quotations...")
    print("-" * 80)
    if created_customers and created_products:
        quotations = generate_quotations(created_customers, created_products, count=15)
        for quotation in quotations:
            quotation_id = create_quotation(quotation)
            if quotation_id:
                created_quotations.append(quotation_id)
    
    # Step 8: Create Orders
    print("\n[8/8] Creating Orders...")
    print("-" * 80)
    if created_customers and created_products:
        orders = generate_orders(created_customers, created_products, count=20)
        for order in orders:
            order_id = create_order(order)
            if order_id:
                created_orders.append(order_id)
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✓ Users registered: {len(USERS_DATA)}")
    print(f"✓ Brands created: {len(created_brands)}")
    print(f"✓ Categories created: {len(created_categories)}")
    print(f"✓ Customers created: {len(created_customers)}")
    print(f"✓ Products created: {len(created_products)}")
    print(f"✓ Quotations created: {len(created_quotations)}")
    print(f"✓ Orders created: {len(created_orders)}")
    print("=" * 80)
    print("\nTest data generation completed!")
    print()


if __name__ == "__main__":
    main()
