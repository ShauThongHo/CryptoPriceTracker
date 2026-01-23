import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { usePortfolioHistory } from '../hooks/usePortfolioHistory';

type TimeRange = '24h' | '7d' | '30d';

interface PortfolioChartProps {
  walletId?: number; // Optional: filter by specific wallet
}

export default function PortfolioChart({ walletId }: PortfolioChartProps) {
  const [activeRange, setActiveRange] = useState<TimeRange>('24h');
  const { history, count, isLoading } = usePortfolioHistory(activeRange);

  // Format data for recharts
  const chartData = history.map((snapshot) => {
    let value = snapshot.totalValue;
    
    // If filtering by wallet, extract wallet-specific value
    if (walletId) {
      try {
        const data = JSON.parse(snapshot.snapshotData);
        value = data.wallets[walletId] || 0;
      } catch {
        value = 0;
      }
    }
    
    return {
      timestamp: new Date(snapshot.timestamp).getTime(),
      value,
      label: formatTimestamp(snapshot.timestamp, activeRange),
    };
  });

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
  ];

  // Empty state: not enough data
  if (count < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Portfolio History
          </h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Info className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4 opacity-50" />
          <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
            Building Your Chart
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            Your portfolio history chart will appear here as you use the app. 
            We'll automatically capture snapshots every time prices are updated.
          </p>
          {count > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {count} snapshot{count !== 1 ? 's' : ''} recorded so far
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {walletId ? 'Wallet History' : 'Portfolio History'}
          </h3>
        </div>
        
        {/* Range selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {ranges.map((range) => (
            <button
              key={range.key}
              onClick={() => setActiveRange(range.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeRange === range.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400 dark:text-gray-500">Loading chart...</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${formatNumber(value)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#F3F4F6' }}
              itemStyle={{ color: '#60A5FA' }}
              formatter={(value: number | undefined) => [`$${(value || 0).toFixed(2)}`, 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="rgb(37, 99, 235)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {chartData.length} data point{chartData.length !== 1 ? 's' : ''} in this range
        </p>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date, range: TimeRange): string {
  const d = new Date(date);
  
  if (range === '24h') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (range === '7d') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}
