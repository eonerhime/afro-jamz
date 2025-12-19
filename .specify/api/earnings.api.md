# Earnings API

## Overview
Producer earnings tracking and reporting endpoints for viewing revenue summaries and detailed transaction breakdowns.

---

## Endpoints

### GET /earnings
Fetch producer earnings summary.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
period: "today" | "week" | "month" | "year" | "all-time" (optional, default: "month")
```

**Response (200 OK):**
```json
{
  "producerId": "string",
  "totalEarnings": "number",
  "period": "today | week | month | year | all-time",
  "breakdown": {
    "beatSales": "number",
    "licenseRevenue": "number",
    "promotionCosts": "number",
    "platformFee": "number",
    "netEarnings": "number"
  },
  "stats": {
    "totalTransactions": "number",
    "totalBeats": "number",
    "beatsWithEarnings": "number",
    "averageEarningsPerBeat": "number"
  },
  "generatedAt": "timestamp",
  "currency": "USD"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a producer

---

### GET /earnings/transactions
Fetch detailed earnings breakdown.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
beatId: string (optional) - Filter by specific beat
startDate: timestamp (optional) - Filter transactions from date
endDate: timestamp (optional) - Filter transactions to date
transactionType: "sale" | "promotion" | "fee" | "all" (optional, default: "all")
sortBy: "newest" | "oldest" | "highest" | "lowest" (optional, default: "newest")
limit: number (optional, default: 50)
offset: number (optional, default: 0)
```

**Response (200 OK):**
```json
{
  "total": "number",
  "transactions": [
    {
      "id": "string",
      "beatId": "string",
      "beatTitle": "string",
      "purchaseId": "string",
      "buyerId": "string",
      "buyerName": "string",
      "licenseName": "string",
      "transactionType": "sale | promotion | fee",
      "grossAmount": "number",
      "platformFee": "number",
      "netAmount": "number",
      "status": "completed | pending | refunded",
      "transactionDate": "timestamp"
    }
  ],
  "currency": "USD",
  "generatedAt": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a producer
- `400 Bad Request` - Invalid query parameters

---

## Rules

### Producer-Only Access
- Only users with `producer` role can access earnings endpoints
- Producers can only view their own earnings data
- Access to other producers' earnings is denied
- Non-producers receive `403 Forbidden` response

### Earnings Immutability
- Earnings records are immutable once created
- Historical earnings cannot be edited or deleted
- Earnings transactions cannot be modified after creation
- Changes to products or pricing do not retroactively affect past earnings
- Refunded transactions are marked with `status: refunded` but original record remains

### Transaction Tracking
- All earnings-generating transactions are permanently recorded
- Transaction history includes all completed, pending, and refunded transactions
- Sales transactions record gross amount, platform fee, and net amount
- Promotion costs are tracked as negative transactions
- Platform fees are deducted from gross sales automatically

### Earnings Breakdown Components
- `beatSales` - Revenue from beat purchases
- `licenseRevenue` - Total from all license types sold
- `promotionCosts` - Expenses incurred for beat promotions (negative)
- `platformFee` - System/platform service fees (negative)
- `netEarnings` - Total after all deductions

### Data Retention
- Complete transaction history is retained permanently
- No earnings data is purged or archived
- Deleted beats maintain associated earnings history
- Account deletion preserves earnings records for historical reference

### Currency and Localization
- All earnings are reported in USD
- Historical rates are preserved for past transactions
- Currency conversions (if supported) maintain original transaction currency
