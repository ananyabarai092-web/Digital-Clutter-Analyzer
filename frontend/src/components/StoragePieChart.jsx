import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#00d4ff', '#a855f7', '#f472b6', '#06b6d4', '#f59e0b', '#10b981', '#6366f1', '#fb923c'];

const StoragePieChart = ({ data }) => {
  // Sort data by percentage descending
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  }, [data]);

  // Total files count
  const totalFiles = useMemo(() => {
    return sortedData.reduce((sum, item) => sum + (item.files || item.value || 0), 0);
  }, [sortedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-white font-semibold mb-2 text-sm">{item.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Percentage</span>
              <span className="text-neon-blue font-medium">{(item.percentage || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-400">Files</span>
              <span className="text-white font-medium">{(item.files || item.value || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <motion.div className="card">
        <h3 className="text-lg font-semibold text-white mb-6">Storage Distribution</h3>
        <p className="text-gray-500 text-center py-8">No storage data available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Storage Distribution</h3>
          <p className="text-xs text-gray-500">File type breakdown by count</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{totalFiles.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total Files</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Donut Chart - Left Side */}
        <div className="flex-shrink-0 w-full lg:w-[280px] h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedData}
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={65}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2.5}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="transparent"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Info Panel - Right Side */}
        <div className="flex-1 w-full lg:w-auto min-w-0">
          <div className="space-y-1.5">
            {sortedData.map((item, index) => {
              const pct = item.percentage || 0;
              const barWidth = Math.max(pct, 2); // minimum bar width for visibility
              return (
                <motion.div
                  key={`info-${index}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="group"
                >
                  <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                    {/* Color indicator */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-dark-600"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />

                    {/* Category info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200 truncate">
                          {item.name}
                        </span>
                        <span className={`text-sm font-semibold ml-3 ${
                          pct >= 20 ? 'text-white' :
                          pct >= 5 ? 'text-gray-300' :
                          'text-gray-400'
                        }`}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1 w-full h-1.5 bg-dark-700/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: 0.2 + index * 0.05, duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full transition-all duration-300"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                      </div>
                      {/* File count */}
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {(item.files || item.value || 0).toLocaleString()} files
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoragePieChart;