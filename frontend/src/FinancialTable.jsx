import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

function FinancialTable() {
  const [data, setData] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState({});
  const [inputs, setInputs] = useState({
    // Macro
    forex_rate: 58.0,
    forex_escalation: 0.02,
    local_inflation: 0.04,
    // Revenue
    tariff_php: 8.50,
    generation_kwh: 1000000,
    degradation_rate: 0.005,
    // Capex
    capex_usd: 1500000,
    capex_forex_exposure: 0.70,
    // Opex
    fuel_cost_usd_liter: 0.90,
    fuel_efficiency: 3.8,
    variable_opex_php: 1.50,
    // Debt
    debt_ratio: 0.70,
    interest_rate: 0.08,
    tenor_years: 15,
    // Tax
    tax_rate: 0.25
  });

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    macro: true,
    tech: true,
    finance: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch data from Python
  const fetchData = async () => {
    try {
      const response = await fetch('http://project-finance-dashboard.onrender.com/calculate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const result = await response.json();
      if (result.annual_data) {
        setData(result.annual_data);
      }
      if (result.summary_metrics) {
        setSummaryMetrics(result.summary_metrics);
      }
    } catch (error) {
      console.error("Error fetching:", error);
    }
  };

  // Fetch automatically on load and when inputs change
  useEffect(() => {
    fetchData();
  }, [
    inputs.forex_rate, inputs.forex_escalation, inputs.local_inflation,
    inputs.tariff_php, inputs.generation_kwh, inputs.degradation_rate,
    inputs.capex_usd, inputs.capex_forex_exposure,
    inputs.fuel_cost_usd_liter, inputs.fuel_efficiency, inputs.variable_opex_php,
    inputs.debt_ratio, inputs.interest_rate, inputs.tenor_years,
    inputs.tax_rate
  ]);

  // CSV Export Function
  const downloadCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_model.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate Min DSCR from annual data
  const minDSCR = data.length > 0 
    ? Math.min(...data.map(row => row.DSCR).filter(dscr => dscr < 100))
    : 0;

  // Professional dark color palette
  const colors = {
    background: '#0f172a',
    card: '#1e293b',
    cardBorder: '#334155',
    text: '#f1f5f9',
    textMuted: '#cbd5e1',
    accent: '#10b981',
    accentDark: '#059669',
    revenue: '#3b82f6',
    fcf: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    header: '#1e293b',
    rowEven: '#1e293b',
    rowOdd: '#0f172a'
  };

  const InputField = ({ label, name, type = 'number', step }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: '500',
        color: colors.textMuted
      }}>
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={inputs[name]}
        onChange={(e) => setInputs({...inputs, [name]: type === 'number' ? Number(e.target.value) : e.target.value})}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: colors.background,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '6px',
          color: colors.text,
          fontSize: '14px',
          outline: 'none'
        }}
      />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '20px',
        borderBottom: `2px solid ${colors.cardBorder}`
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: '700',
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <TrendingUp size={32} color={colors.accent} />
          Infrastructure Financial Modeler
        </h1>
        <button
          onClick={downloadCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: colors.accent,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = colors.accentDark}
          onMouseLeave={(e) => e.target.style.backgroundColor = colors.accent}
        >
          <Download size={18} />
          Download CSV
        </button>
      </div>

      {/* Main Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Inputs */}
        <div style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          gridColumn: 'span 1'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Model Inputs</h2>
          
          {/* Macro Section */}
          <div style={{ marginBottom: '16px', borderBottom: `1px solid ${colors.cardBorder}`, paddingBottom: '12px' }}>
            <button
              onClick={() => toggleSection('macro')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: colors.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              <span>Macro (Forex/Inflation)</span>
              {expandedSections.macro ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expandedSections.macro && (
              <div style={{ marginTop: '12px' }}>
                <InputField label="Forex Rate (PHP/USD)" name="forex_rate" step="0.1" />
                <InputField label="Forex Escalation" name="forex_escalation" step="0.001" />
                <InputField label="Local Inflation" name="local_inflation" step="0.001" />
              </div>
            )}
          </div>

          {/* Tech Section */}
          <div style={{ marginBottom: '16px', borderBottom: `1px solid ${colors.cardBorder}`, paddingBottom: '12px' }}>
            <button
              onClick={() => toggleSection('tech')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: colors.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              <span>Tech (Gen/Fuel)</span>
              {expandedSections.tech ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expandedSections.tech && (
              <div style={{ marginTop: '12px' }}>
                <InputField label="Tariff (PHP/kWh)" name="tariff_php" step="0.01" />
                <InputField label="Generation (kWh)" name="generation_kwh" step="1000" />
                <InputField label="Degradation Rate" name="degradation_rate" step="0.001" />
                <InputField label="Fuel Cost (USD/Liter)" name="fuel_cost_usd_liter" step="0.01" />
                <InputField label="Fuel Efficiency" name="fuel_efficiency" step="0.1" />
                <InputField label="Variable OPEX (PHP/kWh)" name="variable_opex_php" step="0.01" />
              </div>
            )}
          </div>

          {/* Finance Section */}
          <div>
            <button
              onClick={() => toggleSection('finance')}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: colors.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              <span>Finance (Debt/Capex)</span>
              {expandedSections.finance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expandedSections.finance && (
              <div style={{ marginTop: '12px' }}>
                <InputField label="CAPEX (USD)" name="capex_usd" step="10000" />
                <InputField label="CAPEX Forex Exposure" name="capex_forex_exposure" step="0.01" />
                <InputField label="Debt Ratio" name="debt_ratio" step="0.01" />
                <InputField label="Interest Rate" name="interest_rate" step="0.001" />
                <InputField label="Tenor (Years)" name="tenor_years" step="1" />
                <InputField label="Tax Rate" name="tax_rate" step="0.01" />
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Chart */}
        <div style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          gridColumn: 'span 2'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Revenue & Cash Flow</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.cardBorder} />
              <XAxis dataKey="Year" stroke={colors.textMuted} style={{ fontSize: '12px' }} />
              <YAxis 
                stroke={colors.textMuted}
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: '8px',
                  color: colors.text
                }}
                formatter={(value) => `₱${Math.round(value).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ color: colors.text }} />
              <Bar dataKey="Revenue" fill={colors.revenue} name="Revenue" />
              <Line 
                type="monotone" 
                dataKey="Free_Cash_Flow" 
                stroke={colors.fcf} 
                strokeWidth={2}
                dot={false}
                name="Free Cash Flow"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Card 3: KPIs */}
        <div style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          gridColumn: 'span 1'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Key Metrics</h2>
          
          {/* NPV */}
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.cardBorder}` }}>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>NPV</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.accent }}>
              ₱{summaryMetrics.NPV ? (summaryMetrics.NPV / 1000000).toFixed(2) : '0.00'}M
            </div>
          </div>

          {/* IRR with risk alert */}
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.cardBorder}` }}>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              IRR
              {summaryMetrics.IRR && summaryMetrics.IRR < 0.10 && (
                <AlertTriangle size={14} color={colors.warning} />
              )}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: summaryMetrics.IRR && summaryMetrics.IRR < 0.10 ? colors.warning : colors.accent
            }}>
              {summaryMetrics.IRR ? (summaryMetrics.IRR * 100).toFixed(2) : '0.00'}%
            </div>
          </div>

          {/* Min DSCR with risk alert */}
          <div>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Min DSCR
              {minDSCR < 1.20 && minDSCR > 0 && (
                <AlertTriangle size={14} color={colors.danger} />
              )}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: minDSCR < 1.20 && minDSCR > 0 ? colors.danger : colors.accent
            }}>
              {minDSCR > 0 ? minDSCR.toFixed(2) : '0.00'}x
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Table - Full Width */}
      <div style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        overflowX: 'auto',
        gridColumn: '1 / -1'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>
          Annual Data ({data.length} Years)
        </h2>
        {data.length > 0 ? (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ backgroundColor: colors.header }}>
                {Object.keys(data[0]).map((key) => (
                  <th key={key} style={{
                    padding: '10px',
                    textAlign: key === 'Year' ? 'left' : 'right',
                    fontWeight: '600',
                    color: colors.text,
                    borderBottom: `2px solid ${colors.cardBorder}`
                  }}>
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? colors.rowEven : colors.rowOdd
                  }}
                >
                  {Object.keys(row).map((key) => (
                    <td
                      key={key}
                      style={{
                        padding: '10px',
                        textAlign: key === 'Year' ? 'left' : 'right',
                        color: key === 'DSCR' && row[key] < 1.20 && row[key] < 100 ? colors.danger : colors.text,
                        fontWeight: key === 'DSCR' && row[key] < 1.20 && row[key] < 100 ? '600' : 'normal',
                        borderBottom: `1px solid ${colors.cardBorder}`
                      }}
                    >
                      {typeof row[key] === 'number' && key !== 'Year' && key !== 'DSCR'
                        ? `₱${Math.round(row[key]).toLocaleString()}`
                        : typeof row[key] === 'number' && key === 'DSCR'
                        ? `${row[key].toFixed(2)}x`
                        : row[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>
            Loading data...
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancialTable;

