# Referrals API

## Overview
Referral program management endpoints for generating referral links, tracking referral activity, and managing referral earnings.

---

## Endpoints

### POST /referrals
Generate referral identifier or link.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customCode": "string (optional, alphanumeric, 4-20 characters)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "userId": "string",
  "referralCode": "string",
  "referralLink": "string",
  "customCode": "string (optional)",
  "status": "active",
  "createdAt": "timestamp"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid custom code format
- `401 Unauthorized` - Invalid or missing token
- `409 Conflict` - Custom code already in use

---

### GET /referrals
Fetch referral earnings and activity.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
status: "active" | "inactive" | "all" (optional, default: "all")
sortBy: "newest" | "most-earnings" | "most-referrals" (optional, default: "newest")
limit: number (optional, default: 50)
offset: number (optional, default: 0)
```

**Response (200 OK):**
```json
{
  "referralCode": "string",
  "referralLink": "string",
  "totalReferrals": "number",
  "totalEarnings": "number",
  "currency": "USD",
  "referrals": [
    {
      "id": "string",
      "referredUserId": "string",
      "referredUserEmail": "string",
      "referralCode": "string",
      "status": "pending | completed | cancelled",
      "referredAt": "timestamp",
      "completedAt": "timestamp (optional)",
      "rewardAmount": "number",
      "firstPurchaseAmount": "number (optional)"
    }
  ],
  "earnings": {
    "totalEarned": "number",
    "pendingRewards": "number",
    "paidRewards": "number"
  },
  "generatedAt": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

## Rules

### Self-Referral Prevention
- Users cannot use their own referral code to create accounts
- Self-referral attempts are rejected and result in `409 Conflict` error
- System detects self-referral attempts based on email and user identity
- Referral reward is not applied if self-referral is detected
- Users attempting self-referral are flagged in the system

### One Reward Per Purchase
- Referral reward is applied only once per referred user purchase
- Each referred user's first purchase triggers one referral reward
- Subsequent purchases by referred user do not generate additional referral rewards
- Reward is locked to the referral code used during registration
- Multiple referral codes cannot be stacked or combined for a single purchase

### Referral Eligibility
- Referral reward applies only to first-time buyers
- Both referrer and referred user must complete account creation
- Referred user must make a purchase using a valid license
- Purchase must complete successfully before reward is applied

### Referral Status Tracking
- `pending` - Referred user has registered but not yet made a purchase
- `completed` - Referred user has made their first purchase and reward applied
- `cancelled` - Referral was cancelled or user deleted their account

### Reward Timing
- Rewards are calculated after purchase is confirmed
- Pending rewards become available within 7 business days
- Paid rewards are transferred via existing payment methods

### Referral Code Rules
- System-generated codes are unique alphanumeric identifiers
- Custom codes must be 4-20 alphanumeric characters
- Custom codes are first-come, first-served
- Codes are case-insensitive but stored in lowercase
- Once created, referral codes cannot be deleted or modified
- Each user can have multiple active referral codes

### Tracking and Attribution
- Referral is attributed to the code used during referred user's registration
- System tracks referral source and timestamp
- Referral data is immutable after creation
- Referred user remains associated with referrer even if referrer deletes account
