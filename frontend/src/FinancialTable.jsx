import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- UTILITY: Format Money (PHP) ---
const formatMoney = (val) => {
  if (val == null || isNaN(val) || val === 0) return '₱0.00';
  return Number(val).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// --- COMPONENT: Stat Card ---
const StatCard = ({ label, value, color = "text-gray-900 dark:text-white" }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold block mb-1">{label}</span>
    <span className={`text-lg font-bold ${color}`}>{value}</span>
  </div>
);

function FinancialTable({ data, loading }) {
  // Handle empty state
  if (!data && !loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Enter project inputs to see financial metrics</p>
      </div>
    );
  }

  // Format values with proper handling
  const lcoe = data?.LCOE_kwh != null ? `₱${data.LCOE_kwh.toFixed(2)}/kWh` : '-';
  const roi = data?.ROI_years != null ? (data.ROI_years >= 999 ? 'N/A' : `${data.ROI_years.toFixed(2)} Years`) : '-';
  const roe = data?.ROE_years != null ? (data.ROE_years >= 999 ? 'N/A' : `${data.ROE_years.toFixed(2)} Years`) : '-';
  const totalCapex = data?.total_capex != null ? formatMoney(data.total_capex) : '-';
  const netProfit = data?.annual_net_profit != null ? formatMoney(data.annual_net_profit) : '-';

  // Color logic
  const isGoodROI = data?.ROI_years != null && data.ROI_years < 999 && data.ROI_years < 10; // Good if payback < 10 years
  const isGoodROE = data?.ROE_years != null && data.ROE_years < 999 && data.ROE_years < 8; // Good if equity payback < 8 years
  const isGoodLCOE = data?.LCOE_kwh != null && data.LCOE_kwh < 5.0; // Good if LCOE < ₱5/kWh

  // Prepare chart data (simple annual view)
  const chartData = data ? [
    {
      name: 'Annual',
      Revenue: data.annual_revenue || 0,
      'Net Profit': data.annual_net_profit || 0
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="LCOE (₱/kWh)" 
          value={lcoe} 
          color={isGoodLCOE ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"} 
        />
        <StatCard 
          label="Project Payback" 
          value={roi} 
          color={isGoodROI ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"} 
        />
        <StatCard 
          label="Equity Payback" 
          value={roe} 
          color={isGoodROE ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"} 
        />
        <StatCard 
          label="Net Profit" 
          value={netProfit} 
        />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Overview</h3>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Computing...</p>
            </div>
          </div>
        ) : data ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400" tick={{fontSize: 12, fill: '#6b7280'}} />
              <YAxis 
                stroke="#6b7280" 
                className="dark:stroke-gray-400"
                tick={{fontSize: 12, fill: '#6b7280'}}
                tickFormatter={(val) => `₱${(val/1e6).toFixed(1)}M`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  color: '#fff'
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#d1d5db' }}
                formatter={(val) => formatMoney(val)}
              />
              <Legend wrapperStyle={{ color: '#6b7280' }} />
              <Bar dataKey="Revenue" fill="#34d399" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net Profit" fill="#818cf8" name="Net Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-400 dark:text-gray-500">
            <p>No data available</p>
          </div>
        )}
      </div>

      {/* Results Table */}
      {data && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">Metric</th>
                  <th className="text-right py-3 px-4 font-semibold bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Total Capex</td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">{totalCapex}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Annual Revenue</td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">{formatMoney(data.annual_revenue)}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Annual Opex</td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">{formatMoney(data.annual_opex)}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Annual Interest</td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">{formatMoney(data.annual_interest)}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Annual Tax</td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900 dark:text-white">{formatMoney(data.annual_tax)}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Annual Net Profit</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">{netProfit}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Project Payback</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">{roi}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">Equity Payback</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">{roe}</td>
                </tr>
                <tr className="bg-white dark:bg-gray-800">
                  <td className="py-3 px-4 text-gray-600 dark:text-white">LCOE (₱/kWh)</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">{lcoe}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialTable;
