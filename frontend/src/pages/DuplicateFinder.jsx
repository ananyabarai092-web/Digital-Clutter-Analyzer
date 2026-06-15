import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiTrash2, FiHardDrive, FiRefreshCw, FiExternalLink, FiCheckSquare, FiSquare, FiAlertTriangle, FiFolder } from 'react-icons/fi';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { dashboardService } from '../services/api';

const DuplicateFinder = () => {
  const [duplicates, setDuplicates] = useState([]);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [wastedSpace, setWastedSpace] = useState('0 B');
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null);
  
  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });
  const [bulkDeleteModal, setBulkDeleteModal] = useState({ open: false });
  const [deleting, setDeleting] = useState(false);
  
  // Move modal
  const [moveModal, setMoveModal] = useState({ open: false });
  const [movePath, setMovePath] = useState('');

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDuplicates();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getDuplicates();
      setDuplicates(response.data.duplicates || []);
      setTotalDuplicates(response.data.total_duplicates || 0);
      setWastedSpace(response.data.wasted_space || '0 B');
      setTotalGroups(response.data.total_groups || 0);
      setSelected([]);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No scan data available. Run a scan on the Dashboard first.');
      } else {
        setError('Failed to load duplicate data. Backend may be offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (path) => {
    setSelected(prev => 
      prev.includes(path) ? prev.filter(s => s !== path) : [...prev, path]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredDuplicates.length) {
      setSelected([]);
    } else {
      setSelected(filteredDuplicates.map(d => d.path));
    }
  };

  const handleOpenFile = async (filePath) => {
    try {
      const response = await dashboardService.openFile(filePath);
      showToast(response.data.message || 'File opened successfully');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to open file', 'error');
    }
  };

  const handleDeleteFile = async (filePath) => {
    setDeleteModal({ open: true, file: filePath });
  };

  const confirmDelete = async () => {
    const filePath = deleteModal.file;
    if (!filePath) return;
    
    try {
      setDeleting(true);
      const response = await dashboardService.deleteFile(filePath);
      showToast(response.data.message || 'File deleted successfully');
      setDeleteModal({ open: false, file: null });
      
      // Refresh data
      await loadDuplicates();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete file', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setBulkDeleteModal({ open: true });
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleting(true);
      const response = await dashboardService.bulkDeleteFiles(selected);
      const data = response.data;
      
      if (data.deleted_count > 0) {
        showToast(`Successfully deleted ${data.deleted_count} file(s), freed ${data.total_freed_space}`);
      }
      if (data.failed_count > 0) {
        showToast(`${data.failed_count} file(s) could not be deleted`, 'error');
      }
      
      setBulkDeleteModal({ open: false });
      await loadDuplicates();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete files', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkMove = () => {
    if (selected.length === 0) return;
    setMovePath('');
    setMoveModal({ open: true });
  };

  const confirmBulkMove = async () => {
    if (!movePath.trim()) {
      showToast('Please enter a destination folder path', 'error');
      return;
    }
    
    try {
      setDeleting(true);
      const response = await dashboardService.bulkMoveFiles(selected, movePath);
      const data = response.data;
      
      if (data.moved_count > 0) {
        showToast(`Successfully moved ${data.moved_count} file(s) to ${movePath}`);
      }
      if (data.failed_count > 0) {
        showToast(`${data.failed_count} file(s) could not be moved`, 'error');
      }
      
      setMoveModal({ open: false });
      await loadDuplicates();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to move files', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filter duplicates by search
  const filteredDuplicates = searchQuery.trim()
    ? duplicates.filter(d => 
        (d.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.path || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : duplicates;

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Duplicate Finder</h1>
          <p className="text-gray-400">Find and remove duplicate files to save space</p>
        </motion.div>
        <div className="card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadDuplicates} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Duplicate Finder</h1>
        <p className="text-gray-400">Find and remove duplicate files to save space</p>
      </motion.div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <FiSearch className="text-3xl text-neon-blue mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Duplicate Groups</h3>
          <p className="text-3xl font-bold text-white">{totalGroups}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <FiHardDrive className="text-3xl text-neon-purple mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Space to Save</h3>
          <p className="text-3xl font-bold text-white">{wastedSpace}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <FiTrash2 className="text-3xl text-neon-cyan mb-4" />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Duplicate Files</h3>
          <p className="text-3xl font-bold text-white">{totalDuplicates}</p>
        </motion.div>
      </div>

      {/* Duplicates Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-xl font-semibold text-white">Duplicate Files</h3>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search duplicates..."
                className="pl-9 pr-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue text-sm w-48"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadDuplicates}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FiRefreshCw /> Refresh
            </motion.button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4 p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg"
          >
            <span className="text-sm text-neon-blue font-medium">
              {selected.length} file(s) selected
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger flex items-center gap-1 text-sm"
              >
                <FiTrash2 size={14} /> Delete Selected
              </button>
              <button
                onClick={handleBulkMove}
                className="btn btn-secondary flex items-center gap-1 text-sm"
              >
                <FiFolder size={14} /> Move Selected
              </button>
              <button
                onClick={() => setSelected([])}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {filteredDuplicates.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title={searchQuery ? "No Matching Duplicates" : "No Duplicates Found"}
            description={searchQuery ? "Try a different search term" : "No duplicate files have been detected in your latest scan."}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <button
                      onClick={toggleSelectAll}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {selected.length === filteredDuplicates.length ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
                    </button>
                  </th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Path</th>
                  <th>Copies</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDuplicates.slice(0, 100).map((dup, idx) => (
                  <tr key={dup.path || idx} className={selected.includes(dup.path) ? 'bg-neon-blue/5' : ''}>
                    <td>
                      <button
                        onClick={() => toggleSelect(dup.path)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {selected.includes(dup.path) ? <FiCheckSquare size={16} className="text-neon-blue" /> : <FiSquare size={16} />}
                      </button>
                    </td>
                    <td className="font-medium text-white">{dup.filename}</td>
                    <td>{dup.size || '0 B'}</td>
                    <td className="text-gray-400 text-sm max-w-md truncate">{dup.path}</td>
                    <td>
                      <span className="badge badge-info">{dup.duplicates - 1}</span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(dup.path);
                          }}
                          className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-neon-blue transition-colors cursor-pointer"
                          title="Open file"
                        >
                          <FiExternalLink size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(dup.path);
                          }}
                          className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete duplicate"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDuplicates.length > 100 && (
              <p className="text-gray-500 text-sm mt-4 text-center">
                Showing 100 of {filteredDuplicates.length} duplicate files
                {searchQuery && ` (filtered from ${duplicates.length})`}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => !deleting && setDeleteModal({ open: false, file: null })}
        title="Confirm Delete"
        size="sm"
      >
        <div className="text-center">
          <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">Are you sure you want to delete this duplicate file?</p>
          <p className="text-sm text-gray-400 mb-6 break-all">{deleteModal.file}</p>
          <p className="text-xs text-yellow-400 mb-6">
            This action is irreversible. The file will be permanently deleted.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDeleteModal({ open: false, file: null })}
              disabled={deleting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="btn btn-danger flex items-center gap-2"
            >
              {deleting ? <><FiRefreshCw className="animate-spin" /> Deleting...</> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteModal.open}
        onClose={() => !deleting && setBulkDeleteModal({ open: false })}
        title="Confirm Bulk Delete"
        size="sm"
      >
        <div className="text-center">
          <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete {selected.length} file(s)?
          </p>
          <p className="text-xs text-yellow-400 mb-6">
            This action is irreversible. Files will be permanently deleted.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setBulkDeleteModal({ open: false })}
              disabled={deleting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmBulkDelete}
              disabled={deleting}
              className="btn btn-danger flex items-center gap-2"
            >
              {deleting ? <><FiRefreshCw className="animate-spin" /> Deleting...</> : `Delete ${selected.length} Files`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Move Modal */}
      <Modal
        isOpen={moveModal.open}
        onClose={() => !deleting && setMoveModal({ open: false })}
        title="Move Files"
        size="md"
      >
        <div>
          <p className="text-gray-300 mb-4">
            Move {selected.length} file(s) to a different folder
          </p>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Destination Folder
          </label>
          <input
            type="text"
            value={movePath}
            onChange={(e) => setMovePath(e.target.value)}
            placeholder="e.g., C:/Users/YourName/Documents/Organized"
            className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/50 transition-colors mb-6"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setMoveModal({ open: false })}
              disabled={deleting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmBulkMove}
              disabled={deleting}
              className="btn btn-primary flex items-center gap-2"
            >
              {deleting ? <><FiRefreshCw className="animate-spin" /> Moving...</> : 'Move Files'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DuplicateFinder;