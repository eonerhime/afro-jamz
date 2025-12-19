# User Account API

## Overview
User account management endpoints for retrieving, updating, and deleting user profiles.

---

## Endpoints

### GET /users/me
Fetch authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "string",
  "email": "string",
  "role": "buyer | producer",
  "name": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

### PATCH /users/me
Update personal and account details.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "bio": "string (optional)",
  "avatar": "string (optional)",
  "phone": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "email": "string",
  "role": "buyer | producer",
  "name": "string",
  "bio": "string",
  "avatar": "string",
  "phone": "string",
  "updatedAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid or missing token
- `409 Conflict` - Email modification attempted

---

### DELETE /users/me
Delete buyer or producer account.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
confirm=true (required)
```

**Response (200 OK):**
```json
{
  "message": "Account successfully deleted",
  "id": "string"
}
```

**Error Responses:**
- `400 Bad Request` - Missing confirmation
- `401 Unauthorized` - Invalid or missing token

---

## Rules

### Email Immutability
- Email must not be modifiable through PATCH /users/me
- Attempting to modify email will result in `409 Conflict` error
- Email remains the unique identifier for user accounts

### Account Deletion
- Preserve historical transactions when deleting accounts
- Transaction records remain associated with deleted user ID
- User profile data is removed but transaction history is retained
- Deletion is permanent and cannot be undone
