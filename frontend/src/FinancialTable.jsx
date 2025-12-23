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
    // When user leaves the field, clean it up
    if (localValue === '' || isNaN(localValue)) {
      setLocalValue(value); // Revert to last good value
    } else {
      onChange(parseFloat(localValue)); // Lock it in as a number
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <input
          type="number"
          step={step}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          inputMode="decimal" // 📱 Forces the right keyboard on Samsung
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 pr-8 
                     focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all
                     group-hover:border-slate-600 font-mono text-right"
        />
        <span className="absolute right-3 top-3 text-slate-500 text-sm font-bold pointer-events-none">{unit}</span>
      </div>
    </div>
  );
};

// --- COMPONENT: Sticky Stat Card ---
const StatCard = ({ label, value, color, isGood }) => (
  <div className={`flex flex-col p-2 sm:p-3 rounded-lg border ${isGood ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
    <span className="text-[10px] sm:text-xs text-slate-400 uppercase">{label}</span>
    <span className={`text-lg sm:text-xl font-bold ${color}`}>{value}</span>
  </div>
);

function FinancialTable() {
  // --- STATE ---
  // We store everything as STRINGS or NUMBERS, doesn't matter, backend handles conversion.
  const [inputs, setInputs] = useState({
    // Macro
    inflation_rate: 0.04,
    forex_rate: 58.0,
    forex_escalation: 0.02,
    // Tech
    capacity_mw: 50,
    capacity_factor: 0.85,
    degradation: 0.005,
    fuel_cost_per_liter: 0.90,
    fuel_efficiency: 3.8,
    // Finance
    tariff: 8.50,
    opex_per_kw: 15.0,
    capex_per_mw: 1000000,
    debt_share: 0.70,
    interest_rate: 0.08,
    loan_term: 10
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
      const response = await fetch('https://project-finance-dashboard.onrender.com/calculate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debouncedInputs)
      });
      const result = await response.json();
      if (result.annual_data) setData(result);
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

  const metrics = data?.summary_metrics || {};
  const irr = metrics.IRR != null ? (metrics.IRR * 100).toFixed(2) + "%" : "-";
  const dscr = metrics.Avg_DSCR != null ? metrics.Avg_DSCR.toFixed(2) + "x" : "-";
  const roi = metrics.ROI != null ? (metrics.ROI * 100).toFixed(2) + "%" : "-";
  const avgRoe = metrics.Avg_ROE != null ? (metrics.Avg_ROE * 100).toFixed(2) + "%" : "-";
  
  // Logic: Green if IRR > 12% and DSCR > 1.15
  const isProfitable = metrics.IRR > 0.12; 
  const isBankable = metrics.Avg_DSCR > 1.15;
  const isGoodROI = metrics.ROI > 0.15; // 15% ROI threshold
  const isGoodROE = metrics.Avg_ROE > 0.12; // 12% ROE threshold

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-sans">
      
      {/* 1. STICKY HEADER (Glassmorphism) */}
      <div className="flex-none bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-3 z-50 sticky top-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h1 className="text-sm font-bold text-slate-300 hidden sm:block">InfraModeler</h1>
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto justify-end">
            <StatCard label="IRR" value={irr} color={isProfitable ? "text-emerald-400" : "text-rose-400"} isGood={isProfitable} />
            <StatCard label="Avg DSCR" value={dscr} color={isBankable ? "text-emerald-400" : "text-amber-400"} isGood={isBankable} />
            <StatCard label="ROI" value={roi} color={isGoodROI ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROI} />
            <StatCard label="Avg ROE" value={avgRoe} color={isGoodROE ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROE} />
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: INPUTS */}
          <div className="lg:col-span-1 space-y-5">
            
            {/* Macro Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">🌍</span>
                <h3 className="font-bold text-slate-200">Macro Economics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Forex" value={inputs.forex_rate} onChange={v => updateField('forex_rate', v)} unit="PHP" />
                <SmartInput label="Inflation" value={inputs.inflation_rate} onChange={v => updateField('inflation_rate', v)} unit="%" step="0.001" />
              </div>
            </div>

            {/* Tech Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                 <span className="p-2 bg-purple-500/10 rounded-lg text-purple-400">⚡</span>
                <h3 className="font-bold text-slate-200">Technical Specs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Capacity" value={inputs.capacity_mw} onChange={v => updateField('capacity_mw', v)} unit="MW" />
                <SmartInput label="Tariff" value={inputs.tariff} onChange={v => updateField('tariff', v)} unit="₱" />
                <SmartInput label="Fuel Cost" value={inputs.fuel_cost_per_liter} onChange={v => updateField('fuel_cost_per_liter', v)} unit="$" />
                <SmartInput label="Efficiency" value={inputs.fuel_efficiency} onChange={v => updateField('fuel_efficiency', v)} unit="kWh/L" />
              </div>
            </div>

            {/* Finance Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                 <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">🏦</span>
                <h3 className="font-bold text-slate-200">Financing Structure</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Debt %" value={inputs.debt_share} onChange={v => updateField('debt_share', v)} unit="%" />
                <SmartInput label="Interest" value={inputs.interest_rate} onChange={v => updateField('interest_rate', v)} unit="%" />
              </div>
            </div>

          </div>

          {/* RIGHT: CHART */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl h-[450px] relative flex flex-col">
              <h3 className="text-slate-400 font-bold mb-6 text-sm uppercase tracking-widest">Cash Flow Analysis</h3>
              
              {loading && (
                 <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                   <div className="flex flex-col items-center gap-3">
                     <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                     <span className="text-xs text-blue-400 font-mono animate-pulse">COMPUTING...</span>
                   </div>
                 </div>
              )}

              <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.annual_data}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="Year" stroke="#64748b" tick={{fontSize: 12}} />
                    <YAxis yAxisId="left" stroke="#64748b" tick={{fontSize: 12}} tickFormatter={(val) => `${(val/1e6).toFixed(0)}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                      itemStyle={{ color: '#fff', fontSize: '13px' }}
                      formatter={(val, name) => {
                        if (name === "Net Profit" || name === "Revenue" || name === "Cash Flow") {
                          return [`₱${Number(val).toLocaleString()}`, name];
                        }
                        return [`₱${Number(val).toLocaleString()}`, name];
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="Revenue" fill="url(#colorRev)" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar yAxisId="left" dataKey="Net_Profit" fill="#f97316" name="Net Profit" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="left" type="monotone" dataKey="Free_Cash_Flow" stroke="#10b981" strokeWidth={3} dot={{r: 0}} activeDot={{r: 6, fill: '#10b981'}} name="Cash Flow" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default FinancialTable;
