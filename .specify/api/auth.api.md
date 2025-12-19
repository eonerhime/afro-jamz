# Authentication API

## Overview
Authentication system for managing user accounts, sessions, and access control.

---

## Endpoints

### POST /auth/register
Register a new buyer or producer account.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "role": "buyer | producer (required)",
  "name": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "email": "string",
  "role": "buyer | producer",
  "name": "string",
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `409 Conflict` - Email already registered

---

### POST /auth/login
Authenticate user and return session or token.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "buyer | producer",
    "name": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing credentials
- `401 Unauthorized` - Invalid credentials

---

### POST /auth/logout
Terminate active session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

### GET /auth/me
Return authenticated user profile and role.

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
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

## Rules

### Email Immutability
- Email is immutable after registration
- Email cannot be changed once an account is created
- Email serves as the unique identifier for user accounts

### Role-Based Access
- Role determines access permissions throughout the system
- Valid roles: `buyer`, `producer`
- Role is assigned at registration and determines:
  - Available API endpoints
  - Resource access levels
  - Feature availability
