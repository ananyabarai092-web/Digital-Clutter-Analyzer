import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiTrash2, FiAlertCircle, FiCheckCircle, FiHardDrive, FiFile, FiClock, FiShield, FiEye, FiFolder, FiX } from 'react-icons/fi';
import FileDetailModal from '../components/FileDetailModal';
import FileDataTable from '../components/FileDataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';
import { formatBytes } from '../utils/format';

const ITEMS_PER_PAGE = 25;

const CATEGORY_META = {
  'recommendations': {
    title: 'All Recommendations',
    icon: FiCheckCircle,
    color: 'from-green-500/20 to-green-500/5 text-green-400',
    description: 'Complete list of cleanup recommendations based on scan analysis.',
  },
  'duplicate-files': {
    title: 'Duplicate Files',
    icon: FiFile,
    color: 'from-neon-blue/20 to-neon-blue/5 text-neon-blue',
    description: 'Identical files found in multiple locations. These files waste disk space and can be safely deleted.',
  },
  'old-files': {
    title: 'Old Files',
    icon: FiClock,
    color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400',
    description: 'Files that have not been modified in over 90 days. Consider archiving or removing them.',
  },
  'large-files': {
    title: 'Large Files',
    icon: FiHardDrive,
    color: 'from-purple-500/20 to-purple-500/5 text-neon-purple',
    description: 'Large files consuming significant disk space. Review and decide if they are still needed.',
  },
  'security-items': {
    title: 'Security Items',
    icon: FiShield,
    color: 'from-red-500/20 to-red-500/5 text-red-400',
    description: 'Suspicious and flagged files that may pose a security risk.',
  },
};

const RecommendationsDetail = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [oldFileFilter, setOldFileFilter] = useState(90);
  const [largeFileFilter, setLargeFileFilter] = useState(100);

  const meta = CATEGORY_META[category] || {
    title: 'Recommendations',
    icon: FiAlertCircle,
    color: 'from-neon-blue/20 to-neon-blue/5 text-neon-blue',
    description: 'Cleanup recommendations for your system.',
  };
  const Icon = meta.icon;

  useEffect(() => {
    loadData();
  }, [category, oldFileFilter, largeFileFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (category === 'recommendations') {
        const resp = await dashboardService.getCleanup();
        setData({ type: 'recommendations', recommendations: resp.data.recommendations || [] });
      } else if (category === 'old-files') {
        const resp = await dashboardService.getOldFilesDetail(oldFileFilter);
        setData({ type: 'old-files', files: resp.data.files || [], total: resp.data.total || 0 });
      } else if (category === 'large-files') {
        const resp = await dashboardService.getLargeFilesDetail(largeFileFilter);
        setData({ type: 'large-files', files: resp.data.files || [], total: resp.data.total || 0 });
      } else if (category === 'security-items') {
        const resp = await dashboardService.getSecurityFilesDetail();
        setData({ type: 'security-items', files: resp.data.files || [], total: resp.data.total || 0 });
      } else if (category === 'duplicate-files') {
        const resp = await dashboardService.getDuplicates();
        setData({
          type: 'duplicate-files',
          files: resp.data.duplicates || [],
          totalDuplicates: resp.data.total_duplicates || 0,
          totalGroups: resp.data.total_groups || 0,
          wastedSpace: resp.data.wasted_space || '0 B',
        });
      } else {
        const resp = await dashboardService.getCleanup();
        setData({ type: 'unknown', recommendations: resp.data.recommendations || [] });
      }
    } catch (err) {
      setError(err.response?.status === 404
        ? 'No scan data available. Run a scan on the Dashboard first.'
        : 'Failed to load data. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/cleanup-center')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors cursor-pointer"
        >
          <FiArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Cleanup Center</span>
        </motion.button>
        <div className="card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadData} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const renderRecommendations = () => {
    const recs = data?.recommendations || [];
    return (
      <div className="space-y-4">
        {recs.length === 0 ? (
          <div className="text-center py-8">
            <FiCheckCircle className="mx-auto text-4xl text-green-400 mb-3" />
            <p className="text-gray-400">No recommendations available.</p>
            <p className="text-sm text-gray-500 mt-1">Run a scan to get personalized cleanup suggestions.</p>
          </div>
        ) : (
          recs.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-neon-blue/20 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center flex-shrink-0 group-hover:bg-neon-blue/20 transition-colors">
                <span className="text-neon-blue font-bold text-sm">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-relaxed">{rec}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  };

  const renderOldFiles = () => {
    const files = data?.files || [];
    const ageFilters = [30, 60, 90, 180, 365];

    return (
      <div>
        {/* Age Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-sm text-gray-400">Filter by age:</span>
          {ageFilters.map(days => (
            <button
              key={days}
              onClick={() => setOldFileFilter(days)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                oldFileFilter === days
                  ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                  : 'bg-dark-800/50 text-gray-400 border border-dark-700 hover:text-white hover:border-dark-600'
              }`}
            >
              Older than {days} days
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Total Old Files</p>
            <p className="text-xl font-bold text-white">{data?.total || files.length}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Oldest File</p>
            <p className="text-xl font-bold text-white">
              {files.length > 0 ? `${files[0]?.age_days || 0}d` : 'N/A'}
            </p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Total Size</p>
            <p className="text-xl font-bold text-white">
              {formatBytes(files.reduce((s, f) => s + (f.size_bytes || 0), 0))}
            </p>
          </div>
        </div>

        {/* File Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Old Files List</h3>
          <FileDataTable
            files={files}
            searchFields={['name', 'path']}
            searchPlaceholder="Search old files..."
            emptyMessage="No old files found at this age threshold."
            emptyDescription="Try a lower age threshold or run a scan."
            onRowClick={(file) => setSelectedFile(file)}
            actions={[
              { label: 'View', onClick: (f) => setSelectedFile(f) },
              { 
                label: 'Copy Path', 
                onClick: (f) => navigator.clipboard?.writeText(f.path || ''),
                icon: <FiFolder size={12} />
              },
            ]}
            columns={[
              { key: 'name', label: 'File Name', width: '25%', render: (f) => (
                <span className="font-medium text-white">{f.name}</span>
              )},
              { key: 'path', label: 'Path', render: (f) => (
                <span className="text-gray-400 text-sm block max-w-md truncate">{f.path}</span>
              )},
              { key: 'size', label: 'Size', width: '10%', render: (f) => (
                <span className="text-gray-300">{f.size}</span>
              )},
              { key: 'age_days', label: 'Age (days)', width: '12%', render: (f) => (
                <span className="badge badge-warning">{f.age_days}d</span>
              )},
              { key: 'modified_date', label: 'Last Modified', width: '18%', render: (f) => {
                try { return new Date(f.modified_date).toLocaleDateString(); } catch { return '-'; }
              }},
            ]}
          />
        </div>
      </div>
    );
  };

  const renderLargeFiles = () => {
    const files = data?.files || [];
    const sizeFilters = [
      { label: '> 100 MB', value: 100 },
      { label: '> 500 MB', value: 500 },
      { label: '> 1 GB', value: 1024 },
    ];

    return (
      <div>
        {/* Size Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-sm text-gray-400">Filter by size:</span>
          {sizeFilters.map(sf => (
            <button
              key={sf.value}
              onClick={() => setLargeFileFilter(sf.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                largeFileFilter === sf.value
                  ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                  : 'bg-dark-800/50 text-gray-400 border border-dark-700 hover:text-white hover:border-dark-600'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Large Files</p>
            <p className="text-xl font-bold text-white">{data?.total || files.length}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Largest File</p>
            <p className="text-xl font-bold text-white">
              {files.length > 0 ? files[0]?.size || '-' : 'N/A'}
            </p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Total Size</p>
            <p className="text-xl font-bold text-white">
              {formatBytes(files.reduce((s, f) => s + (f.size_bytes || 0), 0))}
            </p>
          </div>
        </div>

        {/* File Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Large Files List</h3>
          <FileDataTable
            files={files}
            searchFields={['name', 'path']}
            searchPlaceholder="Search large files..."
            emptyMessage="No large files found at this size threshold."
            emptyDescription="Try a lower size threshold or run a scan."
            onRowClick={(file) => setSelectedFile(file)}
            actions={[
              { label: 'View', onClick: (f) => setSelectedFile(f) },
              { label: 'Copy Path', onClick: (f) => navigator.clipboard?.writeText(f.path || '') },
            ]}
            columns={[
              { key: 'name', label: 'File Name', width: '25%', render: (f) => (
                <span className="font-medium text-white">{f.name}</span>
              )},
              { key: 'path', label: 'Path', render: (f) => (
                <span className="text-gray-400 text-sm block max-w-md truncate">{f.path}</span>
              )},
              { key: 'size', label: 'Size', width: '12%', render: (f) => (
                <span className="font-semibold text-neon-cyan">{f.size}</span>
              )},
              { key: 'extension', label: 'Type', width: '10%', render: (f) => (
                <span className="text-xs text-gray-400 uppercase">{f.extension || 'N/A'}</span>
              )},
              { key: 'modified_date', label: 'Last Modified', width: '18%', render: (f) => {
                try { return new Date(f.modified_date).toLocaleDateString(); } catch { return '-'; }
              }},
            ]}
          />
        </div>
      </div>
    );
  };

  const renderSecurityItems = () => {
    const files = data?.files || [];

    const getRiskBadge = (level) => {
      if (level === 'Critical') return 'badge badge-danger';
      if (level === 'High') return 'badge badge-warning';
      if (level === 'Medium') return 'badge badge-info';
      return 'badge badge-success';
    };

    return (
      <div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Flagged Files</p>
            <p className="text-xl font-bold text-white">{data?.total || files.length}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Critical</p>
            <p className="text-xl font-bold text-red-400">{files.filter(f => f.risk_level === 'Critical').length}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">High/Medium</p>
            <p className="text-xl font-bold text-yellow-400">{files.filter(f => f.risk_level === 'High' || f.risk_level === 'Medium').length}</p>
          </div>
        </div>

        {/* File Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Flagged Files</h3>
          <FileDataTable
            files={files}
            searchFields={['name', 'path', 'detection_reason', 'risk_level']}
            searchPlaceholder="Search flagged files..."
            emptyMessage="No security items found."
            emptyDescription="Your system appears to be clean."
            onRowClick={(file) => setSelectedFile(file)}
            actions={[
              { label: 'View', onClick: (f) => setSelectedFile(f) },
              { label: 'Copy Path', onClick: (f) => navigator.clipboard?.writeText(f.path || '') },
            ]}
            columns={[
              { key: 'name', label: 'File Name', width: '20%', render: (f) => (
                <span className="font-medium text-white">{f.name}</span>
              )},
              { key: 'path', label: 'Path', render: (f) => (
                <span className="text-gray-400 text-sm block max-w-xs truncate">{f.path}</span>
              )},
              { key: 'risk_level', label: 'Risk Level', width: '12%', render: (f) => (
                <span className={getRiskBadge(f.risk_level)}>{f.risk_level}</span>
              )},
              { key: 'detection_reason', label: 'Detection Reason', width: '25%', render: (f) => (
                <span className="text-sm text-gray-300">{f.detection_reason}</span>
              )},
              { key: 'modified_date', label: 'Last Modified', width: '15%', render: (f) => {
                try { return new Date(f.modified_date).toLocaleDateString(); } catch { return '-'; }
              }},
            ]}
          />
        </div>
      </div>
    );
  };

  const renderDuplicateFiles = () => {
    const files = data?.files || [];

    return (
      <div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Duplicate Groups</p>
            <p className="text-xl font-bold text-white">{data?.totalGroups || 0}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Duplicate Files</p>
            <p className="text-xl font-bold text-white">{data?.totalDuplicates || files.length}</p>
          </div>
          <div className="card py-3 px-4">
            <p className="text-xs text-gray-500">Space to Save</p>
            <p className="text-xl font-bold text-neon-cyan">{data?.wastedSpace || '0 B'}</p>
          </div>
        </div>

        {/* File Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Duplicate Files List</h3>
          <FileDataTable
            files={files}
            searchFields={['filename', 'path']}
            searchPlaceholder="Search duplicate files..."
            emptyMessage="No duplicate files found."
            emptyDescription="Your system has no duplicate files based on the latest scan."
            onRowClick={(file) => setSelectedFile({
              ...file,
              name: file.filename,
              size_bytes: file.size_bytes,
            })}
            actions={[
              { label: 'View', onClick: (f) => setSelectedFile({ ...f, name: f.filename, size_bytes: f.size_bytes }) },
              { label: 'Copy Path', onClick: (f) => navigator.clipboard?.writeText(f.path || '') },
            ]}
            columns={[
              { key: 'filename', label: 'File Name', width: '25%', render: (f) => (
                <span className="font-medium text-white">{f.filename}</span>
              )},
              { key: 'path', label: 'Path', render: (f) => (
                <span className="text-gray-400 text-sm block max-w-md truncate">{f.path}</span>
              )},
              { key: 'size', label: 'Size', width: '10%', render: (f) => (
                <span className="text-gray-300">{f.size}</span>
              )},
              { key: 'extension', label: 'Type', width: '8%', render: (f) => (
                <span className="text-xs text-gray-400 uppercase">{f.extension || 'N/A'}</span>
              )},
              { key: 'duplicates', label: 'Copies', width: '8%', render: (f) => (
                <span className="badge badge-info">{f.duplicates}</span>
              )},
            ]}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!data) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available.</p>
        </div>
      );
    }

    switch (data.type) {
      case 'recommendations': return renderRecommendations();
      case 'old-files': return renderOldFiles();
      case 'large-files': return renderLargeFiles();
      case 'security-items': return renderSecurityItems();
      case 'duplicate-files': return renderDuplicateFiles();
      default: return renderRecommendations();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/cleanup-center')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors cursor-pointer"
      >
        <FiArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Cleanup Center</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${meta.color} border border-current/10`}>
            <Icon size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{meta.title}</h1>
            <p className="text-gray-400 mt-1">{meta.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {renderContent()}
      </motion.div>

      {/* Quick Tips at bottom (for non-file-list views) */}
      {(data?.type === 'recommendations' || data?.type === 'unknown') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card mt-8"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Quick Tips</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-dark-800/30 border border-dark-700/50">
              <p className="text-sm text-gray-400">✓ Always backup important files before deletion</p>
            </div>
            <div className="p-3 rounded-lg bg-dark-800/30 border border-dark-700/50">
              <p className="text-sm text-gray-400">✓ Review files individually to avoid data loss</p>
            </div>
            <div className="p-3 rounded-lg bg-dark-800/30 border border-dark-700/50">
              <p className="text-sm text-gray-400">✓ Archive old files before removing them permanently</p>
            </div>
            <div className="p-3 rounded-lg bg-dark-800/30 border border-dark-700/50">
              <p className="text-sm text-gray-400">✓ Run regular scans to keep your system clean</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* File Detail Modal */}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          openLocation={(f) => {
            navigator.clipboard?.writeText(f.path || '');
            setSelectedFile(null);
          }}
        />
      )}
    </div>
  );
};

export default RecommendationsDetail;