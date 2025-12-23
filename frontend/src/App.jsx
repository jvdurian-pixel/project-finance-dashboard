import React, { useState, useEffect, useCallback } from 'react';
import FinancialTable from './FinancialTable';
import './App.css';

// --- COMPONENT: Glitch-Free Input ---
const SmartInput = ({ label, value, onChange, unit, step = "0.01" }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    setLocalValue(rawVal);
    onChange(rawVal);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue === '' || isNaN(localValue)) {
      setLocalValue(value);
    } else {
      onChange(parseFloat(localValue));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-xs text-gray-600 dark:text-gray-300 font-medium">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          inputMode="decimal"
          className={`w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-8 text-sm text-right text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
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
        cleanInputs[key] = parseFloat(inputs[key]) || 0;
      });
      setDebouncedInputs(cleanInputs);
    }, 800);

    return () => clearTimeout(handler);
  }, [inputs]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const body = {
        hard_costs: parseFloat(debouncedInputs.hardCosts) || 0,
        soft_costs: parseFloat(debouncedInputs.softCosts) || 0,
        annual_production_mwh: parseFloat(debouncedInputs.production) || 0,
        annual_revenue: parseFloat(debouncedInputs.annualRevenue) || 0,
        annual_opex: parseFloat(debouncedInputs.annualOpex) || 0,
        tax_rate: parseFloat(debouncedInputs.taxRate) || 0,
        interest_rate: parseFloat(debouncedInputs.interestRate) || 0,
        debt_share: parseFloat(debouncedInputs.debtShare) || 0,
        project_duration_years: parseInt(debouncedInputs.projectDuration) || 25
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
              />
              <SmartInput 
                label="Soft Costs (₱)" 
                value={inputs.softCosts} 
                onChange={v => updateField('softCosts', v)} 
                unit="₱" 
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
              />
              <SmartInput 
                label="Opex (₱)" 
                value={inputs.annualOpex} 
                onChange={v => updateField('annualOpex', v)} 
                unit="₱" 
              />
              <SmartInput 
                label="Tax Rate (%)" 
                value={inputs.taxRate} 
                onChange={v => updateField('taxRate', v)} 
                unit="%" 
                step="0.001" 
              />
              <SmartInput 
                label="Interest (%)" 
                value={inputs.interestRate} 
                onChange={v => updateField('interestRate', v)} 
                unit="%" 
                step="0.001" 
              />
              <SmartInput 
                label="Debt Share (%)" 
                value={inputs.debtShare} 
                onChange={v => updateField('debtShare', v)} 
                unit="%" 
                step="0.01" 
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
