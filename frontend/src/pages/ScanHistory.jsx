import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiDownload, FiRefreshCw, FiPlay } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ScanHistory = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getScanHistory();
      setScans(response.data || []);
    } catch (err) {
      setError('Failed to load scan history. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
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
          <h1 className="text-4xl font-bold text-white mb-2">Scan History</h1>
          <p className="text-gray-400">View your previous scans and analysis results</p>
        </motion.div>
        <div className="card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadHistory} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Scan History</h1>
        <p className="text-gray-400">View your previous scans and analysis results</p>
      </motion.div>

      {/* Start New Scan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-8 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Start a New Scan</h3>
            <p className="text-gray-400">Analyze your files again for latest insights</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlay size={18} />
            Scan Now
          </motion.button>
        </div>
      </motion.div>

      {/* Scan Timeline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {scans.length === 0 ? (
          <div className="card p-8 text-center">
            <FiClock className="text-4xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No scan history available. Run your first scan on the Dashboard.</p>
          </div>
        ) : (
          scans.map((scan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="card group hover:shadow-xl hover:shadow-neon-blue/10 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="w-4 h-4 rounded-full bg-neon-blue"
                  />
                  {idx < scans.length - 1 && (
                    <div className="w-0.5 h-16 bg-gradient-to-b from-neon-blue to-transparent mt-1 mb-1" />
                  )}
                </div>

                {/* Scan details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <FiClock size={16} />
                        {formatDate(scan.scan_date)}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {scan.files_scanned?.toLocaleString() || 0} files • {scan.storage_used || '0 B'} • Score: {scan.security_score || 0}
                      </p>
                      {scan.scan_path && (
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-lg">
                          Path: {scan.scan_path}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {scan.duplicates_found > 0 && (
                        <span className="badge badge-warning">{scan.duplicates_found} dupes</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Insights */}
      {scans.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card mt-8"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Scan Insights</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Total Scans</p>
              <p className="text-2xl font-bold text-neon-blue">{scans.length}</p>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Latest Size</p>
              <p className="text-2xl font-bold text-neon-purple">{scans[0]?.storage_used || '0 B'}</p>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <p className="text-gray-400 mb-1">Latest Score</p>
              <p className="text-2xl font-bold text-neon-cyan">{scans[0]?.security_score || 0}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScanHistory;
