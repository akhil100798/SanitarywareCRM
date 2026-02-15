
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** SanitarywareCRM
- **Date:** 2026-02-02
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 test api health endpoint
- **Test Code:** [TC001_test_api_health_endpoint.py](./TC001_test_api_health_endpoint.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 13, in test_api_health_endpoint
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 500 Server Error: Internal Server Error for url: http://localhost:8080/api/auth/test

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 26, in <module>
  File "<string>", line 15, in test_api_health_endpoint
AssertionError: Request to /api/auth/test failed: 500 Server Error: Internal Server Error for url: http://localhost:8080/api/auth/test

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/3a8698f9-07e1-4574-8295-ba5d0e634687
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 test user login with valid credentials
- **Test Code:** [TC002_test_user_login_with_valid_credentials.py](./TC002_test_user_login_with_valid_credentials.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 22, in test_user_login_with_valid_credentials
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 500 Server Error: Internal Server Error for url: http://localhost:8080/api/auth/login

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 50, in <module>
  File "<string>", line 24, in test_user_login_with_valid_credentials
AssertionError: Request to login endpoint failed: 500 Server Error: Internal Server Error for url: http://localhost:8080/api/auth/login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/349cd0d1-d61c-4863-b1b8-40cd3b504fe3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 test user login with invalid credentials
- **Test Code:** [TC003_test_user_login_with_invalid_credentials.py](./TC003_test_user_login_with_invalid_credentials.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 30, in <module>
  File "<string>", line 20, in test_user_login_with_invalid_credentials
AssertionError: Expected status code 401, got 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/4b787e68-5c16-4d89-870a-f3c9f075952d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 test user login with deactivated account
- **Test Code:** [TC004_test_user_login_with_deactivated_account.py](./TC004_test_user_login_with_deactivated_account.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 34, in <module>
  File "<string>", line 24, in test_user_login_with_deactivated_account
AssertionError: Expected status code 403, got 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/388ab6b0-b126-42aa-a426-25fcb38597b5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 test user registration with unique username and email
- **Test Code:** [TC005_test_user_registration_with_unique_username_and_email.py](./TC005_test_user_registration_with_unique_username_and_email.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 36, in <module>
  File "<string>", line 28, in test_user_registration_with_unique_username_and_email
AssertionError: Expected status code 201, got 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/7975a25d-7b52-484b-9311-6630bf4c5aa8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 test user registration with duplicate username or email
- **Test Code:** [TC006_test_user_registration_with_duplicate_username_or_email.py](./TC006_test_user_registration_with_duplicate_username_or_email.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 61, in <module>
  File "<string>", line 24, in test_user_registration_with_duplicate_username_or_email
AssertionError: Setup user registration failed with status 500, response: Proxy server error: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/df16203c-8f2d-4dec-9e7a-95119bdfd165
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 test fetch current authenticated user with valid token
- **Test Code:** [TC007_test_fetch_current_authenticated_user_with_valid_token.py](./TC007_test_fetch_current_authenticated_user_with_valid_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 69, in <module>
  File "<string>", line 24, in test_fetch_current_authenticated_user_with_valid_token
AssertionError: Registration failed: Proxy server error: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/cdb07411-a5a1-4045-8c03-39b6f9e78d15
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 test fetch current authenticated user with invalid or missing token
- **Test Code:** [TC008_test_fetch_current_authenticated_user_with_invalid_or_missing_token.py](./TC008_test_fetch_current_authenticated_user_with_invalid_or_missing_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 27, in <module>
  File "<string>", line 19, in test_fetch_current_authenticated_user_with_invalid_or_missing_token
AssertionError: Expected 401 Unauthorized, got 500

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ceacbfb9-1eb0-4a09-b0d8-4efb207456fa/368618d3-3336-42cd-a5b4-c44da93932dc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---