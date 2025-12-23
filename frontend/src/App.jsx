import React, { useState, useEffect, useCallback } from 'react';
import FinancialTable from './FinancialTable';
import './App.css';

// --- HELPERS: Accounting Formatting ---
const formatNumber = (num) => {
  if (num == null || num === '' || isNaN(num)) return '';
  const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const cleanNumber = (str) => {
  if (!str) return '';
  return str.toString().replace(/,/g, '');
};

// Strip non-numeric characters but keep one decimal point
const sanitizeNumericInput = (str) => {
  if (!str) return '';
  // Remove all non-numeric characters except one decimal point
  let cleaned = str.toString().replace(/[^\d.]/g, '');
  // Keep only the first decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

// --- COMPONENT: Glitch-Free Input ---
const SmartInput = ({ label, value, onChange, unit, step = "0.01", useAccountingFormat = false }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (useAccountingFormat && !isFocused) {
      setLocalValue(formatNumber(value));
    } else if (!useAccountingFormat) {
      setLocalValue(value);
    }
    // When focused with accounting format, keep the current localValue (don't reformat)
  }, [value, useAccountingFormat, isFocused]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    setLocalValue(rawVal);
    // Allow free typing - don't interfere with user input
    // Store the raw value, we'll clean it on blur
    if (useAccountingFormat) {
      // Store the cleaned numeric value for calculations
      const cleaned = sanitizeNumericInput(rawVal);
      onChange(cleaned === '' ? 0 : parseFloat(cleaned) || 0);
    } else {
      onChange(rawVal);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (useAccountingFormat) {
      // Strip non-numeric characters (keep one decimal point)
      const sanitized = sanitizeNumericInput(localValue);
      if (sanitized === '' || sanitized === '.') {
        // If empty or just a decimal point, revert to formatted value
        setLocalValue(value ? formatNumber(value) : '');
        return;
      }
      // Convert to Float
      const numValue = parseFloat(sanitized);
      if (isNaN(numValue)) {
        // Invalid number, revert to formatted value
        setLocalValue(value ? formatNumber(value) : '');
        return;
      }
      // Re-format with toLocaleString
      const formatted = numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setLocalValue(formatted);
      // Update parent with numeric value
      onChange(numValue);
    } else {
      if (localValue === '' || isNaN(localValue)) {
        setLocalValue(value);
      } else {
        onChange(parseFloat(localValue));
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Do NOT remove commas - keep the formatted value visible while editing
  };

  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs text-gray-600 dark:text-gray-300 font-medium">{label}</label>
      <div className="relative">
        <input
          type={useAccountingFormat ? "text" : "number"}
          step={step}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          inputMode="decimal"
          className={`w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-8 text-sm font-mono text-right text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                     transition-all duration-200
                     ${isFocused 
                       ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                       : 'hover:border-gray-400 dark:hover:border-gray-500'
                     }
                     focus:outline-none`}
        />
        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

function App() {
  const [inputs, setInputs] = useState({
    hardCosts: 1000000,
    softCosts: 500000,
    production: 1000,
    annualRevenue: 10000000,
    annualOpex: 2000000,
    taxRate: 0.25,
    interestRate: 0.08,
    debtShare: 0.70,
    projectDuration: 25
  });

  const [debouncedInputs, setDebouncedInputs] = useState(inputs);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      const cleanInputs = {};
      Object.keys(inputs).forEach(key => {
        // Strip commas before parsing (safety net for accounting format fields)
        const cleaned = inputs[key]?.toString().replace(/,/g, '') || '0';
        cleanInputs[key] = parseFloat(cleaned) || 0;
      });
      setDebouncedInputs(cleanInputs);
    }, 800);

    return () => clearTimeout(handler);
  }, [inputs]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // CRITICAL: Strip commas from all values before sending to backend
      // This ensures accounting format fields (with commas) are converted to raw numbers
      const cleanValue = (val) => {
        if (val == null) return 0;
        const cleaned = val.toString().replace(/,/g, '');
        return parseFloat(cleaned) || 0;
      };

      const body = {
        // Accounting format fields - explicitly strip commas
        hard_costs: cleanValue(debouncedInputs.hardCosts),
        soft_costs: cleanValue(debouncedInputs.softCosts),
        annual_revenue: cleanValue(debouncedInputs.annualRevenue),
        annual_opex: cleanValue(debouncedInputs.annualOpex),
        // Other fields
        annual_production_mwh: cleanValue(debouncedInputs.production),
        tax_rate: cleanValue(debouncedInputs.taxRate),
        interest_rate: cleanValue(debouncedInputs.interestRate),
        debt_share: cleanValue(debouncedInputs.debtShare),
        project_duration_years: parseInt(cleanValue(debouncedInputs.projectDuration)) || 25
      };

      console.log('Sending payload:', body);

      const response = await fetch('https://project-finance-dashboard.onrender.com/calculate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  }, [debouncedInputs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateField = (field, val) => {
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Project Inputs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SmartInput 
                label="Hard Costs (₱)" 
                value={inputs.hardCosts} 
                onChange={v => updateField('hardCosts', v)} 
                unit="₱"
                useAccountingFormat={true}
              />
              <SmartInput 
                label="Soft Costs (₱)" 
                value={inputs.softCosts} 
                onChange={v => updateField('softCosts', v)} 
                unit="₱"
                useAccountingFormat={true}
              />
              <SmartInput 
                label="Production (MWh)" 
                value={inputs.production} 
                onChange={v => updateField('production', v)} 
                unit="MWh" 
              />
              <SmartInput 
                label="Revenue (₱)" 
                value={inputs.annualRevenue} 
                onChange={v => updateField('annualRevenue', v)} 
                unit="₱"
                useAccountingFormat={true}
              />
              <SmartInput 
                label="Opex (₱)" 
                value={inputs.annualOpex} 
                onChange={v => updateField('annualOpex', v)} 
                unit="₱"
                useAccountingFormat={true}
              />
              <SmartInput 
                label="Tax Rate (%)" 
                value={inputs.taxRate} 
                onChange={v => updateField('taxRate', v)} 
                unit="%" 
                step="0.0001" 
              />
              <SmartInput 
                label="Interest (%)" 
                value={inputs.interestRate} 
                onChange={v => updateField('interestRate', v)} 
                unit="%" 
                step="0.0001" 
              />
              <SmartInput 
                label="Debt Share (%)" 
                value={inputs.debtShare} 
                onChange={v => updateField('debtShare', v)} 
                unit="%" 
                step="0.0001" 
              />
              <SmartInput 
                label="Years" 
                value={inputs.projectDuration} 
                onChange={v => updateField('projectDuration', v)} 
                unit="years" 
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-8">
          <FinancialTable data={data} loading={loading} />
        </div>

      </div>
    </div>
  );
}

export default App;
