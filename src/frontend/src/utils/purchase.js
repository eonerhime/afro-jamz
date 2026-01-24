import { convertCurrency } from "./currency";

/**
 * Prepare purchase data with currency information
 * @param {Object} params - Purchase parameters
 * @param {number} params.beat_id - ID of the beat to purchase
 * @param {number} params.license_id - ID of the selected license
 * @param {number} params.usdPrice - Price in USD (from backend)
 * @param {string} params.currency - User's selected currency code
 * @param {number} [params.payment_method_id] - Payment method ID (optional)
 * @param {boolean} [params.use_wallet] - Whether to use wallet balance (optional)
 * @returns {Object} Purchase data ready to send to API
 */
export function preparePurchaseData({
  beat_id,
  license_id,
  usdPrice,
  currency,
  payment_method_id,
  use_wallet = false,
}) {
  // Convert USD price to user's selected currency
  const display_amount = convertCurrency(usdPrice, currency);

  return {
    beat_id,
    license_id,
    currency, // User's selected currency (e.g., 'EUR', 'NGN')
    display_amount, // Amount in user's currency
    ...(payment_method_id && { payment_method_id }),
    use_wallet,
  };
}

/**
 * Format purchase history item for display
 * @param {Object} purchase - Purchase record from API
 * @returns {Object} Formatted purchase with proper currency display
 */
export function formatPurchaseForDisplay(purchase) {
  return {
    ...purchase,
    // If purchase has currency info, use it; otherwise default to USD
    displayPrice: purchase.display_amount || purchase.paid_price,
    displayCurrency: purchase.currency || "USD",
    usdPrice: purchase.paid_price,
  };
}
