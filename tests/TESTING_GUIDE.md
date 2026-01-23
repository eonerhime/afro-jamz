# Thunder Client Testing Guide

## 📋 Pre-Test Setup

### 1. Clean Database

```bash
# Run cleanup script
node tests/cleanup-script.js
```

### 2. Verify Licenses Exist

```bash
# Should have 5 default licenses
sqlite3 src/backend/db/sqlite.db "SELECT id, name, description, usage_rights FROM licenses;"
```

### 3. Start Server

```bash
npm run dev
```

Server should be running on `http://localhost:3001`

---

## 🧪 Test Workflow

This guide follows a complete user journey from registration to withdrawal. Check off each step as you complete it.

### Import Collection

1. Open Thunder Client in VS Code
2. Click "Collections" tab
3. Click menu (•••) → Import
4. Select `tests/thunder-client/afrojamz-complete-tests.json`

---

## ✅ Complete Test Flow

### STEP 1: User Registration

- [ ] **1.1 Register Producer**

```http
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "username": "producer1",
  "email": "producer@test.com",
  "password": "Producer123!",
  "role": "producer",
  "accept_indemnity": true
}
```

**Expected**: 201 Created
**Save**: Copy `token` from response → Use as `{{producer_token}}`

---

- [ ] **1.2 Register Buyer**

```http
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "username": "buyer1",
  "email": "buyer@test.com",
  "password": "Buyer123!",
  "role": "buyer"
}
```

**Expected**: 201 Created
**Save**: Copy `token` from response → Use as `{{buyer_token}}`

---

- [ ] **1.3 Register Admin**

```http
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@test.com",
  "password": "Admin123!",
  "role": "buyer"
}
```

**Expected**: 201 Created

---

- [ ] **1.4 Upgrade to Admin Role**

```sql
sqlite3 src/backend/db/sqlite.db
UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';
.quit
```

---

### STEP 2: User Login

- [ ] **2.1 Login Producer**

```http
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "producer@test.com",
  "password": "Producer123!"
}
```

**Expected**: 200 OK
**Save**: `token` → `{{producer_token}}`

---

- [ ] **2.2 Login Buyer**

```http
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "buyer@test.com",
  "password": "Buyer123!"
}
```

**Expected**: 200 OK
**Save**: `token` → `{{buyer_token}}`

---

- [ ] **2.3 Login Admin**

```http
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Admin123!"
}
```

**Expected**: 200 OK
**Save**: `token` → `{{admin_token}}`

---

### STEP 3: Admin - Verify Licenses

- [ ] **3.1 Get All Licenses**

```http
GET http://localhost:3001/api/admin/licenses
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (should return 5 default licenses)

---

- [ ] **3.2 Create Custom License (Optional)**

```http
POST http://localhost:3001/api/admin/licenses
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Premium Lease",
  "description": "Non-exclusive license for commercial use",
  "usage_rights": "Up to 500,000 streams. Music videos allowed.",
  "price": 250
}
```

**Expected**: 201 Created

---

### STEP 4: Producer - Upload Beats

- [ ] **4.1 Upload First Beat**

```http
POST http://localhost:3001/api/producer/beats/upload
Authorization: Bearer {{producer_token}}
Content-Type: application/json

{
  "title": "Dance Fever",
  "genre": "Afrobeats",
  "tempo": 128,
  "duration": "3:30",
  "key": "F Major",
  "bpm": 128,
  "tags": "dance, club, party",
  "previewUrl": "https://cdn.afrobeatz.com/previews/dance-fever.mp3",
  "fullUrl": "https://cdn.afrobeatz.com/full/dance-fever.wav",
  "cover_art_url": "https://cdn.afrobeatz.com/covers/dance-fever.jpg",
  "licenses": [
    { "license_id": 1, "price": 100 },
    { "license_id": 2, "price": 250 },
    { "license_id": 3, "price": 600 },
    { "license_id": 4, "price": 1000 },
    { "license_id": 5, "price": 5000 }
  ]
}
```

**Expected**: 201 Created
**Save**: Note `beat_id` from response

---

- [ ] **4.2 Get My Beats**

```http
GET http://localhost:3001/api/producer/beats
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows uploaded beat)

---

### STEP 5: Public - Browse Beats

- [ ] **5.1 Get All Beats (Public)**

```http
GET http://localhost:3001/api/beats
```

**Expected**: 200 OK (shows uploaded beat)

---

- [ ] **5.2 Get Beat Details**

```http
GET http://localhost:3001/api/beats/1
```

**Expected**: 200 OK (beat details with licenses)

---

- [ ] **5.3 Filter by Genre**

```http
GET http://localhost:3001/api/beats?genre=Afrobeats
```

**Expected**: 200 OK (filtered results)

---

### STEP 6: Buyer - Add Payment Method

- [ ] **6.1 Add Payment Method**

```http
POST http://localhost:3001/api/buyer/payment-methods
Authorization: Bearer {{buyer_token}}
Content-Type: application/json

{
  "provider": "credit_card",
  "reference_id": "pm_test_card_visa",
  "is_default": true,
  "card_number": "1111222233334444",
  "expiry_month": 12,
  "expiry_year": 2026,
  "cvv": "123",
  "cardholder_name": "Test Buyer"
}
```

**Expected**: 201 Created
**Save**: Note `payment_method_id` from response

---

- [ ] **6.2 Get My Payment Methods**

```http
GET http://localhost:3001/api/buyer/payment-methods
Authorization: Bearer {{buyer_token}}
```

**Expected**: 200 OK (shows added payment method)

---

### STEP 7: Buyer - Purchase Beat

- [ ] **7.1 Purchase Beat with MP3 Lease**

```http
POST http://localhost:3001/api/buyer/purchase
Authorization: Bearer {{buyer_token}}
Content-Type: application/json

{
  "beat_id": 1,
  "license_id": 1,
  "payment_method_id": 1,
  "use_wallet": false
}
```

**Expected**: 201 Created
**Save**: Note `purchase_id` and `hold_until_date` from response

---

- [ ] **7.2 Get My Purchases**

```http
GET http://localhost:3001/api/buyer/purchases
Authorization: Bearer {{buyer_token}}
```

**Expected**: 200 OK (shows purchase)

---

- [ ] **7.3 Get Secure Download URL**

```http
GET http://localhost:3001/api/buyer/beats/1/secure-url
Authorization: Bearer {{buyer_token}}
```

**Expected**: 200 OK (returns download URL)

---

### STEP 8: Producer - Check Dashboard

- [ ] **8.1 View Dashboard**

```http
GET http://localhost:3001/api/producer/dashboard
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK  
**Verify**:

- `total_sales: 1`
- `total_earnings: 85`
- `pending_balance: 85` (still in 7-day hold)
- `wallet_balance: 0` (not released yet)

---

- [ ] **8.2 Get Sales Summary**

```http
GET http://localhost:3001/api/producer/sales/summary
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows earnings breakdown)

---

### STEP 9: System - Release Funds (After 7 Days)

**Note**: For testing, manually set hold_until to past date first:

```sql
sqlite3 src/backend/db/sqlite.db
UPDATE purchases SET hold_until = datetime('now', '-1 day') WHERE id = 1;
.quit
```

---

- [ ] **9.1 Check Pending Releases**

```http
GET http://localhost:3001/api/system/pending-releases
```

**Expected**: 200 OK (shows 1 purchase ready for release)

---

- [ ] **9.2 Release Funds to Wallet**

```http
POST http://localhost:3001/api/system/release-funds
```

**Expected**: 200 OK  
**Response**: Shows $85 credited to producer's wallet

---

### STEP 10: Producer - Check Wallet & Withdraw

- [ ] **10.1 Check Wallet Balance**

```http
GET http://localhost:3001/api/wallet/balance
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK  
**Verify**: `wallet_balance: 85`

---

- [ ] **10.2 View Wallet Transactions**

```http
GET http://localhost:3001/api/wallet/transactions?limit=50
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows credit transaction from fund release)

---

- [ ] **10.3 Withdraw Funds to PayPal**

```http
POST http://localhost:3001/api/producer/withdrawals
Authorization: Bearer {{producer_token}}
Content-Type: application/json

{
  "amount": 85,
  "paypal_email": "producer@paypal.com"
}
```

**Expected**: 201 Created  
**Response**: Instant withdrawal, `status: "completed"`, mock PayPal payout ID

---

- [ ] **10.4 View Withdrawal History**

```http
GET http://localhost:3001/api/producer/withdrawals
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows completed withdrawal)

---

- [ ] **10.5 Verify Wallet Balance After Withdrawal**

```http
GET http://localhost:3001/api/wallet/balance
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK  
**Verify**: `wallet_balance: 0` (funds withdrawn)

---

### STEP 11: Dispute Resolution

- [ ] **11.1 Buyer Files Dispute**

```http
POST http://localhost:3001/api/buyer/purchases/1/dispute
Authorization: Bearer {{buyer_token}}
Content-Type: application/json

{
  "reason": "Beat quality does not match description"
}
```

**Expected**: 200 OK  
**Save**: Note `dispute_id` from response

---

- [ ] **11.2 Producer Views Disputes**

```http
GET http://localhost:3001/api/producer/disputes
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows open dispute)

---

- [ ] **11.3 Producer Responds to Dispute**

```http
POST http://localhost:3001/api/producer/disputes/1/respond
Authorization: Bearer {{producer_token}}
Content-Type: application/json

{
  "response": "I apologize for the issue. The beat file had an encoding problem which has been fixed. I've uploaded a new version."
}
```

**Expected**: 200 OK

---

- [ ] **11.4 Admin Views All Disputes**

```http
GET http://localhost:3001/api/admin/disputes
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (shows all disputes)

---

- [ ] **11.5 Admin Reviews Single Dispute**

```http
GET http://localhost:3001/api/admin/disputes/1
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (full dispute details)

---

- [ ] **11.6 Admin Updates Dispute Status**

```http
PATCH http://localhost:3001/api/admin/disputes/1
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "status": "rejected",
  "admin_response": "After review, the beat quality meets the description. Dispute rejected."
}
```

**Expected**: 200 OK  
**Valid statuses**: `under_review`, `resolved`, `rejected`

---

### STEP 12: Admin - Financial Management

- [ ] **12.1 View Financial Dashboard**

```http
GET http://localhost:3001/api/admin/finance/summary
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK  
**Verify**:

- `total_revenue: 100`
- `total_commission_earned: 15`
- Shows top producers and recent transactions

---

- [ ] **12.2 Check Platform Withdrawable Balance**

```http
GET http://localhost:3001/api/admin/finance/withdrawable-balance
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK  
**Verify**: `withdrawable_balance: 15` (platform commission)

---

- [ ] **12.3 Get Commission Breakdown**

```http
GET http://localhost:3001/api/admin/finance/commissions?period=all
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (detailed commission history)

---

- [ ] **12.4 View Revenue by License Type**

```http
GET http://localhost:3001/api/admin/finance/revenue-by-license
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (commission per license type)

---

- [ ] **12.5 Check Revenue Trend**

```http
GET http://localhost:3001/api/admin/finance/revenue-trend?groupBy=day
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (revenue over time)

---

- [ ] **12.6 View All Users**

```http
GET http://localhost:3001/api/admin/users
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (all registered users)
**Response**:

```json
{
  "total": 3,
  "filter": "all",
  "users": [
    {
      "id": 1,
      "username": "producer1",
      "email": "producer@test.com",
      "role": "producer",
      "wallet_balance": 0,
      "created_at": "2026-01-22T10:00:00.000Z",
      "last_login": "2026-01-22T10:05:00.000Z"
    },
    {
      "id": 2,
      "username": "buyer1",
      "email": "buyer@test.com",
      "role": "buyer",
      "wallet_balance": 0,
      "created_at": "2026-01-22T10:01:00.000Z",
      "last_login": "2026-01-22T10:06:00.000Z"
    },
    {
      "id": 3,
      "username": "admin",
      "email": "admin@test.com",
      "role": "admin",
      "wallet_balance": 0,
      "created_at": "2026-01-22T10:02:00.000Z",
      "last_login": "2026-01-22T10:07:00.000Z"
    }
  ]
}
```

---

- [ ] **12.6.1 View Producers Only**

```http
GET http://localhost:3001/api/admin/users?role=producer
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (producers only)
**Response**:

```json
{
  "total": 1,
  "filter": "producer",
  "users": [
    {
      "id": 1,
      "username": "producer1",
      "email": "producer@test.com",
      "role": "producer",
      "wallet_balance": 0,
      "created_at": "2026-01-22T10:00:00.000Z",
      "last_login": "2026-01-22T10:05:00.000Z"
    }
  ]
}
```

---

- [ ] **12.6.2 View Buyers Only**

```http
GET http://localhost:3001/api/admin/users?role=buyer
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (buyers only)

---

- [ ] **12.7 View All Sales**

```http
GET http://localhost:3001/api/admin/sales
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (complete sales history)

---

- [ ] **12.8 Get Sales Summary**

```http
GET http://localhost:3001/api/admin/sales/summary
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (aggregated sales stats)

---

### STEP 13: Notifications

- [ ] **13.1 Check Notifications (Admin)**

```http
GET http://localhost:3001/api/admin/notifications
Authorization: Bearer {{admin_token}}
```

**Expected**: 200 OK (shows dispute notifications, withdrawal notifications)

---

- [ ] **13.2 Check Notifications (Producer)**

```http
GET http://localhost:3001/api/producer/notifications
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK (shows dispute notifications)

---

- [ ] **13.3 Check Notifications (Buyer)**

```http
GET http://localhost:3001/api/buyer/notifications
Authorization: Bearer {{buyer_token}}
```

**Expected**: 200 OK (shows dispute response notifications)

---

- [ ] **13.4 Mark Notification as Read (Producer)**

```http
PATCH http://localhost:3001/api/producer/notifications/1/read
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK

---

- [ ] **13.5 Mark All Notifications as Read (Producer)**

```http
PATCH http://localhost:3001/api/producer/notifications/read-all
Authorization: Bearer {{producer_token}}
```

**Expected**: 200 OK

---

### STEP 14: License Management (Admin)

- [ ] **14.1 Update License**

```http
PUT http://localhost:3001/api/admin/licenses/1
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Basic MP3 Lease",
  "description": "Updated description",
  "usage_rights": "Up to 100,000 streams. MP3 format only."
}
```

**Expected**: 200 OK

---

- [ ] **14.2 Update License Status**

```http
PUT http://localhost:3001/api/admin/licenses/1/status
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "is_active": 0
}
```

**Expected**: 200 OK (deactivates license)

---

## 📊 Final Verification Summary

After completing all steps, verify:

| Item                    | Expected Value       | ✓   |
| ----------------------- | -------------------- | --- |
| Total Users             | 3                    | [ ] |
| Total Beats             | 1+                   | [ ] |
| Total Purchases         | 1+                   | [ ] |
| Producer Wallet Balance | 0 (after withdrawal) | [ ] |
| Platform Commission     | $15                  | [ ] |
| Disputes Filed          | 1                    | [ ] |
| Dispute Status          | Rejected             | [ ] |
| Withdrawal Status       | Completed            | [ ] |
| Notifications Created   | 3+                   | [ ] |

---

## 🐛 Troubleshooting

### Common Issues

**"Unauthorized" Error**

- Check token is correct and not expired
- Token format: `Bearer eyJhbGci...`
- Re-login to get fresh token

**"Beat not found"**

- Ensure beat upload succeeded first (Step 4.1)
- Check beat ID in response matches request

**"Invalid payment method"**

- Add payment method first (Step 6.1)
- Ensure payment method belongs to buyer

**"Insufficient wallet balance"**

- Check wallet balance first (Step 10.1)
- Funds must be released from 7-day hold (Step 9.2)

**File Upload Fails**

- Check file size < 50MB
- File must be .mp3, .wav, .m4a, or .flac
- Ensure `src/backend/audio` directory exists

**Admin Routes Return 403**

- Ensure user was manually upgraded to admin role (Step 1.4)
- Verify with: `sqlite3 src/backend/db/sqlite.db "SELECT role FROM users WHERE email='admin@test.com';"`

**"No purchases ready for release"**

- Wait 7 days after purchase, OR
- Manually update hold_until: `UPDATE purchases SET hold_until = datetime('now', '-1 day') WHERE id = 1;`

---

## 📝 Test Notes

1. **Token Management**: Save all 3 tokens after login for quick reuse
2. **File Upload**: Must use form-data (multipart), not JSON
3. **Downloads**: Use PowerShell script or cURL (Thunder Client has limitations)
4. **Admin Role**: Requires manual SQL update (security feature)
5. **7-Day Hold**: For testing, manually update `hold_until` in database to past date
6. **Clean State**: Run `node tests/cleanup-script.js` before each full test run
7. **Wallet Testing**: Funds must be released before withdrawal is possible
8. **Mock PayPal**: Returns fake payout IDs (integration ready for production)
