import { useState } from "react";
import PropTypes from "prop-types";
import { CurrencyContext } from "../hooks/useCurrency";
import {
  detectUserCurrency,
  setPreferredCurrency as savePreferredCurrency,
  CURRENCIES,
} from "../utils/currency";

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => detectUserCurrency());

  const updateCurrency = (newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrency(newCurrency);
      savePreferredCurrency(newCurrency);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: updateCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

CurrencyProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
