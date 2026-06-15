import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import StoragePieChart from '../components/StoragePieChart';
import StorageGrowthChart from '../components/StorageGrowthChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';

const StorageAnalytics = () => {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        setError(null);
        const response = await dashboardService.getDashboard();
        const dashboardData = response.data;
        // Extract storage data from nested structure
        const storageData = dashboardData.storage || {};
        const summaryData = dashboardData.summary || {};
        setData({
          ...storageData,
          files_scanned: summaryData.files_scanned || 0,
          duplicate_count: summaryData.duplicate_count || 0,
          potential_recovery: summaryData.potential_recovery || '0 B',
          scan_date: summaryData.scan_date || null,
          scan_path: summaryData.scan_path || '',
          storage_used_formatted: summaryData.storage_used_formatted || storageData.total_storage || '0 B',
        });
        dashboardService.getAnalytics()
          .then(res => setInsights(res.data.smart_insights))
          .catch(() => {});
      } catch (err) {
        console.error(err);
        setError(err.response?.status === 404 
          ? 'No scan data available. Run a scan from the Dashboard first.' 
          : 'Failed to load storage analytics. Backend may be offline.');
      } finally {
        setLoading(false);
      }
    };
    loadStorage();
  }, []);

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;
  if (error) return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Storage Analytics</h1>
        <p className="text-gray-400">Detailed breakdown of your file storage</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex flex-col items-center justify-center py-16"
      >
        <FiAlertCircle className="text-4xl text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg mb-2">{error}</p>
        <button 
          onClick={() => { setLoading(true); setError(null); setData(null); }}
          className="btn btn-primary mt-4"
        >
          Retry
        </button>
      </motion.div>
    </div>
  );
  if (!data) return <div className="p-8 text-red-400">No data available</div>;

  const typeData = data.type_breakdown
    ? Object.entries(data.type_breakdown).map(([type, info]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: info.count,
        percentage: info.percentage,
      }))
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Storage Analytics</h1>
        <p className="text-gray-400">Detailed breakdown of your file storage</p>
      </motion.div>

      {/* Storage Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <FiBarChart2 className="text-3xl text-neon-blue mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total Storage</h3>
          <p className="text-3xl font-bold text-white">{data.total_storage}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <FiPieChart className="text-3xl text-neon-purple mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">File Types</h3>
          <p className="text-3xl font-bold text-white">
            {Object.keys(data.type_breakdown || {}).length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <FiTrendingUp className="text-3xl text-neon-cyan mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Largest Category</h3>
          <p className="text-3xl font-bold text-white">
            {typeData.length > 0 ? typeData.sort((a, b) => b.value - a.value)[0].name : 'N/A'}
          </p>
        </motion.div>
      </div>

      {/* Type Breakdown */}
      {typeData.length > 0 && <StoragePieChart data={typeData} />}

      {insights && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mt-8">
          <h3 className="text-xl font-semibold text-white mb-6">Smart Storage Insights</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Duplicate Ratio</p>
              <p className="text-2xl font-bold text-neon-blue">{insights.duplicate_ratio || 0}%</p>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Trend</p>
              <p className="text-2xl font-bold text-neon-purple">{insights.trend_direction || 'flat'}</p>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Top Type</p>
              <p className="text-2xl font-bold text-neon-cyan">{insights.top_file_types?.[0]?.type || 'N/A'}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detailed Breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card mt-8"
      >
        <h3 className="text-xl font-semibold text-white mb-6">File Type Breakdown</h3>
        <div className="space-y-4">
          {typeData.map((type, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-white mb-1">{type.name}</h4>
                <p className="text-sm text-gray-400">{type.value} files</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neon-blue">{type.percentage.toFixed(1)}%</p>
                <div className="w-32 h-2 bg-dark-700 rounded-full mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan rounded-full"
                    style={{ width: `${type.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default StorageAnalytics;
