import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, ComposedChart
} from 'recharts';

// --- COMPONENT: Glitch-Free Input ---
// This component keeps a local "buffer" so your decimal points don't disappear while typing.
const SmartInput = ({ label, value, onChange, unit, step = "0.01" }) => {
  // We use a local state to hold EXACTLY what the user types (even "10.")
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value if the parent changes it externally (e.g. loading a preset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    setLocalValue(rawVal); // Update the UI immediately so it feels fast
    
    // Only tell the parent if it's a valid number or empty
    // We don't parseFloat here to avoid losing the trailing "."
    onChange(rawVal);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // When user leaves the field, clean it up
    if (localValue === '' || isNaN(localValue)) {
      setLocalValue(value); // Revert to last good value
    } else {
      onChange(parseFloat(localValue)); // Lock it in as a number
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="flex flex-col space-y-1.5 group">
      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider transition-colors group-hover:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          inputMode="decimal"
          className={`w-full bg-slate-800/50 backdrop-blur-sm text-white border rounded-xl p-3 pr-10
                     transition-all duration-200 ease-in-out font-mono text-right text-sm
                     ${isFocused 
                       ? 'border-blue-500/50 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10 bg-slate-800' 
                       : 'border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                     }
                     focus:outline-none placeholder:text-slate-600`}
        />
        {unit && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none transition-colors ${
            isFocused ? 'text-blue-400' : ''
          }`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT: Sticky Stat Card ---
const StatCard = ({ label, value, color, isGood }) => (
  <div className={`flex flex-col p-3 sm:p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg
    ${isGood 
      ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/40 hover:border-emerald-400/60 hover:shadow-emerald-500/20' 
      : 'bg-gradient-to-br from-rose-900/30 to-rose-800/20 border-rose-500/40 hover:border-rose-400/60 hover:shadow-rose-500/20'
    }`}>
    <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">{label}</span>
    <span className={`text-base sm:text-lg font-bold ${color} transition-all duration-200`}>{value}</span>
  </div>
);

// --- UTILITY: Format Money (PHP) ---
const formatMoney = (value) => {
  if (value == null || isNaN(value)) return "₱0.00";
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

function FinancialTable() {
  // --- STATE ---
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

  // --- DEBOUNCE LOGIC ---
  // Wait 800ms after typing stops before calculating.
  // This prevents the "stutter" on your phone.
  useEffect(() => {
    const handler = setTimeout(() => {
      // Convert all inputs to actual numbers before sending to "The Brain"
      const cleanInputs = {};
      Object.keys(inputs).forEach(key => {
        cleanInputs[key] = parseFloat(inputs[key]) || 0;
      });
      setDebouncedInputs(cleanInputs);
    }, 800); 

    return () => clearTimeout(handler);
  }, [inputs]);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Map state explicitly to Python keys
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
      
      // Console debug
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

  const roi = data?.ROI != null ? data.ROI.toFixed(2) + "%" : "-";
  const roe = data?.ROE != null ? data.ROE.toFixed(2) + "%" : "-";
  const lcoe = data?.LCOE != null ? formatMoney(data.LCOE) + "/MWh" : "-";
  const totalCapex = data?.total_capex != null ? formatMoney(data.total_capex) : "-";
  const netProfit = data?.annual_net_profit != null ? formatMoney(data.annual_net_profit) : "-";
  
  // Logic: Green if ROI > 15% and ROE > 12%
  const isGoodROI = data?.ROI > 15; // 15% ROI threshold
  const isGoodROE = data?.ROE > 12; // 12% ROE threshold
  const isGoodLCOE = data?.LCOE != null && data.LCOE < 5000; // Good if under ₱5000/MWh

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden font-sans">
      
      {/* 1. STICKY HEADER (Glassmorphism) */}
      <div className="flex-none bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 shadow-lg shadow-black/20 p-4 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-blue-500 animate-ping opacity-75"></div>
            </div>
            <h1 className="text-base font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent hidden sm:block">
              InfraModeler
            </h1>
          </div>
          
          <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto justify-end overflow-x-auto scrollbar-hide">
            <StatCard label="ROI" value={roi} color={isGoodROI ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROI} />
            <StatCard label="ROE" value={roe} color={isGoodROE ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROE} />
            <StatCard label="LCOE (₱/MWh)" value={lcoe} color={isGoodLCOE ? "text-emerald-400" : "text-amber-400"} isGood={isGoodLCOE} />
            <StatCard label="Total Capex" value={totalCapex} color="text-slate-300" isGood={false} />
            <StatCard label="Net Profit" value={netProfit} color="text-slate-300" isGood={false} />
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-32 scrollbar-thin">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: INPUTS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Project Inputs Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:border-slate-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/30">
                  <span className="text-xl">📊</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">Project Inputs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Hard Costs (₱)" value={inputs.hardCosts} onChange={v => updateField('hardCosts', v)} unit="₱" />
                <SmartInput label="Soft Costs (₱)" value={inputs.softCosts} onChange={v => updateField('softCosts', v)} unit="₱" />
                <SmartInput label="Production (MWh)" value={inputs.production} onChange={v => updateField('production', v)} unit="MWh" />
                <SmartInput label="Annual Revenue (₱)" value={inputs.annualRevenue} onChange={v => updateField('annualRevenue', v)} unit="₱" />
                <SmartInput label="Annual Opex (₱)" value={inputs.annualOpex} onChange={v => updateField('annualOpex', v)} unit="₱" />
                <SmartInput label="Tax Rate" value={inputs.taxRate} onChange={v => updateField('taxRate', v)} unit="%" step="0.001" />
                <SmartInput label="Interest Rate" value={inputs.interestRate} onChange={v => updateField('interestRate', v)} unit="%" step="0.001" />
                <SmartInput label="Debt Share" value={inputs.debtShare} onChange={v => updateField('debtShare', v)} unit="" step="0.01" />
                <SmartInput label="Project Duration" value={inputs.projectDuration} onChange={v => updateField('projectDuration', v)} unit="years" />
              </div>
            </div>

          </div>

          {/* RIGHT: CHART */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-2xl h-[500px] sm:h-[600px] relative flex flex-col hover:border-slate-600/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-300 font-bold text-sm uppercase tracking-widest">Cash Flow Analysis</h3>
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent"></div>
                    <span className="font-mono">Computing...</span>
                  </div>
                )}
              </div>
              
              {loading && (
                 <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-10 rounded-2xl">
                   <div className="flex flex-col items-center gap-4">
                     <div className="relative">
                       <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500"></div>
                       <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-400/50" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                     </div>
                     <span className="text-sm text-blue-400 font-mono animate-pulse">COMPUTING...</span>
                   </div>
                 </div>
              )}

              <div className="flex-grow flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <p className="text-lg mb-2">Financial Metrics</p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Total Capex</p>
                      <p className="text-xl font-bold">{totalCapex}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Annual Net Profit</p>
                      <p className="text-xl font-bold">{netProfit}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default FinancialTable;
