import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiDatabase, FiAlertTriangle, FiCopy, FiTrendingUp, FiFolder, FiPlay, FiRefreshCw, FiExternalLink, FiSearch, FiFilter, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import StoragePieChart from '../components/StoragePieChart';
import StorageGrowthChart from '../components/StorageGrowthChart';
import RiskAnalysisChart from '../components/RiskAnalysisChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanPath, setScanPath] = useState('');
  const [error, setError] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [toast, setToast] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  
  // Scan progress state
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const progressIntervalRef = useRef(null);

  // File search/filter/sort state
  const [fileSearch, setFileSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sortField, setSortField] = useState('size_bytes');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user?.settings?.scan_directory) {
      setScanPath(user.settings.scan_directory);
    }
    loadDashboard();
    loadScanHistory();
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const parseStorageToBytes = (storageStr) => {
    if (!storageStr) return 0;
    const match = storageStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return Math.round(value * (units[unit] || 1));
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getDashboard();
      setData(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('No scan data available. Run a scan to get started.');
      } else {
        setError('Backend offline. Please start the FastAPI server and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      const response = await dashboardService.getScanHistory();
      setScanHistory(response.data || []);
    } catch {
      // Non-critical
    }
  };

  const handleScan = async () => {
    if (!scanPath.trim()) {
      setScanError('Please enter a folder path');
      return;
    }

    try {
      setScanning(true);
      setScanError(null);
      setError(null);
      setScanProgress(0);
      setScanStatus('Starting scan...');

      // Start the scan
      const response = await dashboardService.startScan(scanPath);
      
      setScanProgress(100);
      setScanStatus('Complete!');
      
      // Reload dashboard and scan history with new data
      await loadDashboard();
      await loadScanHistory();
      showToast('Scan completed successfully!');
    } catch (err) {
      let message = 'Scan failed. Please try again.';
      if (err.response) {
        if (err.response.status === 404) {
          message = 'Folder path not found. Please check the path and try again.';
        } else if (err.response.status === 403) {
          message = 'Permission denied. Try a different folder.';
        } else if (err.response.status === 400) {
          message = 'Invalid folder path. Please enter a valid directory.';
        } else {
          message = err.response.data?.detail || message;
        }
      } else if (err.code === 'ECONNREFUSED') {
        message = 'Backend offline. Please start the FastAPI server.';
      }
      setScanError(message);
      showToast(message, 'error');
    } finally {
      setScanning(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleOpenFile = async (filePath) => {
    try {
      const response = await dashboardService.openFile(filePath);
      showToast(response.data.message || 'File opened successfully');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to open file';
      showToast(message, 'error');
    }
  };

  // File sorting and filtering
  const getSortedFiles = (files) => {
    if (!files) return [];
    let filtered = [...files];

    // Search filter
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase();
      filtered = filtered.filter(f => 
        (f.filename || f.name || '').toLowerCase().includes(q) ||
        (f.path || '').toLowerCase().includes(q)
      );
    }

    // Type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(f => {
        const ext = (f.extension || f.filename?.split('.').pop() || '').toLowerCase();
        if (fileTypeFilter === 'document') return /doc|pdf|txt|docx|xls|xlsx|ppt|pptx/.test(ext);
        if (fileTypeFilter === 'image') return /jpg|jpeg|png|gif|bmp|svg|webp/.test(ext);
        if (fileTypeFilter === 'video') return /mp4|avi|mkv|mov|wmv|flv/.test(ext);
        if (fileTypeFilter === 'audio') return /mp3|wav|flac|aac|ogg|wma/.test(ext);
        if (fileTypeFilter === 'archive') return /zip|rar|7z|tar|gz/.test(ext);
        if (fileTypeFilter === 'executable') return /exe|msi|bat|cmd|ps1/.test(ext);
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let va = a[sortField] ?? a.size_bytes ?? 0;
      let vb = b[sortField] ?? b.size_bytes ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });

    return filtered;
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  const summary = data?.summary || {};
  const storage = data?.storage || {};
  const security = data?.security || {};

  const storageData = storage.type_breakdown
    ? Object.entries(storage.type_breakdown).map(([type, info]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: info.count,
        percentage: info.percentage,
        files: info.count,
      }))
    : [];

  const riskData = [
    { 
      name: 'Analysis', 
      safe: Math.max(0, 100 - (security.security_score || 0)), 
      suspicious: security.suspicious_files || 0, 
      duplicates: security.duplicate_executables || 0, 
      old: security.old_executables || 0 
    },
  ];

  // Build growth data from scan history
  const growthData = scanHistory.length > 0 
    ? scanHistory.map(s => ({
        ...s,
        storage_used_bytes: s.storage_used_bytes || parseStorageToBytes(s.storage_used) || 0
      }))
    : [];

  // Get file list for the dashboard table
  const fileList = data?.file_list || data?.large_files || [];
  const sortedFiles = getSortedFiles(fileList);

  const getQuickFolders = () => {
    return [
      { label: 'Downloads', path: '~/Downloads' },
      { label: 'Desktop', path: '~/Desktop' },
      { label: 'Documents', path: '~/Documents' },
    ];
  };

  const quickFolders = getQuickFolders();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'error' 
              ? 'bg-red-600/90 text-white border border-red-400' 
              : 'bg-green-600/90 text-white border border-green-400'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Analyze files, detect duplicates, and assess security risks</p>
      </motion.div>

      {/* Scan Input Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Folder Path to Scan
            </label>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={scanPath}
                onChange={(e) => { setScanPath(e.target.value); setScanError(null); }}
                placeholder="Enter folder path (e.g., C:/Users/YourName/Downloads)"
                className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-colors"
                disabled={scanning}
              />
              <motion.button
                whileHover={!scanning ? { scale: 1.05 } : {}}
                whileTap={!scanning ? { scale: 0.95 } : {}}
                onClick={handleScan}
                disabled={scanning}
                className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {scanning ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <FiPlay />
                    Start Scan
                  </>
                )}
              </motion.button>
            </div>
            {/* Quick folder buttons */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="text-xs text-gray-500 mr-1 self-center">Quick:</span>
              {quickFolders.map((folder, idx) => (
                <button
                  key={idx}
                  onClick={() => setScanPath(folder.path)}
                  disabled={scanning}
                  className="text-xs px-3 py-1.5 bg-dark-800/50 border border-dark-600 rounded-md text-gray-400 hover:text-white hover:border-neon-blue/50 transition-colors disabled:opacity-50"
                >
                  <FiFolder className="inline mr-1" size={12} />
                  {folder.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {scanError && (
          <p className="text-red-400 text-sm mt-2">{scanError}</p>
        )}
        {/* Enhanced Scan Progress Indicator */}
        {scanning && (
          <div className="mt-4">
            <div className="flex items-center gap-3 text-neon-blue">
              <FiRefreshCw className="animate-spin" />
              <span>{scanStatus || 'Scanning files... This may take a moment.'}</span>
            </div>
            <div className="mt-2 w-full bg-dark-700 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max(5, scanProgress)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">{scanProgress}%</span>
              <span className="text-xs text-gray-500">Using optimized multithreaded scanner</span>
            </div>
          </div>
        )}
      </motion.div>

      {!data && !error ? (
        <div className="p-8">
          <div className="card text-center">
            <p className="text-gray-400 text-lg mb-4">No scan data available yet</p>
            <p className="text-gray-500 mb-4">Enter a folder path above and click <span className="text-neon-blue">Start Scan</span> to begin.</p>
            <button onClick={loadDashboard} className="btn btn-secondary">
              Retry Connection
            </button>
          </div>
        </div>
      ) : error && !data ? (
        <div className="p-8">
          <div className="card">
            <p className="text-red-400">{error}</p>
            <button onClick={loadDashboard} className="btn btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stat Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FiDatabase}
              label="Files Scanned"
              value={summary.files_scanned?.toLocaleString() || '0'}
              subtitle={summary.scan_path ? `From: ${summary.scan_path.split('/').pop() || summary.scan_path.split('\\').pop()}` : 'Total files analyzed'}
              color="blue"
            />
            <StatCard
              icon={FiTrendingUp}
              label="Storage Used"
              value={storage.total_storage || '0 B'}
              subtitle="Total disk space"
              color="cyan"
            />
            <StatCard
              icon={FiCopy}
              label="Duplicate Groups"
              value={summary.duplicate_files || '0'}
              subtitle={`${summary.duplicate_count || 0} duplicate files`}
              color="purple"
            />
            <StatCard
              icon={FiAlertTriangle}
              label="Risk Score"
              value={`${security.security_score || 0}/100`}
              subtitle={security.risk_status || 'Unknown'}
              color={
                (security.security_score || 0) < 25 ? 'red' :
                (security.security_score || 0) < 50 ? 'orange' :
                (security.security_score || 0) < 75 ? 'yellow' : 'green'
              }
            />
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {storageData.length > 0 && <StoragePieChart data={storageData} />}
            <StorageGrowthChart data={growthData} />
          </div>

          {/* Risk Analysis */}
          <RiskAnalysisChart data={riskData} />

          {/* File List with Search, Filter, Sort, and Open Button */}
          {fileList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Files Overview</h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-secondary flex items-center gap-2 text-sm"
                >
                  <FiFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>

              {/* Search and Filter Bar */}
              {showFilters && (
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-dark-800/50 rounded-lg">
                  <div className="relative flex-1 min-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      placeholder="Search by name or path..."
                      className="w-full pl-9 pr-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue text-sm"
                    />
                  </div>
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-neon-blue"
                  >
                    <option value="all">All Types</option>
                    <option value="document">Documents</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="archive">Archives</option>
                    <option value="executable">Executables</option>
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleSort('size_bytes')}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        sortField === 'size_bytes' ? 'border-neon-blue text-neon-blue' : 'border-dark-600 text-gray-400'
                      }`}
                    >
                      Size {sortField === 'size_bytes' && (sortDir === 'asc' ? <FiArrowUp className="inline" size={12} /> : <FiArrowDown className="inline" size={12} />)}
                    </button>
                    <button
                      onClick={() => toggleSort('filename')}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        sortField === 'filename' ? 'border-neon-blue text-neon-blue' : 'border-dark-600 text-gray-400'
                      }`}
                    >
                      Name {sortField === 'filename' && (sortDir === 'asc' ? <FiArrowUp className="inline" size={12} /> : <FiArrowDown className="inline" size={12} />)}
                    </button>
                  </div>
                </div>
              )}

              {/* File Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th>Path</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFiles.slice(0, 50).map((file, idx) => (
                      <tr key={file.path || idx}>
                        <td className="font-medium text-white truncate max-w-[200px]">
                          {file.filename || file.name || 'Unknown'}
                        </td>
                        <td>{file.size || '0 B'}</td>
                        <td>
                          <span className="badge badge-info text-xs">
                            {(file.extension || (file.filename || '').split('.').pop() || 'unknown').toUpperCase()}
                          </span>
                        </td>
                        <td className="text-gray-400 text-sm max-w-md truncate">{file.path || '-'}</td>
                        <td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFile(file.path);
                            }}
                            className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-neon-blue transition-colors cursor-pointer"
                            title="Open file"
                          >
                            <FiExternalLink size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedFiles.length > 50 && (
                  <p className="text-gray-500 text-sm mt-4 text-center">
                    Showing 50 of {sortedFiles.length} files
                  </p>
                )}
                {sortedFiles.length === 0 && fileList.length > 0 && (
                  <p className="text-gray-400 text-center py-4">No files match your search/filter criteria</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mt-8"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Cleanup Recommendations</h3>
            <ul className="space-y-3">
              {data.cleanup_recommendations?.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-neon-blue mt-1">•</span>
                  <span className="text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;