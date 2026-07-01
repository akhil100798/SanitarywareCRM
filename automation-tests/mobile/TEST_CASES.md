# Mobile App Test Cases

> [!NOTE]
> **Status**: Not executed yet (Staged for local automation).

---

## 1. Positive Test Cases (POS-061 to POS-080)

| Test ID | Screen | Scenario | Preconditions | Test Steps | Expected Result | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-061** | Welcome | App launch check | App is installed | Open the application | Splash screen displays, navigates to Login form. | Critical | Playwright / Appium |
| **POS-062** | Login | Sign In mobile | Backend is running | Fill fields, tap Sign In | Access token saved in storage, navigates to Dashboard. | Critical | Playwright / Appium |
| **POS-063** | Dashboard | Dashboard widgets render | Logged in | View dashboard screen | Real sales data metrics cards are displayed. | High | Playwright / Appium |
| **POS-064** | Navigation | Tab Navigation | Logged in | Tap on "Products" in bottom bar | View switches to the Products list screen. | High | Playwright / Appium |
| **POS-065** | Product | Product catalog list | Products exist | View product list | Catalog cards displaying SKUs and current stock levels render. | High | Playwright / Appium |
| **POS-066** | Customer | Customer list directory | Customers exist | Navigate to Customers tab | List displays registered customer names and phone numbers. | High | Playwright / Appium |
| **POS-067** | More | More modules view | Logged in | Tap "More" tab | Displays Categories, Brands, POs buttons directory. | Medium | Playwright / Appium |
| **POS-068** | Quotation | List Quotations | Quotations exist | Tap "Quotations" under More | Renders quotation rows showing valid totals. | Medium | Playwright / Appium |
| **POS-069** | Order | List Orders | Orders exist | Tap "Orders" under More | Renders orders list showing balances and statuses. | Critical | Playwright / Appium |
| **POS-070** | Payment | List Payments | Payments exist | Tap "Payments" under More | Renders list showing payment method (e.g. CASH). | Critical | Playwright / Appium |
| **POS-071** | Profile | View User Profile | Logged in | Tap "Profile" | Renders user full name and role status details. | Low | Playwright / Appium |
| **POS-072** | Auth | Logout mobile | Logged in | Tap "Logout" on Profile | Token cleared from storage, redirects to Login. | High | Playwright / Appium |
| **POS-073** | Network | Offline cache access | Previously loaded data | Turn off network, launch app | Displays cached data, warning message offline shows. | Medium | Manual |
| **POS-074** | System | Android Emulator Host | Dev env | Boot app on Android emulator | Hits `10.0.2.2:8081` mapping successfully to local backend. | High | Playwright / Appium |
| **POS-075** | UI | Layout responsiveness | Any screen | Rotate emulator to landscape | App layouts adjusts safely to viewport changes. | Low | Manual |
| **POS-076** | Product | Select product dropdown | Quotation form open | Tap product selector | Opens list overlay, can search and select product. | High | Playwright / Appium |
| **POS-077** | Quotation | Save quotation form | Form populated | Fill customer name, tap Save | Form submits, redirects to Quotation details. | Critical | Playwright / Appium |
| **POS-078** | Order | Convert to order tap | Quotation details open | Tap "Convert to Order" | Confirms alert, order details summary loads. | Critical | Playwright / Appium |
| **POS-079** | Payment | Record payment form | Order details open | Tap "Record Payment", fill amount, save | Submits, updates balance, Cash history shows. | Critical | Playwright / Appium |
| **POS-080** | API | API connectivity test | Network active | Perform pull-to-refresh on list | Re-fetches fresh data from API endpoints. | High | Playwright / Appium |

---

## 2. Negative Test Cases (NEG-066 to NEG-085)

| Test ID | Screen | Scenario | Preconditions | Test Steps | Expected Error/Result | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-066** | Login | Sign in with bad password | Welcome open | Enter details, tap Sign In | Access denied toast alert displays. | Critical | Playwright / Appium |
| **NEG-067** | Login | Sign in no internet connection | Welcome open | Disconnect network, tap Sign In | Toast: "No network connection". | Critical | Playwright / Appium |
| **NEG-068** | Dashboard | Dashboard load API timeout | Logged in | Force slow API latency, open dashboard | ActivityIndicator spins, shows "Connection timeout". | High | Playwright / Appium |
| **NEG-069** | Navigation| Restricted route (Unauthorized) | Sales logged in | Manually navigate stack to Distributor edit | Alert: "Access Denied. Forbidden". | Critical | Playwright / Appium |
| **NEG-070** | ListScreen | Empty list placeholder fallback | Empty category | Open Category list | Screen displays: "No categories available". | Low | Playwright / Appium |
| **NEG-071** | Details | Convert quote fails (Duplicate convert)| Converted quote| Tap "Convert to Order" | Error popup: "Quotation already converted". | High | Playwright / Appium |
| **NEG-072** | Payment | Payment amount exceeds balance | Order open | Record payment amount > balance | Alert: "Payment amount exceeds balance due". | Critical | Playwright / Appium |
| **NEG-073** | Details | Order details invalid ID fallback | Cache load | Open order details with bad ID | Screen displays: "Order not found". | Medium | Playwright / Appium |
| **NEG-074** | Settings | Host emulator connection timeout | Dev env | Wrong API host config (`127.0.0.1:8081`)| Alert: "Network request failed". | High | Playwright / Appium |
| **NEG-075** | Quotation | Save quotation empty items | Form open | Tap Save with empty items | Warning popup: "Quotation must have items". | High | Playwright / Appium |
| **NEG-076** | Product | Fetch product catalog fails | Server down | Open Products tab | Displays retry button: "Failed to load catalog". | High | Playwright / Appium |
| **NEG-077** | Global | Session token validation failure | Session open | Inject corrupted token, refresh app | Redirects automatically to Login screen. | High | Playwright / Appium |
| **NEG-078** | Global | API 500 error fallback | Any list | Trigger backend crash | Alert: "Server error. Try again later". | High | Playwright / Appium |
| **NEG-079** | Quotation | Discount input characters block | Form open | Type letters in discount | Blocks character entries, numeric input only. | Medium | Playwright / Appium |
| **NEG-080** | Customer | Duplicate phone number check | Form open | Fill duplicate phone, tap save | Error toast: "Phone number already exists". | High | Playwright / Appium |
| **NEG-081** | App | Launch on old Android build | Dev env | Open on API level 21 | Warning alert or crash log check. | Low | Manual |
| **NEG-082** | Settings | Clear API host configurations | Settings | Remove host configuration URL | Alert: "API Endpoint Host is required". | High | Playwright / Appium |
| **NEG-083** | Details | View deleted category | List cached | Tap deleted category item | Alert: "Category does not exist". | Medium | Playwright / Appium |
| **NEG-084** | Purchase Order| Receive PO quantity overflow | PO open | Fill received quantity > PO items quantity| Alert: "Received quantity cannot exceed ordered quantity".| High | Playwright / Appium |
| **NEG-085** | Distributor| Create duplicate distributor email | Form open | Fill existing email, save | Toast: "Email already registered". | Medium | Playwright / Appium |
