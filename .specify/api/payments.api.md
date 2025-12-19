# Payment Methods API

## Overview
Payment method management endpoints for adding, updating, and managing payment instruments for transactions.

---

## Endpoints

### POST /payment-methods
Add a new payment method (buyer or producer).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentType": "credit_card | debit_card | bank_account (required)",
  "token": "string (required)",
  "nickname": "string (optional)",
  "isDefault": "boolean (optional, default: false)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "userId": "string",
  "paymentType": "credit_card | debit_card | bank_account",
  "nickname": "string",
  "lastFour": "string",
  "isDefault": "boolean",
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid payment data
- `401 Unauthorized` - Invalid or missing token
- `402 Payment Required` - Payment provider validation failed
- `409 Conflict` - Duplicate payment method

---

### GET /payment-methods
List saved payment methods.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "paymentMethods": [
    {
      "id": "string",
      "paymentType": "credit_card | debit_card | bank_account",
      "nickname": "string",
      "lastFour": "string",
      "isDefault": "boolean",
      "createdAt": "timestamp"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

### PATCH /payment-methods/{id}/default
Set default payment method.

**Path Parameters:**
```
id: string (required) - Unique payment method identifier
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isDefault": "boolean (required)"
}
```

**Response (200 OK):**
```json
{
  "id": "string",
  "paymentType": "credit_card | debit_card | bank_account",
  "nickname": "string",
  "lastFour": "string",
  "isDefault": "boolean",
  "updatedAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not own this payment method
- `404 Not Found` - Payment method does not exist

---

### DELETE /payment-methods/{id}
Remove payment method.

**Path Parameters:**
```
id: string (required) - Unique payment method identifier
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Payment method successfully removed",
  "id": "string"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not own this payment method
- `404 Not Found` - Payment method does not exist

---

## Rules

### Provider References Only
- Only references to payment provider tokens are stored
- Sensitive card data is never stored directly
- All actual payment information is maintained by external payment processor
- System stores only token reference and last four digits for display

### User Ownership
- Users can only manage their own payment methods
- Cannot modify or delete payment methods belonging to other users
- Default payment method applies only to the authenticated user

### Default Payment Method
- Each user can have only one default payment method
- Setting a new default automatically unsets the previous default
- Default method is used automatically for new purchases when available

### Transaction Preservation
- Removing a payment method does not affect past transactions
- Historical transaction records remain intact and accessible
- Removed payment methods can no longer be used for new transactions
- Users can still view transaction details using removed payment methods

### Payment Method Types
- `credit_card` - Credit card payments
- `debit_card` - Debit card payments
- `bank_account` - Bank transfer or ACH payments
