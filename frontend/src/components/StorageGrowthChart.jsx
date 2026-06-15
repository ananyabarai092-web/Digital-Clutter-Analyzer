import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const StorageGrowthChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ name: 'No Data', storage: 0 }];
    }
    // Format dates for display
    return data.map(item => {
      let label = 'Scan';
      try {
        const d = new Date(item.scan_date);
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch {
        label = item.scan_date?.slice(5, 10) || 'Scan';
      }
      return {
        name: label,
        storage: item.storage_used_bytes || 0,
        files: item.files_scanned || 0,
        score: item.security_score || 0,
      };
    }).reverse(); // Oldest first for proper timeline
  }, [data]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-white font-semibold text-sm mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Storage Used</span>
              <span className="text-neon-blue font-medium">{formatBytes(item.storage)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Files Scanned</span>
              <span className="text-white font-medium">{item.files?.toLocaleString() || 0}</span>
            </div>
            {item.score !== undefined && (
              <div className="flex justify-between gap-6">
                <span className="text-gray-400">Security Score</span>
                <span className="text-neon-cyan font-medium">{item.score}/100</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Storage Growth</h3>
          <p className="text-xs text-gray-500">Storage usage trend across scans</p>
        </div>
        {chartData.length > 1 && (
          <div className="text-right">
            <p className="text-lg font-bold text-neon-cyan">
              {formatBytes(chartData[chartData.length - 1]?.storage || 0)}
            </p>
            <p className="text-xs text-gray-500">Latest</p>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            stroke="#6b7280" 
            tick={{ fontSize: 11 }}
            dataKey="name"
          />
          <YAxis 
            stroke="#6b7280" 
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatBytes(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="storage"
            stroke="#00d4ff"
            strokeWidth={2.5}
            fill="url(#storageGradient)"
            dot={{ r: 4, fill: '#00d4ff', stroke: '#1f2937', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#00d4ff', stroke: '#1f2937', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
      {chartData.length <= 1 && (
        <p className="text-center text-gray-500 text-xs mt-2">
          Run multiple scans to see storage growth trends over time
        </p>
      )}
    </motion.div>
  );
};

export default StorageGrowthChart;