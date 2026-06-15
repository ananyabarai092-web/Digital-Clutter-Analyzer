import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTrash2, FiAlertCircle, FiCheckCircle, FiRefreshCw, FiArrowRight } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';

const CATEGORY_ROUTES = {
  'Duplicate Files': 'duplicate-files',
  'Old Files': 'old-files',
  'Security Items': 'security-items',
  'Large Files': 'large-files',
};

const CleanupCenter = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCleanupData();
  }, []);

  const loadCleanupData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getCleanup();
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No scan data available. Run a scan on the Dashboard first.');
      } else {
        setError('Failed to load cleanup data. Backend may be offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Cleanup Center</h1>
          <p className="text-gray-400">Safe and smart ways to clean up your system</p>
        </motion.div>
        <div className="card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadCleanupData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const categories = data ? [
    {
      title: data.duplicate_files?.title || 'Duplicate Files',
      count: data.duplicate_files?.count || 0,
      size: data.duplicate_files?.size || '0 B',
      description: data.duplicate_files?.description || 'Identical files found in multiple locations',
      icon: FiTrash2,
      route: 'duplicate-files',
    },
    {
      title: data.old_files?.title || 'Old Files',
      count: data.old_files?.count || 0,
      size: data.old_files?.size || '0 B',
      description: data.old_files?.description || 'Files not modified in over 90 days',
      icon: FiAlertCircle,
      route: 'old-files',
    },
    {
      title: data.temporary_files?.title || 'Security Items',
      count: data.temporary_files?.count || 0,
      size: data.temporary_files?.size || '0 alerts',
      description: data.temporary_files?.description || 'Suspicious and flagged files',
      icon: FiCheckCircle,
      route: 'security-items',
    },
    {
      title: data.large_files?.title || 'Large Files',
      count: data.large_files?.count || 0,
      size: data.large_files?.size || '0 B',
      description: data.large_files?.description || 'Large files that may need review',
      icon: FiTrash2,
      route: 'large-files',
    },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Cleanup Center</h1>
        <p className="text-gray-400">Safe and smart ways to clean up your system</p>
      </motion.div>

      {/* Cleanup Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={FiTrash2}
          label="Potential Recovery"
          value={data?.potential_recovery || '0 B'}
          subtitle="Space you can reclaim"
          color="blue"
        />
        <StatCard
          icon={FiAlertCircle}
          label="Items to Review"
          value={(data?.duplicate_files?.count || 0) + (data?.old_files?.count || 0) + (data?.large_files?.count || 0)}
          subtitle="Files recommended for deletion"
          color="purple"
        />
        <div onClick={() => navigate('/cleanup-center/recommendations')} className="cursor-pointer">
          <StatCard
            icon={FiCheckCircle}
            label="Recommendations"
            value={data?.recommendations?.length || 0}
            subtitle="Cleanup suggestions"
            color="green"
          />
        </div>
      </div>

      {/* Cleanup Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        {categories.map((category, idx) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(`/cleanup-center/${category.route}`)}
              className="card group hover:shadow-xl hover:shadow-neon-blue/10 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="text-3xl text-neon-blue" />
                <span className="text-sm font-semibold text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded">
                  {typeof category.count === 'number' ? category.count.toLocaleString() : category.count}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{category.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{category.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-neon-cyan">{category.size}</span>
                <span className="flex items-center gap-1 text-sm text-neon-blue opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details <FiArrowRight size={14} />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Cleanup Recommendations */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card mt-8"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Cleanup Recommendations</h3>
          <ul className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-neon-blue mt-1">•</span>
                <span className="text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Cleanup Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card mt-8"
      >
        <h3 className="text-xl font-semibold text-white mb-4">Cleanup Tips</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-neon-blue mt-1">•</span>
            <span className="text-gray-300">Archive old files before deleting to preserve important data</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-neon-blue mt-1">•</span>
            <span className="text-gray-300">Always backup before running aggressive cleanup operations</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-neon-blue mt-1">•</span>
            <span className="text-gray-300">Review large files individually to avoid accidental deletion</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default CleanupCenter;
