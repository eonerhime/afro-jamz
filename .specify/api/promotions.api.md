# Promotions API

## Overview
Beat promotion management endpoints for producers to promote their beats and track active promotions.

---

## Endpoints

### POST /promotions
Promote a beat (producer only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "beatId": "string (required)",
  "promotionType": "featured | sponsored | trending (required)",
  "duration": "number (required, in days)",
  "paymentMethodId": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "beatId": "string",
  "beatTitle": "string",
  "producerId": "string",
  "promotionType": "featured | sponsored | trending",
  "price": "number",
  "duration": "number",
  "startDate": "timestamp",
  "expiresAt": "timestamp",
  "status": "active",
  "impressions": 0,
  "clicks": 0,
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid promotion data
- `401 Unauthorized` - Invalid or missing token
- `402 Payment Required` - Payment processing failed
- `403 Forbidden` - User is not a producer
- `404 Not Found` - Beat or payment method does not exist
- `409 Conflict` - Beat already has active promotion

---

### GET /promotions
List active promotions for producer.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
status: "active" | "expired" | "all" (optional, default: "active")
sortBy: "newest" | "expiring-soon" | "most-impressions" (optional, default: "newest")
limit: number (optional, default: 20)
offset: number (optional, default: 0)
```

**Response (200 OK):**
```json
{
  "total": "number",
  "promotions": [
    {
      "id": "string",
      "beatId": "string",
      "beatTitle": "string",
      "promotionType": "featured | sponsored | trending",
      "price": "number",
      "duration": "number",
      "startDate": "timestamp",
      "expiresAt": "timestamp",
      "status": "active | expired",
      "impressions": "number",
      "clicks": "number",
      "createdAt": "timestamp"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a producer

---

## Rules

### Producer-Only Access
- Only users with `producer` role can create promotions via POST /promotions
- Producers can only manage their own beat promotions
- Non-producers cannot access promotion endpoints

### Payment Requirements
- Promotions require successful payment at time of creation
- Valid payment method must be provided and available
- Payment must be processed before promotion is activated
- Failed payments result in `402 Payment Required` error

### Automatic Expiration
- Promotions automatically expire after specified duration period
- Expired promotions move to `expired` status automatically
- System removes expired promotions from active promotion listings
- Historical promotion data is preserved after expiration

### Promotion Types
- `featured` - Beat displayed in featured section
- `sponsored` - Beat appears as sponsored in search results
- `trending` - Beat included in trending section

### Licensing Independence
- Promotions do not alter licensing rules for beats
- All licensing terms remain unchanged regardless of promotion status
- Promotion visibility does not affect purchase requirements or license availability
- License immutability rules remain in effect for promoted beats

### Promotion Lifecycle
- Once created, promotions cannot be edited
- Promotion duration is fixed at creation time
- Early termination of promotions may be subject to refund policies (application-level)
- Only one active promotion per beat at a time

### Metrics and Tracking
- System tracks impressions (promotion views) and clicks (interaction events)
- Producers can view promotion performance metrics via GET /promotions
- Metrics are updated in real-time during active promotion period
- Metrics are preserved after promotion expiration for historical reference
