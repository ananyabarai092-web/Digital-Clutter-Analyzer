import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFile, FiFolder, FiCalendar, FiClock, FiAlertTriangle, FiHardDrive } from 'react-icons/fi';
import { formatBytes } from '../utils/format';

const FileDetailModal = ({ file, onClose, openLocation }) => {
  if (!file) return null;

  const getRiskColor = (level) => {
    switch (level) {
      case 'Critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'High': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenLocation = () => {
    if (file.path) {
      // Copy path to clipboard
      navigator.clipboard?.writeText(file.path);
    }
    if (openLocation) openLocation(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="card max-w-lg w-full relative overflow-hidden"
        >
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 cursor-pointer">
            <FiX size={20} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6 pt-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center border border-neon-blue/20">
              <FiFile className="text-neon-blue text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white truncate">{file.name || file.filename || 'Unknown'}</h2>
              {file.extension && (
                <span className="text-xs text-gray-500 uppercase">{file.extension}</span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3">
            <DetailRow icon={FiFolder} label="Full Path" value={file.path || file.filename} />
            <DetailRow icon={FiHardDrive} label="Size" value={file.size || formatBytes(file.size_bytes)} />
            <DetailRow icon={FiCalendar} label="Modified Date" value={formatDate(file.modified_date)} />
            <DetailRow icon={FiClock} label="Created Date" value={formatDate(file.created_date)} />
            
            {file.age_days !== undefined && (
              <DetailRow icon={FiClock} label="Age" value={`${file.age_days} days`} />
            )}
            
            {file.risk_level && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
                <FiAlertTriangle className="flex-shrink-0" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 uppercase">Risk Level</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${getRiskColor(file.risk_level)}`}>
                    {file.risk_level}
                  </span>
                </div>
              </div>
            )}

            {file.detection_reason && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
                <FiAlertTriangle className="flex-shrink-0 text-yellow-400" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-500 uppercase">Detection Reason</p>
                  <p className="text-sm text-gray-300">{file.detection_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleOpenLocation}
              className="btn btn-secondary flex-1 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiFolder size={14} />
              Copy Path
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50">
    <Icon className="flex-shrink-0 text-neon-blue" size={16} />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-white font-medium truncate">{value || 'Unknown'}</p>
    </div>
  </div>
);

export default FileDetailModal;