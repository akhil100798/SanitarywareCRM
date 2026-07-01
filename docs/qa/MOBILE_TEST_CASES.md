# MOBILE TEST CASES

This document describes the interface checks, navigation, AsyncStorage, and API configuration tests for the React Native/Expo mobile application.

---

## 1. Authentication & API Settings

### Connection Setup (Android Emulator Host)
* **Screen**: Settings / Init Stack
* **Steps**: Launch mobile app on Android Emulator, configure API host address.
* **Expected Result**: Hits `http://10.0.2.2:8081` mapping successfully to local Spring Boot dev backend.
* **Pass/Fail**: Connection check pings successfully.

### Sign In & Token Storage
* **Screen**: Login Screen
* **Steps**: Fill username/password, tap Login.
* **Expected Result**: 
  * JWT access token is stored inside device `AsyncStorage`.
  * Renders home Dashboard page showing logged-in username.
* **Pass/Fail**: Subsequent launches skip login form if token is present in storage.

---

## 2. Navigation Tab-Bar Checks

### Products Tab
* **Steps**: Tap "Products" tab on bottom bar.
* **Expected Result**: Navigates to `ListScreen` module rendering product cards, SKUs, and stock quantities.
* **Pass/Fail**: Infinite scroll functions correctly when list data size increases.

### Customers Tab
* **Steps**: Tap "Customers" tab.
* **Expected Result**: Navigates to customers list directory; tapping on a name launches details view.
* **Pass/Fail**: List updates correctly using pull-to-refresh.

---

## 3. Core E2E Transaction Workflows

### Quotation-to-Order Conversion
* **Steps**: 
  1. Open a Quotation details card.
  2. Tap "Convert to Order" button.
* **Expected Result**: 
  * Triggers backend POST request to `/api/orders/from-quotation/{id}`.
  * Navigates to Order list view showing the new order.
* **Pass/Fail**: Converts without errors; quotation status updates.

### Record Partial Order Payment
* **Steps**:
  1. Open Order details card.
  2. Tap "Record Payment".
  3. Fill amount and select Cash method, tap save.
* **Expected Result**:
  * Triggers POST request to `/api/payments`.
  * Order balance amount reduces immediately.
* **Pass/Fail**: Displays success confirmation; cash payment shows in payment history.
