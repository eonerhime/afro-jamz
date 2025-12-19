# Purchase API

## Overview
Purchase management endpoints for buying beats, tracking purchases, and accessing licensed content.

---

## Endpoints

### POST /purchases
Purchase a beat with selected license.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "beatId": "string (required)",
  "licenseId": "string (required)",
  "paymentMethodId": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "beatId": "string",
  "licenseId": "string",
  "buyerId": "string",
  "producerId": "string",
  "beatTitle": "string",
  "licenseName": "string",
  "price": "number",
  "downloadUrl": "string",
  "purchasedAt": "timestamp",
  "expiresAt": "timestamp (optional)",
  "status": "completed"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid beat or license ID
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a buyer
- `404 Not Found` - Beat or license does not exist
- `409 Conflict` - License already purchased by user or license expired
- `402 Payment Required` - Payment processing failed

---

### GET /purchases
List buyer purchase history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
status: "completed" | "pending" | "expired" (optional)
sortBy: "newest" | "oldest" | "price-high" | "price-low" (optional, default: "newest")
limit: number (optional, default: 20)
offset: number (optional, default: 0)
```

**Response (200 OK):**
```json
{
  "total": "number",
  "purchases": [
    {
      "id": "string",
      "beatId": "string",
      "beatTitle": "string",
      "producerName": "string",
      "licenseName": "string",
      "price": "number",
      "status": "completed | pending | expired",
      "purchasedAt": "timestamp",
      "expiresAt": "timestamp (optional)"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a buyer

---

### GET /purchases/{purchaseId}
Fetch purchase details and access rights.

**Path Parameters:**
```
purchaseId: string (required) - Unique purchase identifier
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "string",
  "beatId": "string",
  "licenseId": "string",
  "buyerId": "string",
  "producerId": "string",
  "beatTitle": "string",
  "beatDescription": "string",
  "producerName": "string",
  "licenseName": "string",
  "price": "number",
  "downloadUrl": "string",
  "downloadCount": "number",
  "maxDownloads": "number",
  "commercialUse": "boolean",
  "attributionRequired": "boolean",
  "purchasedAt": "timestamp",
  "expiresAt": "timestamp (optional)",
  "status": "completed | pending | expired",
  "accessRights": {
    "canDownload": "boolean",
    "canUseCommercially": "boolean",
    "requiresAttribution": "boolean"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not own this purchase
- `404 Not Found` - Purchase does not exist

---

## Rules

### Authentication and Authorization
- All endpoints require authentication with valid bearer token
- Buyers can only view and manage their own purchases
- Producers cannot access buyer purchase data

### Payment Processing
- Valid payment method required for POST /purchases
- Payment must be processed successfully before purchase is confirmed
- Failed payments return `402 Payment Required` error

### Purchase Status
- `completed` - Purchase successful and user has full access
- `pending` - Payment processing in progress
- `expired` - License expiration date has passed (if applicable)

### Access Rights
- Access rights are determined by the license terms
- `canDownload` - User is permitted to download the beat file
- `canUseCommercially` - License allows commercial usage
- `requiresAttribution` - Producer attribution must be included in projects

### Download Limits
- Each purchase tracks download count against `maxDownloads` limit
- When `downloadCount` reaches `maxDownloads`, further downloads are blocked
- `maxDownloads` of `null` or `0` indicates unlimited downloads

### Purchase History
- Purchase history is immutable and preserved permanently
- Users can filter and sort their purchase history
- Expired purchases remain visible in history
