# Currency Support Implementation - Purchase Flow

## Overview

The purchase flow now supports multi-currency transactions. Users can make purchases in their preferred currency, while the backend stores both the display amount (in user's currency) and the USD equivalent for consistent seller payouts.

## Database Changes

### Purchases Table

Added two new columns:

- `currency` (TEXT, default 'USD'): The currency code the user selected during purchase
- `display_amount` (REAL): The price in the user's selected currency

```sql
ALTER TABLE purchases ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE purchases ADD COLUMN display_amount REAL;
```

## Backend API Changes

### POST /api/buyer/purchase

**Request Body** (updated):

```json
{
  "beat_id": 1,
  "license_id": 2,
  "currency": "EUR",
  "display_amount": 44.99,
  "payment_method_id": 3,
  "use_wallet": false
}
```

**Response** (updated):

```json
{
  "message": "Purchase successful",
  "purchase_id": 123,
  "beat_id": 1,
  "license": {
    "name": "WAV Lease",
    "price": 49.99,
    "usage_rights": "...",
    "exclusive": false
  },
  "payment_breakdown": {
    "total": 49.99,
    "wallet_used": 0,
    "card_charged": 49.99
  },
  "currency": {
    "code": "EUR",
    "display_amount": 44.99,
    "usd_amount": 49.99
  },
  "hold_until_date": "7 days from now"
}
```

### GET /api/buyer/purchases

Now includes currency information in the response:

```json
[
  {
    "purchase_id": 123,
    "paid_price": 49.99,
    "currency": "EUR",
    "display_amount": 44.99,
    "beat_title": "Midnight Groove",
    "license_name": "WAV Lease",
    ...
  }
]
```

## Frontend Implementation

### Purchase Helper Utility

Created `src/frontend/src/utils/purchase.js` with two helper functions:

1. **preparePurchaseData()** - Converts purchase request with currency info

   ```javascript
   import { preparePurchaseData } from "../utils/purchase";
   import { useCurrency } from "../hooks/useCurrency";

   const { currency } = useCurrency();

   const purchaseData = preparePurchaseData({
     beat_id: 1,
     license_id: 2,
     usdPrice: 49.99, // Price from backend (always in USD)
     currency: currency, // User's selected currency
     payment_method_id: 3,
     use_wallet: false,
   });

   // Result:
   // {
   //   beat_id: 1,
   //   license_id: 2,
   //   currency: 'EUR',
   //   display_amount: 44.99,
   //   payment_method_id: 3,
   //   use_wallet: false
   // }
   ```

2. **formatPurchaseForDisplay()** - Formats purchase history with proper currency

   ```javascript
   import { formatPurchaseForDisplay } from "../utils/purchase";

   const formattedPurchase = formatPurchaseForDisplay(purchaseRecord);
   // Adds displayPrice, displayCurrency, usdPrice for easy rendering
   ```

### Purchase API Client

Updated `src/frontend/src/api/purchases.js`:

```javascript
// Now accepts currency and display_amount
purchasesAPI.create({
  beat_id: 1,
  license_id: 2,
  currency: "EUR",
  display_amount: 44.99,
  payment_method_id: 3,
  use_wallet: false,
});
```

## Usage Example

When a user clicks "Buy" on a beat:

```javascript
import { useCurrency } from "../hooks/useCurrency";
import { preparePurchaseData } from "../utils/purchase";
import { purchasesAPI } from "../api/purchases";

function BeatCheckout({ beat, selectedLicense }) {
  const { currency } = useCurrency();

  const handlePurchase = async () => {
    try {
      const purchaseData = preparePurchaseData({
        beat_id: beat.id,
        license_id: selectedLicense.id,
        usdPrice: selectedLicense.price, // USD price from backend
        currency: currency, // User's selected currency from context
        payment_method_id: selectedPaymentMethod.id,
        use_wallet: useWalletBalance,
      });

      const result = await purchasesAPI.create(purchaseData);

      // result.currency contains:
      // - code: 'EUR'
      // - display_amount: 44.99
      // - usd_amount: 49.99

      console.log("Purchase successful!", result);
    } catch (error) {
      console.error("Purchase failed:", error);
    }
  };

  return <button onClick={handlePurchase}>Purchase Now</button>;
}
```

## Important Notes

1. **Price Storage**: The backend always stores prices in USD in the `price` field for consistency in payouts and accounting.

2. **Display Amount**: The `display_amount` field stores what the user actually saw and paid in their currency.

3. **Currency Conversion**: Conversion happens on the frontend using the currency utilities. The backend accepts whatever the frontend sends.

4. **Seller Payouts**: Sellers are always paid in USD based on the `price` field, ensuring consistent earnings regardless of buyer's currency.

5. **Purchase History**: When displaying purchase history, use the `currency` and `display_amount` fields to show users what they paid in their currency.

6. **Migration**: Existing purchases are automatically set to USD with `display_amount = price`.

## Next Steps

The following items remain in the multi-currency implementation:

- [ ] Store multi-currency purchase data (✅ COMPLETED)
- [ ] Implement multi-currency wallet support
- [ ] Add payment gateway currency integration (Stripe, Paystack, Flutterwave)
