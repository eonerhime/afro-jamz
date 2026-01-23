# AfroJamz API Routes Status

## ✅ All Routes Implemented & Documented

All routes have **Swagger JSDoc comments** and are fully documented in the Swagger UI at `http://localhost:3001/api-docs` when the server is running.

---

## 🎵 BEAT ROUTES

### Upload Beat ✅
```
POST /api/producer/beats/upload
Headers: Authorization: Bearer {JWT}
Body: multipart/form-data
  - title (required)
  - genre (required) 
  - tempo (required)
  - key (optional)
  - description (optional)
  - audioFile (required) - MP3, WAV, M4A, FLAC max 50MB
Response: 201 Created
```

### List All Beats (Public) ✅
```
GET /api/beats
Query Parameters:
  - genre (optional)
  - search (optional)
Response: 200 OK - Array of beats
```

### Get Beat Details ✅
```
GET /api/beats/{id}
Response: 200 OK - Beat object with purchase status
```

### Download Beat (with token) ✅
```
GET /api/beats/{id}/download?token={token}
Headers: Authorization: Bearer {JWT}
Response: 200 - Audio file download
```

### Get Producer's Own Beats ✅
```
GET /api/producer/beats/my-beats
Headers: Authorization: Bearer {JWT}
Response: 200 OK - Array of producer's beats
```

---

## 📋 LICENSE ROUTES

### Get Licenses for a Beat ✅
```
GET /api/licenses/{beatId}
Response: 200 OK - Array of license objects
```

### Create License ✅
```
POST /api/licenses
Headers: Authorization: Bearer {JWT}
Body:
  {
    "beat_id": 1,
    "license_type": "Standard", 
    "price": 29.99,
    "usage_rights": "Commercial + Radio"
  }
Response: 201 Created
```

---

## 🛒 PURCHASE ROUTES

### Create Purchase ✅
```
POST /api/buyer/purchases
Headers: Authorization: Bearer {JWT}
Body:
  {
    "beat_id": 1,
    "license_id": 1,
    "payment_method_id": 1
  }
Response: 201 Created - Purchase object with download URL
```

### Get Purchase History ✅
```
GET /api/buyer/purchases/history
Headers: Authorization: Bearer {JWT}
Response: 200 OK - Array of purchases
```

### Get Purchase Details ✅
```
GET /api/buyer/purchases/{id}
Headers: Authorization: Bearer {JWT}
Response: 200 OK - Purchase object
```

### Download Purchased Beat (Full) ✅
```
GET /api/buyer/beats/{id}/download
Headers: Authorization: Bearer {JWT}
Response: 200 - Audio file download
```

### Generate Secure Download URL ✅
```
GET /api/buyer/beats/{id}/secure-url
Headers: Authorization: Bearer {JWT}
Response: 200 OK
  {
    "downloadUrl": "/api/beats/1/download?token=xyz123",
    "expiresIn": "5 minutes"
  }
```

### Lodge Dispute ✅
```
POST /api/buyer/purchases/{id}/dispute
Headers: Authorization: Bearer {JWT}
Body:
  {
    "reason": "Beat doesn't match description"
  }
Response: 201 Created
```

### Resolve Dispute (Admin) ✅
```
POST /api/buyer/purchases/{id}/resolve-dispute
Headers: Authorization: Bearer {JWT} (Admin only)
Body:
  {
    "resolution": "refund|keep",
    "notes": "..."
  }
Response: 200 OK
```

---

## 💳 PAYMENT METHOD ROUTES

### Add Payment Method ✅
```
POST /api/buyer/payment-methods
Headers: Authorization: Bearer {JWT}
Body:
  {
    "card_number": "4111111111111111",
    "cardholder_name": "John Doe",
    "expiry_month": 12,
    "expiry_year": 2025,
    "cvv": "123"
  }
Response: 201 Created
```

### Get Payment Methods ✅
```
GET /api/buyer/payment-methods
Headers: Authorization: Bearer {JWT}
Response: 200 OK - Array of payment methods
```

### Update Payment Method ✅
```
PUT /api/buyer/payment-methods/{id}
Headers: Authorization: Bearer {JWT}
Body: (same as create)
Response: 200 OK
```

### Delete Payment Method ✅
```
DELETE /api/buyer/payment-methods/{id}
Headers: Authorization: Bearer {JWT}
Response: 204 No Content
```

### Set Default Payment Method ✅
```
PUT /api/buyer/payment-methods/{id}/default
Headers: Authorization: Bearer {JWT}
Response: 200 OK
```

---

## 🔐 AUTHENTICATION ROUTES

### Register ✅
```
POST /auth/register
Body:
  {
    "username": "username",
    "email": "user@example.com",
    "password": "password123",
    "role": "producer|buyer"
  }
Response: 201 Created - JWT token
```

### Login ✅
```
POST /auth/login
Body:
  {
    "email": "user@example.com",
    "password": "password123"
  }
Response: 200 OK - JWT token
```

---

## 👨‍💼 ADMIN ROUTES

### Get All Users ✅
```
GET /api/admin/users
Headers: Authorization: Bearer {JWT} (Admin only)
Response: 200 OK - Array of users
```

### Get All Purchases ✅
```
GET /api/admin/purchases
Headers: Authorization: Bearer {JWT} (Admin only)
Response: 200 OK - Array of all purchases
```

### Get Platform Analytics ✅
```
GET /api/admin/analytics
Headers: Authorization: Bearer {JWT} (Admin only)
Response: 200 OK
  {
    "total_revenue": 10000,
    "platform_commission": 2500,
    "total_purchases": 150,
    "total_producers": 25,
    "total_buyers": 100
  }
```

### Process Withdrawal ✅
```
POST /api/admin/withdrawals/process
Headers: Authorization: Bearer {JWT} (Admin only)
Body:
  {
    "producer_id": 1,
    "amount": 500
  }
Response: 200 OK
```

### Get Pending Disputes ✅
```
GET /api/admin/disputes
Headers: Authorization: Bearer {JWT} (Admin only)
Response: 200 OK - Array of disputes
```

---

## 📊 TESTING THE ROUTES

### Option 1: Swagger UI
1. Start server: `npm run dev`
2. Open: `http://localhost:3001/api-docs`
3. Click any route to expand and test

### Option 2: Thunder Client
Import test collection:
```bash
tests/thunder-client/collections.json
```

### Option 3: cURL / Postman
All routes are RESTful and standard HTTP methods.

**Example:**
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123","role":"producer"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Upload beat (with JWT token from login)
curl -X POST http://localhost:3001/api/producer/beats/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test Beat" \
  -F "genre=Afrobeat" \
  -F "tempo=120" \
  -F "audioFile=@beat.mp3"
```

---

## 🔍 ROUTE PREFIXES

Routes are mounted with these prefixes in `server.js`:

| Prefix | Routes |
|--------|--------|
| `/auth` | Authentication (register, login) |
| `/api` | Public beats, licenses |
| `/api/producer` | Producer beat upload, management |
| `/api/buyer` | Purchases, payment methods, downloads |
| `/api/admin` | Admin analytics, disputes, withdrawals |

---

## ✅ VERIFICATION

All routes have:
- ✅ Proper error handling
- ✅ JWT authentication where required
- ✅ Role-based authorization (producer/buyer/admin)
- ✅ Input validation
- ✅ Swagger JSDoc comments
- ✅ Automated tests in `src/backend/__tests__/`

**Run tests:**
```bash
npm test                    # All tests
npm run test:business-logic # Business logic only
npm run test:integration    # Integration tests only
npm run test:coverage       # Coverage report
```

---

## 📝 NEXT STEPS

1. **Frontend Implementation** - Build React UI for these routes
2. **Payment Gateway** - Integrate Paystack (test mode first)
3. **Email Notifications** - Add transactional emails for purchases
4. **Production Deployment** - Deploy to Railway/Render when ready
