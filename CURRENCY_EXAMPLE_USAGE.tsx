// EXAMPLE: How to use currency utilities in your components
// This is a reference file, not meant to be imported directly

'use client';

import { useState, useEffect } from 'react';
import {
  formatCurrency,
  convertCurrency,
  getCurrencySymbol,
  getCurrencyName,
  parseCurrency,
  detectCurrencyFromLocation,
  isValidCurrency,
  getAllCurrencyCodes,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '@/lib/currency';

// ============================================================================
// EXAMPLE 1: Simple Currency Display
// ============================================================================

export function BudgetItemDisplay() {
  return (
    <div>
      <h3>Wedding Venue</h3>
      <p className="text-2xl font-bold">
        {formatCurrency(5000, 'USD')}
      </p>
      <p className="text-sm text-gray-500">
        {formatCurrency(4600, 'EUR')} • {formatCurrency(3950, 'GBP')}
      </p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Currency Selector Dropdown
// ============================================================================

export function CurrencySelector({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CurrencyCode)}
      className="px-3 py-2 border rounded-md"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.symbol} {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// EXAMPLE 3: Money Input Field
// ============================================================================

export function MoneyInput({
  currency = 'USD',
  value,
  onChange,
}: {
  currency?: CurrencyCode;
  value: number;
  onChange: (value: number) => void;
}) {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value, currency));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);

    const parsed = parseCurrency(input);
    onChange(parsed);
  };

  const handleBlur = () => {
    setDisplayValue(formatCurrency(value, currency));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-medium">
        {getCurrencySymbol(currency)}
      </span>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={formatCurrency(0, currency)}
        className="px-3 py-2 border rounded-md flex-1"
      />
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Currency Conversion Display
// ============================================================================

export function ConvertedAmount({
  amount,
  fromCurrency,
  toCurrency,
}: {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
}) {
  const [converted, setConverted] = useState<number | null>(null);

  useEffect(() => {
    convertCurrency(amount, fromCurrency, toCurrency).then(setConverted);
  }, [amount, fromCurrency, toCurrency]);

  if (converted === null) {
    return <div>Converting...</div>;
  }

  return (
    <div>
      <p className="text-xl font-bold">
        {formatCurrency(converted, toCurrency)}
      </p>
      <p className="text-sm text-gray-500">
        {formatCurrency(amount, fromCurrency)}
      </p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Budget Total with Multiple Currencies
// ============================================================================

interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
}

export function BudgetTotal({
  items,
  displayCurrency,
}: {
  items: BudgetItem[];
  displayCurrency: CurrencyCode;
}) {
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    async function calculateTotal() {
      let sum = 0;
      for (const item of items) {
        const converted = await convertCurrency(
          item.amount,
          item.currency,
          displayCurrency
        );
        sum += converted;
      }
      setTotal(sum);
    }
    calculateTotal();
  }, [items, displayCurrency]);

  return (
    <div className="border-t-2 pt-4">
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">Total Budget</span>
        <span className="text-2xl font-bold">
          {formatCurrency(total, displayCurrency)}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-600">
            <span>{item.name}</span>
            <span>{formatCurrency(item.amount, item.currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Auto-detect User Currency
// ============================================================================

export function useUserCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  useEffect(() => {
    // Auto-detect on mount
    const detected = detectCurrencyFromLocation();
    setCurrency(detected);

    console.log(`Detected currency: ${detected}`);
  }, []);

  return [currency, setCurrency] as const;
}

// Usage in a component:
export function UserDashboard() {
  const [userCurrency, setUserCurrency] = useUserCurrency();

  return (
    <div>
      <h1>Welcome!</h1>
      <p>Your currency: {getCurrencyName(userCurrency)}</p>

      <CurrencySelector value={userCurrency} onChange={setUserCurrency} />

      <div className="mt-4">
        <p>Total Budget: {formatCurrency(10000, userCurrency)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Budget Item Card with Currency
// ============================================================================

export function BudgetItemCard({
  item,
  userCurrency,
}: {
  item: BudgetItem;
  userCurrency: CurrencyCode;
}) {
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const showConversion = item.currency !== userCurrency;

  useEffect(() => {
    if (showConversion) {
      convertCurrency(item.amount, item.currency, userCurrency).then(
        setConvertedAmount
      );
    }
  }, [item.amount, item.currency, userCurrency, showConversion]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{item.name}</h3>

      <div className="mt-2">
        <p className="text-xl font-bold">
          {formatCurrency(item.amount, item.currency)}
        </p>

        {showConversion && convertedAmount !== null && (
          <p className="text-sm text-gray-500">
            ≈ {formatCurrency(convertedAmount, userCurrency)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Currency Comparison Table
// ============================================================================

export function CurrencyComparisonTable({ baseAmount = 1000 }: { baseAmount?: number }) {
  const [conversions, setConversions] = useState<Record<string, number>>({});

  useEffect(() => {
    async function convertAll() {
      const results: Record<string, number> = {};
      for (const currency of SUPPORTED_CURRENCIES) {
        results[currency.code] = await convertCurrency(
          baseAmount,
          'USD',
          currency.code as CurrencyCode
        );
      }
      setConversions(results);
    }
    convertAll();
  }, [baseAmount]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Currency
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {SUPPORTED_CURRENCIES.map((currency) => (
            <tr key={currency.code}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currency.symbol}</span>
                  <div>
                    <div className="font-medium">{currency.code}</div>
                    <div className="text-sm text-gray-500">{currency.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-mono">
                {conversions[currency.code]
                  ? formatCurrency(conversions[currency.code], currency.code as CurrencyCode)
                  : 'Loading...'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: Form with Currency Selection
// ============================================================================

export function BudgetItemForm() {
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save to database
    const budgetItem = {
      category,
      item,
      estimated_cost: amount,
      currency, // Save currency alongside amount
    };

    console.log('Saving:', budgetItem);
    // await supabase.from('budget').insert(budgetItem);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Item</label>
        <input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Currency</label>
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <MoneyInput currency={currency} value={amount} onChange={setAmount} />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Add Budget Item
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 10: Settings Panel - Currency Preferences
// ============================================================================

export function CurrencySettingsPanel() {
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>('USD');
  const [autoDetect, setAutoDetect] = useState(true);

  useEffect(() => {
    if (autoDetect) {
      const detected = detectCurrencyFromLocation();
      setPreferredCurrency(detected);
    }
  }, [autoDetect]);

  const handleSave = async () => {
    // Save to user preferences
    console.log('Saving preferences:', {
      preferred_currency: preferredCurrency,
      auto_detect_locale: autoDetect,
    });

    // await supabase
    //   .from('users')
    //   .update({
    //     preferred_currency: preferredCurrency,
    //     auto_detect_locale: autoDetect,
    //   })
    //   .eq('id', userId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Currency Preferences</h2>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoDetect}
          onChange={(e) => setAutoDetect(e.target.checked)}
          id="auto-detect"
        />
        <label htmlFor="auto-detect">Auto-detect currency from location</label>
      </div>

      {!autoDetect && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Preferred Currency
          </label>
          <CurrencySelector
            value={preferredCurrency}
            onChange={setPreferredCurrency}
          />
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          Current: <strong>{getCurrencyName(preferredCurrency)}</strong> (
          {getCurrencySymbol(preferredCurrency)})
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Example: {formatCurrency(1234.56, preferredCurrency)}
        </p>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Save Preferences
      </button>
    </div>
  );
}
