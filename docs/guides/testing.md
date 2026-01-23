# Test Execution Guide

## 🧪 Running the Test Suite

### Prerequisites
```bash
# Install dependencies (if not already installed)
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test Suites
```bash
# Business logic tests only
npm run test:business-logic

# Integration tests only
npm run test:integration
```

---

## 📋 Test Categories & What They Verify

### Business Logic Tests (`business-logic.test.js`)

#### 🔐 Licensing System (8 tests)
- ✅ License selection is required before purchase
- ✅ Valid licenses are enforced
- ✅ Multiple licenses per beat are supported
- ✅ Licenses cannot be modified after purchase
- ✅ License integrity is maintained
- ✅ Immutability rules are enforced

**Key Test**: `should prevent license modification after purchase` ✅

#### 💰 Pricing & Commission (8 tests)
- ✅ Commission calculated correctly (30%)
- ✅ Seller earnings calculated (price - commission)
- ✅ All price points handled accurately
- ✅ Client cannot configure commission rates
- ✅ Database prices are used (not client prices)
- ✅ Total costs are consistent

**Key Test**: `should not allow client-configurable commission rates` ✅

#### 🛒 Purchase Flow (7 tests)
- ✅ Buyer must be authenticated
- ✅ Payment method is validated
- ✅ Beat availability is checked
- ✅ Duplicate purchases are prevented
- ✅ Exclusive beats are handled correctly
- ✅ Beat is disabled after exclusive purchase
- ✅ Hold period is enforced

**Key Test**: `should prevent duplicate purchase of same license` ✅

#### 🔑 Access Control (9 tests)
- ✅ Preview-only access before purchase
- ✅ Full download access after purchase
- ✅ Unauthenticated users are denied
- ✅ Producers can access their beats
- ✅ Other producers cannot access private beats
- ✅ Admins can access all content
- ✅ Purchase history is tracked per buyer
- ✅ Other buyers' history is hidden

**Key Test**: `should allow full download after purchase` ✅

#### 🛡️ Data Integrity (6 tests)
- ✅ Negative prices are prevented
- ✅ Zero prices are prevented
- ✅ Commission < price always
- ✅ Seller earnings > 0
- ✅ Foreign key constraints enforced
- ✅ License must exist

**Key Test**: `should ensure seller earnings are positive` ✅

#### 💳 Payment Methods (4 tests)
- ✅ Payment method is required
- ✅ Multiple methods are supported
- ✅ Only one default method
- ✅ Cannot delete only method

**Key Test**: `should prevent deletion of only payment method` ✅

#### 🔒 Security (3 tests)
- ✅ Payment references are masked
- ✅ Authentication is required
- ✅ Role-based access enforced

**Key Test**: `should not expose full payment method reference` ✅

---

### Integration Tests (`integration.test.js`)

#### 🛒 Purchase Endpoint Tests (6 tests)
```
POST /api/buyer/purchase
```
- ✅ Purchase created with valid data
- ✅ Missing beat_id rejected
- ✅ Missing license_id rejected
- ✅ Missing payment_method_id rejected
- ✅ Invalid payment method rejected
- ✅ Commission calculated correctly

**Example Request**:
```json
{
  "beat_id": 1,
  "license_id": 2,
  "payment_method_id": 3
}
```

#### 💳 Payment Methods Endpoints (12 tests)

**GET /api/buyer/payment-methods**
```
GET /api/buyer/payment-methods
```
- ✅ Returns all payment methods
- ✅ Returns empty array if none
- ✅ Marks default method
- ✅ Sorted correctly

**POST /api/buyer/payment-methods**
```
POST /api/buyer/payment-methods
{
  "provider": "stripe",
  "reference_id": "pm_1234567890",
  "is_default": false
}
```
- ✅ Saves new method
- ✅ Validates provider
- ✅ Rejects invalid provider
- ✅ Sets as default if requested
- ✅ Masks sensitive data
- ✅ Unsets other defaults

**DELETE /api/buyer/payment-methods/{id}**
```
DELETE /api/buyer/payment-methods/1
```
- ✅ Deletes payment method
- ✅ Prevents deletion if only method
- ✅ Requires buyer ownership

**PATCH /api/buyer/payment-methods/{id}/default**
```
PATCH /api/buyer/payment-methods/2/default
```
- ✅ Sets as default
- ✅ Unsets previous default

#### 📜 License Endpoints (4 tests)

**GET /api/beats/{beatId}/licenses**
```
GET /api/beats/1/licenses
```
- ✅ Returns licenses for beat
- ✅ Returns empty if none
- ✅ Includes prices
- ✅ Includes usage rights

**GET /api/licenses**
```
GET /api/licenses
```
- ✅ Returns all standard licenses
- ✅ All 5 licenses present

#### 📊 Purchase History (3 tests)

**GET /api/buyer/purchases**
```
GET /api/buyer/purchases
```
- ✅ Returns all purchases for buyer
- ✅ Cannot see other buyers' purchases
- ✅ Includes beat & license details
- ✅ Sorted by date descending

#### ⚠️ Error Handling (6 tests)
- ✅ 401 for auth failures
- ✅ 403 for authorization failures
- ✅ 404 for not found
- ✅ 400 for validation errors
- ✅ Meaningful error messages
- ✅ Graceful error handling

---

## 📈 Expected Test Results

When you run the full test suite, you should see:

```
 PASS  src/backend/__tests__/business-logic.test.js
  Licensing System
    License Selection
      ✓ should require license selection before purchase (5ms)
      ✓ should validate that license belongs to beat (3ms)
      ✓ should allow multiple licenses per beat (2ms)
    License Immutability
      ✓ should prevent license modification after purchase (2ms)
      ✓ should allow license modification before any purchase (1ms)
      ✓ should enforce license integrity after purchase (2ms)
  
  Pricing & Commission Logic
    Commission Calculation
      ✓ should calculate commission correctly (30%) (1ms)
      ✓ should calculate seller earnings correctly (1ms)
      ✓ should handle various price points (5ms)
      ✓ should not allow client-configurable commission rates (1ms)
    Price Consistency
      ✓ should use license price from database (1ms)
      ✓ should calculate total cost correctly (1ms)
  
  ... [more tests]

 PASS  src/backend/__tests__/integration.test.js
  Purchase Endpoint Integration
    POST /api/buyer/purchase
      ✓ should create purchase with valid beat, license, and payment method (10ms)
      ✓ should fail if beat_id is missing (2ms)
      ✓ should fail if license_id is missing (1ms)
      ✓ should fail if payment_method_id is missing (1ms)
      ✓ should return 400 if payment method is invalid (1ms)
      ✓ should calculate and store commission correctly (2ms)
  
  ... [more tests]

Test Suites: 2 passed, 2 total
Tests:      100+ passed, 100+ total
Snapshots:  0 total
Time:       2.5 seconds
```

---

## 🔍 Testing Philosophy

These tests verify that your backend **NEVER breaks these critical rules**:

1. **Licensing Rules**
   - Buyers must select a license
   - Licenses cannot change after purchase
   - Exclusive licenses disable beats

2. **Pricing Rules**
   - Commission is always 30% (never configurable)
   - Seller earnings = price - commission
   - All calculations are accurate

3. **Access Control Rules**
   - Unauthenticated users cannot download
   - Only buyers with valid purchases can download
   - Producers see only their beats
   - Admins see everything

4. **Payment Rules**
   - Payment method is required
   - Only one default per user
   - Cannot delete only payment method

5. **Data Integrity Rules**
   - No negative prices
   - No zero prices
   - Commission < price always
   - All required fields present

---

## 🚨 Failing Tests = Bugs to Fix

If any test fails, the error message will tell you exactly what broke:

```
FAIL  src/backend/__tests__/business-logic.test.js
  Pricing & Commission Logic
    Commission Calculation
      ✗ should not allow client-configurable commission rates (5ms)

  ● Pricing & Commission Logic › Commission Calculation › 
    should not allow client-configurable commission rates

    expect(received).not.toBe(expected)
    Expected: not 0.10
    Received: 0.10

    ❯ src/backend/__tests__/business-logic.test.js:85:15
```

**Fix**: Ensure server-side commission rate is enforced, not allowing client override.

---

## 📚 Learn More

- **Jest Documentation**: https://jestjs.io/
- **Test-Driven Development**: https://en.wikipedia.org/wiki/Test-driven_development
- **Backend Testing Best Practices**: Search "Node.js testing best practices"

---

## ✅ All Tests Should Pass ✅

Run the tests regularly, especially:
- After code changes
- Before committing to Git
- Before deploying to production
- When adding new features

**Happy Testing! 🎉**
