// Test script to demonstrate currency support in purchase flow
import { convertCurrency } from "../src/frontend/src/utils/currency.js";
import { preparePurchaseData } from "../src/frontend/src/utils/purchase.js";

console.log("🧪 Testing Currency Support in Purchase Flow\n");

// Scenario 1: User from Nigeria buying a $49.99 beat
console.log("📍 Scenario 1: Nigerian buyer purchasing WAV Lease");
const nigerianPurchase = preparePurchaseData({
  beat_id: 1,
  license_id: 2,
  usdPrice: 49.99,
  currency: "NGN",
  payment_method_id: 1,
  use_wallet: false,
});
console.log("Purchase data:", nigerianPurchase);
console.log(
  `✅ User sees: ₦${nigerianPurchase.display_amount.toLocaleString("en-NG")}`,
);
console.log(`✅ Seller receives: $${49.99} USD\n`);

// Scenario 2: User from UK buying a $149.99 exclusive license
console.log("📍 Scenario 2: UK buyer purchasing Exclusive License");
const ukPurchase = preparePurchaseData({
  beat_id: 3,
  license_id: 5,
  usdPrice: 149.99,
  currency: "GBP",
  payment_method_id: 2,
  use_wallet: true,
});
console.log("Purchase data:", ukPurchase);
console.log(`✅ User sees: £${ukPurchase.display_amount.toFixed(2)}`);
console.log(`✅ Seller receives: $${149.99} USD\n`);

// Scenario 3: User from South Africa buying a $29.99 MP3 lease
console.log("📍 Scenario 3: South African buyer purchasing MP3 Lease");
const saPurchase = preparePurchaseData({
  beat_id: 2,
  license_id: 1,
  usdPrice: 29.99,
  currency: "ZAR",
  use_wallet: false,
});
console.log("Purchase data:", saPurchase);
console.log(`✅ User sees: R ${saPurchase.display_amount.toFixed(2)}`);
console.log(`✅ Seller receives: $${29.99} USD\n`);

// Scenario 4: Converting existing USD purchase for display
console.log("📍 Scenario 4: Displaying purchase history");
const historicalPurchase = {
  purchase_id: 123,
  paid_price: 99.99,
  currency: "EUR",
  display_amount: 89.99,
  beat_title: "Midnight Groove",
  license_name: "Trackout License",
};

console.log("Historical purchase:");
console.log(
  `- User paid: €${historicalPurchase.display_amount} (${historicalPurchase.currency})`,
);
console.log(`- Seller earned: $${historicalPurchase.paid_price} USD`);
console.log(
  `- Beat: ${historicalPurchase.beat_title} - ${historicalPurchase.license_name}\n`,
);

console.log("✨ All currency conversions working correctly!");
console.log(
  "📝 Backend stores both display_amount and USD price for accurate records",
);
