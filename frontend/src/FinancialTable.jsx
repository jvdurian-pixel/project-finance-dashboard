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
const StatCard = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
    <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">{label}</span>
    <span className={`text-lg font-bold ${color}`}>{value}</span>
  </div>
);

function FinancialTable({ data, loading }) {
  // Handle empty state
  if (!data && !loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">Enter project inputs to see financial metrics</p>
      </div>
    );
  }

  // Format values with proper handling
  const lcoe = data?.LCOE != null ? `${formatMoney(data.LCOE)}/MWh` : '-';
  const roi = data?.ROI != null ? `${data.ROI.toFixed(2)}%` : '-';
  const roe = data?.ROE != null ? `${data.ROE.toFixed(2)}%` : '-';
  const totalCapex = data?.total_capex != null ? formatMoney(data.total_capex) : '-';
  const netProfit = data?.annual_net_profit != null ? formatMoney(data.annual_net_profit) : '-';

  // Color logic
  const isGoodROI = data?.ROI > 15;
  const isGoodROE = data?.ROE > 12;
  const isGoodLCOE = data?.LCOE != null && data.LCOE < 5000;

  // Prepare chart data (simple annual view)
  const chartData = data ? [
    {
      name: 'Revenue',
      value: data.annual_revenue || 0
    },
    {
      name: 'Net Profit',
      value: data.annual_net_profit || 0
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="LCOE" 
          value={lcoe} 
          color={isGoodLCOE ? "text-green-600" : "text-amber-600"} 
        />
        <StatCard 
          label="ROI" 
          value={roi} 
          color={isGoodROI ? "text-green-600" : "text-amber-600"} 
        />
        <StatCard 
          label="Capex" 
          value={totalCapex} 
        />
        <StatCard 
          label="Net Profit" 
          value={netProfit} 
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Computing...</p>
            </div>
          </div>
        ) : data ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize: 12}} />
              <YAxis 
                stroke="#6b7280" 
                tick={{fontSize: 12}}
                tickFormatter={(val) => `₱${(val/1e6).toFixed(1)}M`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(val) => formatMoney(val)}
              />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-gray-400">
            <p>No data available</p>
          </div>
        )}
      </div>

      {/* Results Table */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Total Capex</td>
                  <td className="py-3 px-4 text-right font-mono">{totalCapex}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Annual Revenue</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(data.annual_revenue)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Annual Opex</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(data.annual_opex)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Annual Interest</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(data.annual_interest)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Annual Tax</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(data.annual_tax)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Annual Net Profit</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{netProfit}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">ROI</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{roi}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">ROE</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{roe}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-600">LCOE</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{lcoe}</td>
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
