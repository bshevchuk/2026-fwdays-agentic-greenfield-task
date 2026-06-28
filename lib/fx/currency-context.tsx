'use client';
// @trace FR-FX-04

import { createContext, useContext, useState } from 'react';
import { SUPPORTED_CURRENCIES } from './supported-currencies';

interface CurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  supportedCurrencies: readonly string[];
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: 'USD',
  setDisplayCurrency: () => {},
  supportedCurrencies: SUPPORTED_CURRENCIES,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  return (
    <CurrencyContext.Provider
      value={{ displayCurrency, setDisplayCurrency, supportedCurrencies: SUPPORTED_CURRENCIES }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export const useDisplayCurrency = () => useContext(CurrencyContext);
