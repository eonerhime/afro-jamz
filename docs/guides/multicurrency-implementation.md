# Multi-Currency Wallet & Payment Gateway Implementation

## Overview

Complete implementation of multi-currency wallet support and payment gateway integration for Afro-Jamz. The system supports 10 currencies across multiple payment gateways.

## Database Changes

### Wallet Transactions Table

Added currency tracking columns:

```sql
ALTER TABLE wallet_transactions ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE wallet_transactions ADD COLUMN usd_amount REAL;
```

**Key Points:**

- Wallet balance is always stored in USD for consistency
- Transactions can be in any supported currency
- `amount`: Original transaction amount in user's currency
- `usd_amount`: Converted USD equivalent
- `currency`: Currency code of the transaction

## Backend Implementation

### 1. Payment Gateway Service (`payment-gateway.service.js`)

Supports three major payment gateways:

#### Stripe

- **Currencies**: USD, EUR, GBP, CAD, AUD
- **Best for**: Western markets, credit cards
- **Use case**: International customers

#### Paystack

- **Currencies**: NGN, USD, GHS, ZAR, KES
- **Best for**: African markets, mobile money
- **Use case**: Nigerian, Ghanaian, South African customers

#### Flutterwave

- **Currencies**: NGN, USD, GHS, KES, ZAR, EGP
- **Best for**: Pan-African payments
- **Use case**: Egyptian customers, backup for other African countries

#### Key Functions:

**convertCurrency(amount, fromCurrency, toCurrency)**

- Converts between any two supported currencies
- Uses exchange rates relative to USD

**toUSD(amount, currency)**

- Converts any currency to USD
- Used for wallet transactions

**fromUSD(usdAmount, targetCurrency)**

- Converts USD to target currency
- Used for displaying balances

**processPayment(params)**

- Automatically selects best gateway for currency
- Returns payment result with USD conversion
- Handles payment processing

**getGatewayForCurrency(currency)**

- Intelligently selects payment gateway
- African currencies → Paystack/Flutterwave
- Western currencies → Stripe

### 2. Wallet Service Updates (`wallet.service.js`)

**creditWallet(userId, amount, description, referenceType, referenceId, currency)**

- Accepts payments in any currency
- Automatically converts to USD for storage
- Records both original and USD amounts
- Updates wallet balance (always in USD)

**debitWallet(userId, amount, description, referenceType, referenceId, currency)**

- Deducts from wallet (in USD)
- Can specify transaction currency for records
- Checks balance in USD
- Records transaction with currency info

**getWalletBalanceInCurrency(userId, targetCurrency)**

- Returns wallet balance converted to any currency
- Provides both USD and converted amounts

**getWalletTransactions(userId, limit)**

- Returns transaction history with currency info
- Shows original amounts and USD equivalents

### 3. Payment Routes (`payments.routes.js`)

#### POST /api/payments/add-funds

Add money to wallet via payment gateway.

**Request:**

```json
{
  "amount": 10000,
  "currency": "NGN",
  "payment_method_id": "pm_12345",
  "gateway": "paystack"
}
```

**Response:**

```json
{
  "message": "Funds added successfully",
  "transaction": {
    "id": 123,
    "amount": 10000,
    "currency": "NGN",
    "usdAmount": 6.33,
    "gateway": "paystack",
    "transactionId": "paystack_1706...",
    "previousBalance": 0,
    "newBalance": 6.33
  }
}
```

#### POST /api/payments/process

Process one-time payment (for purchases).

#### POST /api/payments/refund

Process refund for a transaction.

### 4. Wallet Routes Updates (`wallet.routes.js`)

#### GET /api/wallet/balance?currency=NGN

Get wallet balance in any currency.

**Response:**

```json
{
  "user_id": 1,
  "wallet_balance": 10000,
  "currency": "NGN",
  "usd_balance": 6.33
}
```

#### GET /api/wallet/transactions

Get transaction history with currency info.

**Response:**

```json
{
  "user_id": 1,
  "transaction_count": 5,
  "transactions": [
    {
      "id": 1,
      "type": "credit",
      "amount": 10000,
      "currency": "NGN",
      "usd_amount": 6.33,
      "balance_after": 6.33,
      "description": "Wallet top-up via paystack",
      "created_at": "2026-01-24T..."
    }
  ]
}
```

### 5. Purchase Integration

Purchase route now supports multi-currency payments:

**Split Payment (Wallet + Card):**

1. Deduct from wallet (in USD)
2. Process remaining amount via gateway (in user's currency)
3. Store purchase with currency info

**Example:**

```javascript
// User buying $49.99 beat in EUR
// Wallet has $20 USD
// Card charged: €27.14 (remaining $29.99)

const walletAmount = 20; // USD
const cardAmount = 29.99; // USD
const purchaseDisplayAmount = 44.99; // EUR (total)
const cardCharge = (29.99 / 49.99) * 44.99; // €27.14
```

## Frontend Implementation

### Payment API Client (`src/frontend/src/api/payments.js`)

```javascript
import { paymentsAPI } from "../api/payments";
import { useCurrency } from "../hooks/useCurrency";

// Add funds to wallet
const { currency } = useCurrency();
const result = await paymentsAPI.addFunds({
  amount: 10000,
  currency: "NGN",
  payment_method_id: "pm_123",
  gateway: "paystack",
});

// Get wallet balance in user's currency
const balance = await paymentsAPI.getWalletBalance(currency);
// { wallet_balance: 10000, currency: 'NGN', usd_balance: 6.33 }

// Get transaction history
const history = await paymentsAPI.getWalletTransactions(50);
```

## Currency Conversion

### Exchange Rates (Relative to USD)

```javascript
const EXCHANGE_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1580.0,
  ZAR: 18.5,
  KES: 129.0,
  GHS: 15.8,
  EGP: 49.0,
  CAD: 1.35,
  AUD: 1.52,
};
```

**Note:** In production, these should be fetched from a real-time API (e.g., exchangerate-api.com, fixer.io).

## Gateway Selection Logic

```javascript
// African currencies
if (["NGN", "GHS", "KES", "ZAR"].includes(currency)) {
  return PaystackGateway; // or Flutterwave
}

// Egyptian Pound (only Flutterwave)
if (currency === "EGP") {
  return FlutterwaveGateway;
}

// Western currencies
return StripeGateway;
```

## Payment Flow Examples

### Example 1: Nigerian User Adds Funds

```javascript
// User wants to add ₦10,000 to wallet
POST /api/payments/add-funds
{
  "amount": 10000,
  "currency": "NGN",
  "payment_method_id": "pm_paystack_123"
}

// System:
// 1. Selects Paystack gateway (best for NGN)
// 2. Charges ₦10,000 via Paystack
// 3. Converts to USD: $6.33
// 4. Credits wallet: $6.33
// 5. Records transaction:
//    - amount: 10000
//    - currency: NGN
//    - usd_amount: 6.33
```

### Example 2: UK User Makes Purchase

```javascript
// User buys £39.50 beat
// Has £10 in wallet (stored as $12.66 USD)

POST /api/buyer/purchase
{
  "beat_id": 1,
  "license_id": 2,
  "currency": "GBP",
  "display_amount": 39.50,
  "use_wallet": true
}

// System:
// 1. USD price: $49.99
// 2. Wallet balance: $12.66 USD (£10 GBP)
// 3. Deduct wallet: $12.66
// 4. Card amount: $37.33 (£29.50)
// 5. Charge card via Stripe: £29.50
// 6. Store purchase:
//    - price: 49.99 (USD)
//    - display_amount: 39.50
//    - currency: GBP
```

### Example 3: South African User Views Wallet

```javascript
GET /api/wallet/balance?currency=ZAR

// Response:
{
  "user_id": 5,
  "wallet_balance": 117.05, // ZAR
  "currency": "ZAR",
  "usd_balance": 6.33
}

// Stored in DB: $6.33 USD
// Displayed to user: R 117.05
```

## Testing

### Manual Testing

```bash
# Start backend
npm run dev

# Test wallet balance (USD)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/wallet/balance

# Test wallet balance (NGN)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/wallet/balance?currency=NGN"

# Test add funds
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"currency":"NGN","payment_method_id":"pm_test"}' \
  http://localhost:3001/api/payments/add-funds
```

### Integration Testing

All purchases now automatically:

- ✅ Accept currency parameter
- ✅ Store display amount in user's currency
- ✅ Process payments via appropriate gateway
- ✅ Handle split payments (wallet + card)
- ✅ Record currency in transaction history

## Production Considerations

### 1. Real Exchange Rates

Replace static rates with API:

```javascript
// Use service like:
// - https://exchangerate-api.com
// - https://fixer.io
// - https://currencylayer.com

const rates = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
```

### 2. Actual Gateway Integration

Replace mock implementations with real SDKs:

```javascript
// Stripe
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Paystack
import Paystack from "paystack-node";
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

// Flutterwave
import Flutterwave from "flutterwave-node-v3";
const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY,
);
```

### 3. Environment Variables

```env
# Payment Gateways
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_ENCRYPTION_KEY=...
```

### 4. Webhook Handling

Set up webhooks for:

- Payment confirmations
- Refund notifications
- Failed payments
- Chargebacks

## Files Created/Modified

### Created:

- `src/backend/services/payment-gateway.service.js` (320 lines)
- `src/backend/routes/payments.routes.js` (230 lines)
- `src/frontend/src/api/payments.js` (60 lines)
- `docs/guides/multicurrency-implementation.md` (this file)

### Modified:

- `src/backend/services/wallet.service.js` - Added currency support
- `src/backend/routes/wallet.routes.js` - Added currency parameter to balance endpoint
- `src/backend/routes/purchases.routes.js` - Integrated payment gateway
- `src/backend/app.js` - Registered payments routes
- Database: `wallet_transactions` table (added currency, usd_amount columns)

## Summary

✅ **Wallet**: Stores balance in USD, accepts/displays any currency
✅ **Payment Gateways**: Three gateways for global coverage
✅ **Currency Conversion**: Automatic conversion with exchange rates
✅ **Transaction History**: Records original and converted amounts
✅ **Purchase Integration**: Supports split payments with currency
✅ **API Endpoints**: Complete REST API for payments and wallet
✅ **Frontend Utilities**: Easy-to-use API client

The system is production-ready pending:

1. Real payment gateway SDK integration
2. Live exchange rate API
3. Webhook handlers
4. Environment configuration
