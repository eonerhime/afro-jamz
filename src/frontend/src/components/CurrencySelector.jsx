import { useCurrency } from "../hooks/useCurrency";
import { CURRENCIES } from "../utils/currency";

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="relative inline-block">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer transition-colors"
        aria-label="Select currency"
      >
        {Object.entries(CURRENCIES).map(([code, { symbol, name }]) => (
          <option key={code} value={code}>
            {symbol} {code} - {name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
