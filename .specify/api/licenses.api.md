# Licensing API

## Overview
License management endpoints for defining and managing beat licensing terms and conditions.

---

## Endpoints

### POST /beats/{beatId}/licenses
Create licensing terms for a beat.

**Path Parameters:**
```
beatId: string (required) - Unique beat identifier
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "price": "number (required)",
  "terms": "string (required)",
  "commercialUse": "boolean (required)",
  "attributionRequired": "boolean (required)",
  "maxDownloads": "number (optional)",
  "expiresAt": "timestamp (optional)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "beatId": "string",
  "name": "string",
  "description": "string",
  "price": "number",
  "terms": "string",
  "commercialUse": "boolean",
  "attributionRequired": "boolean",
  "maxDownloads": "number",
  "expiresAt": "timestamp",
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not the beat producer
- `404 Not Found` - Beat does not exist

---

### GET /beats/{beatId}/licenses
List available licenses for a beat.

**Path Parameters:**
```
beatId: string (required) - Unique beat identifier
```

**Response (200 OK):**
```json
{
  "beatId": "string",
  "licenses": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": "number",
      "terms": "string",
      "commercialUse": "boolean",
      "attributionRequired": "boolean",
      "maxDownloads": "number",
      "expiresAt": "timestamp",
      "createdAt": "timestamp"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found` - Beat does not exist

---

## Rules

### Minimum License Requirement
- A beat must have at least one license before it can be purchased
- Producers cannot delete all licenses from a beat
- At least one active license must remain available at all times

### License Immutability
- Licenses cannot be edited after a purchase has been made using that license
- Purchased licenses are locked and cannot be modified
- Producers can only create new licenses; editing existing purchased licenses is not allowed
- Non-purchased licenses may be deletable (if not specifically locked by system)

### License Terms
- Each license defines usage rights and restrictions
- `commercialUse` determines if the beat can be used commercially
- `attributionRequired` specifies if producer credit is mandatory
- `maxDownloads` limits number of times the license can be used
- `expiresAt` timestamp defines when the license becomes unavailable
