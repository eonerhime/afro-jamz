// Currency conversion utilities

// Common currency codes and their symbols
export const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  ZAR: { symbol: "R", name: "South African Rand" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
};

// Map of country codes to currency codes
const COUNTRY_TO_CURRENCY = {
  US: "USD",
  NG: "NGN",
  ZA: "ZAR",
  KE: "KES",
  GH: "GHS",
  EG: "EGP",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  // EU countries
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
};

// Exchange rates (relative to USD)
// In production, these should be fetched from a real API like exchangerate-api.com
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1540,
  ZAR: 18.5,
  KES: 129,
  GHS: 15.2,
  EGP: 49.5,
  CAD: 1.36,
  AUD: 1.52,
};

/**
 * Detect user's currency based on browser locale and timezone
 * @returns {string} Currency code (e.g., 'USD', 'NGN')
 */
export function detectUserCurrency() {
  // Check localStorage first
  const savedCurrency = localStorage.getItem("preferredCurrency");
  if (savedCurrency && CURRENCIES[savedCurrency]) {
    return savedCurrency;
  }

  // Try to detect from browser locale
  try {
    const locale = navigator.language || navigator.userLanguage;

    // Extract country code from locale (e.g., 'en-NG' -> 'NG')
    const countryCode = locale.split("-")[1]?.toUpperCase();

    if (countryCode && COUNTRY_TO_CURRENCY[countryCode]) {
      return COUNTRY_TO_CURRENCY[countryCode];
    }
  } catch (error) {
    console.error("Error detecting currency from locale:", error);
  }

  // Default to USD
  return "USD";
}

/**
 * Convert USD price to target currency
 * @param {number} usdPrice - Price in USD
 * @param {string} targetCurrency - Target currency code
 * @returns {number} Converted price
 */
export function convertCurrency(usdPrice, targetCurrency = "USD") {
  if (!usdPrice || isNaN(usdPrice)) return 0;

  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return usdPrice * rate;
}

/**
 * Format price with currency symbol
 * @param {number} price - Price to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string
 */
export function formatPrice(price, currency = "USD") {
  if (!price || isNaN(price)) return "Free";

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;

  // Format number based on currency
  let formattedNumber;
  if (["NGN", "KES", "ZAR"].includes(currency)) {
    // For African currencies, show whole numbers
    formattedNumber = Math.round(price).toLocaleString();
  } else {
    // For others, show 2 decimal places
    formattedNumber = price.toFixed(2);
  }

  return `${currencyInfo.symbol}${formattedNumber}`;
}

/**
 * Set user's preferred currency
 * @param {string} currency - Currency code
 */
export function setPreferredCurrency(currency) {
  if (CURRENCIES[currency]) {
    localStorage.setItem("preferredCurrency", currency);
  }
}

/**
 * Get user's preferred currency
 * @returns {string} Currency code
 */
export function getPreferredCurrency() {
  return localStorage.getItem("preferredCurrency") || detectUserCurrency();
}
