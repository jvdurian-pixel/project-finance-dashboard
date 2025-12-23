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
      // Map frontend field names to backend field names
      const capacityFactor = debouncedInputs.capacity_factor || 0.85;
      const capacityMW = debouncedInputs.capacity_mw || 50;
      const capacityKW = capacityMW * 1000;
      // Generation = Capacity (MW) * Capacity Factor * Hours per year * 1000 (kW/MW)
      const generationKWh = capacityMW * capacityFactor * 8760 * 1000;
      
      // Convert opex_per_kw (per kW capacity per year) to variable_opex_php (per kWh)
      // If opex_per_kw is annual opex per kW of capacity, convert to per kWh:
      const opexPerKW = debouncedInputs.opex_per_kw || 15.0;
      const variableOpexPHP = generationKWh > 0 ? (opexPerKW * capacityKW) / generationKWh : 0;
      
      const backendInputs = {
        // Macro
        forex_rate: debouncedInputs.forex_rate || 58.0,
        forex_escalation: debouncedInputs.forex_escalation || 0.02,
        local_inflation: debouncedInputs.inflation_rate || 0.04,
        
        // Revenue
        tariff_php: debouncedInputs.tariff || 8.50,
        generation_kwh: generationKWh,
        degradation_rate: debouncedInputs.degradation || 0.005,
        
        // Capex
        capex_usd: (debouncedInputs.capex_per_mw || 1000000) * capacityMW / (debouncedInputs.forex_rate || 58.0),
        capex_forex_exposure: 0.70, // Default value
        
        // Opex
        fuel_cost_usd_liter: debouncedInputs.fuel_cost_per_liter || 0.90,
        fuel_efficiency: debouncedInputs.fuel_efficiency || 3.8,
        variable_opex_php: variableOpexPHP,
        
        // Debt
        debt_ratio: debouncedInputs.debt_share || 0.70,
        interest_rate: debouncedInputs.interest_rate || 0.08,
        tenor_years: debouncedInputs.loan_term || 10,
        
        // Tax
        tax_rate: 0.25 // Default value
      };
      
      const response = await fetch('https://project-finance-dashboard.onrender.com/calculate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendInputs)
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
  const roi = metrics.ROI != null ? metrics.ROI.toFixed(2) + "%" : "-";
  const avgRoe = metrics.Avg_ROE != null ? metrics.Avg_ROE.toFixed(2) + "%" : "-";
  
  // Logic: Green if IRR > 12% and DSCR > 1.15
  const isProfitable = metrics.IRR > 0.12; 
  const isBankable = metrics.Avg_DSCR > 1.15;
  const isGoodROI = metrics.ROI > 0.15; // 15% ROI threshold
  const isGoodROE = metrics.Avg_ROE > 0.12; // 12% ROE threshold

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
            <StatCard label="IRR" value={irr} color={isProfitable ? "text-emerald-400" : "text-rose-400"} isGood={isProfitable} />
            <StatCard label="Avg DSCR" value={dscr} color={isBankable ? "text-emerald-400" : "text-amber-400"} isGood={isBankable} />
            <StatCard label="ROI" value={roi} color={isGoodROI ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROI} />
            <StatCard label="Avg ROE" value={avgRoe} color={isGoodROE ? "text-emerald-400" : "text-amber-400"} isGood={isGoodROE} />
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-32 scrollbar-thin">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: INPUTS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Macro Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:border-slate-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/30">
                  <span className="text-xl">🌍</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">Macro Economics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Forex" value={inputs.forex_rate} onChange={v => updateField('forex_rate', v)} unit="PHP" />
                <SmartInput label="Inflation" value={inputs.inflation_rate} onChange={v => updateField('inflation_rate', v)} unit="%" step="0.001" />
                <SmartInput label="Forex Escalation" value={inputs.forex_escalation} onChange={v => updateField('forex_escalation', v)} unit="%" step="0.001" />
              </div>
            </div>

            {/* Tech Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:border-slate-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl border border-purple-500/30">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">Technical Specs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Capacity" value={inputs.capacity_mw} onChange={v => updateField('capacity_mw', v)} unit="MW" />
                <SmartInput label="Capacity Factor" value={inputs.capacity_factor} onChange={v => updateField('capacity_factor', v)} unit="" step="0.01" />
                <SmartInput label="Tariff" value={inputs.tariff} onChange={v => updateField('tariff', v)} unit="₱" />
                <SmartInput label="Degradation" value={inputs.degradation} onChange={v => updateField('degradation', v)} unit="%" step="0.001" />
                <SmartInput label="Fuel Cost" value={inputs.fuel_cost_per_liter} onChange={v => updateField('fuel_cost_per_liter', v)} unit="$" />
                <SmartInput label="Efficiency" value={inputs.fuel_efficiency} onChange={v => updateField('fuel_efficiency', v)} unit="kWh/L" />
                <SmartInput label="Opex per kW" value={inputs.opex_per_kw} onChange={v => updateField('opex_per_kw', v)} unit="₱" />
                <SmartInput label="Capex per MW" value={inputs.capex_per_mw} onChange={v => updateField('capex_per_mw', v)} unit="₱" />
              </div>
            </div>

            {/* Finance Card */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:border-slate-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl border border-emerald-500/30">
                  <span className="text-xl">🏦</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">Financing Structure</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SmartInput label="Debt %" value={inputs.debt_share} onChange={v => updateField('debt_share', v)} unit="%" />
                <SmartInput label="Interest" value={inputs.interest_rate} onChange={v => updateField('interest_rate', v)} unit="%" />
                <SmartInput label="Loan Term" value={inputs.loan_term} onChange={v => updateField('loan_term', v)} unit="years" />
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

              <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.annual_data}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                    <XAxis 
                      dataKey="Year" 
                      stroke="#64748b" 
                      tick={{fontSize: 11, fill: '#94a3b8'}} 
                      axisLine={{stroke: '#475569'}}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#64748b" 
                      tick={{fontSize: 11, fill: '#94a3b8'}} 
                      axisLine={{stroke: '#475569'}}
                      tickFormatter={(val) => `₱${(val/1e6).toFixed(0)}M`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155', 
                        borderRadius: '12px', 
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                        padding: '12px'
                      }} 
                      itemStyle={{ color: '#fff', fontSize: '13px', padding: '4px 0' }}
                      formatter={(val, name) => {
                        const formatted = `₱${Number(val).toLocaleString('en-US', {maximumFractionDigits: 0})}`;
                        return [formatted, name];
                      }}
                      labelStyle={{ color: '#cbd5e1', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}
                      cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }} 
                      iconType="line"
                      formatter={(value) => <span style={{color: '#cbd5e1', fontSize: '12px'}}>{value}</span>}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="Revenue" 
                      fill="url(#colorRev)" 
                      name="Revenue" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={60}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="Net_Profit" 
                      fill="url(#colorProfit)" 
                      name="Net Profit" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={60}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="Free_Cash_Flow" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{r: 0}} 
                      activeDot={{r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} 
                      name="Cash Flow"
                    />
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
