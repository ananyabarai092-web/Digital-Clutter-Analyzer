import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX } from 'react-icons/fi';

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '🔴' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '🟠' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🟡' },
  low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '🟢' },
};

const NotificationPanel = ({ scanData, onClose, onMarkAllRead, onClearAll, notifications: externalNotifications }) => {
  const [internalNotifications, setInternalNotifications] = useState([]);

  const notifications = externalNotifications || internalNotifications;

  useEffect(() => {
    if (externalNotifications) return;

    const alerts = [];
    if (!scanData) {
      alerts.push({
        id: 'system-healthy',
        title: 'System Healthy',
        description: 'No active threats detected. System is running normally.',
        severity: 'low',
        timestamp: new Date().toISOString(),
        pinned: false,
        unread: false,
      });
      setInternalNotifications(alerts);
      return;
    }

    const security = scanData.security || {};
    const summary = scanData.summary || {};
    const duplicates = scanData.duplicate_files || [];

    if (security.risk_status === 'HIGH RISK' || (security.security_score || 0) < 25) {
      alerts.push({ id: 'high-risk', title: 'High Risk Files Detected', description: `Security score is ${security.security_score}/100. Multiple risk indicators found.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.security_score < 60 && security.security_score >= 25) {
      alerts.push({ id: 'score-drop', title: 'Security Score Dropped', description: `Security score is ${security.security_score}/100. Review suspicious files.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.suspicious_files > 0) {
      alerts.push({ id: 'suspicious-files', title: 'Suspicious Executables Found', description: `${security.suspicious_files} suspicious executable files detected in scan.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (summary.storage_used_formatted) {
      const sizeMatch = summary.storage_used_formatted.match(/^([\d.]+)\s*(GB|TB)$/i);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        if ((unit === 'GB' && size > 50) || (unit === 'TB')) {
          alerts.push({ id: 'storage-large', title: 'Storage Usage High', description: `Files are consuming ${summary.storage_used_formatted}. Consider cleanup.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
        }
      }
    }
    if (summary.duplicate_count > 0 || duplicates.length > 0) {
      const dupCount = summary.duplicate_count || duplicates.length;
      alerts.push({ id: 'duplicates-found', title: 'Duplicate Files Detected', description: `${dupCount} duplicate files found. Potential recovery: ${summary.potential_recovery || 'Various'}.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.malware_flags > 0) {
      alerts.push({ id: 'malware-flags', title: 'Malware Signatures Detected', description: `${security.malware_flags} files contain suspicious patterns. Review immediately.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.hidden_executables > 0) {
      alerts.push({ id: 'hidden-execs', title: 'Hidden Executables Found', description: `${security.hidden_executables} hidden executable files detected in scan path.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (alerts.length === 0) {
      alerts.push({ id: 'system-healthy', title: 'System Healthy', description: 'No active threats detected. System is running normally.', severity: 'low', timestamp: new Date().toISOString(), pinned: false, unread: false });
    }
    setInternalNotifications(alerts);
  }, [scanData, externalNotifications]);

  const sortedNotifications = useMemo(() => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...notifications].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
    });
  }, [notifications]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const highestSeverity = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'];
    for (const sev of order) {
      if (notifications.some(n => n.severity === sev)) return sev;
    }
    return 'low';
  }, [notifications]);

  const markAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setInternalNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    }
  };

  const clearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      setInternalNotifications([]);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full right-0 mt-2 w-[420px] max-h-[600px] overflow-hidden rounded-xl card shadow-2xl border-dark-600 z-50"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{unreadCount} new</span>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700 transition-colors cursor-pointer">
                Mark All Read
              </button>
            )}
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700 transition-colors cursor-pointer">
              Clear All
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px] p-2 space-y-1">
          {sortedNotifications.length === 0 ? (
            <div className="text-center py-8">
              <FiBell className="mx-auto text-gray-600 text-3xl mb-2" />
              <p className="text-gray-500 text-sm">No notifications</p>
            </div>
          ) : (
            sortedNotifications.map((n) => {
              const config = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.low;
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3 rounded-lg border ${config.border} ${config.bg} ${n.unread ? 'border-l-2' : 'opacity-70'}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${n.unread ? 'text-white' : 'text-gray-300'}`}>{n.title}</p>
                      {n.pinned && <span className="text-[10px] uppercase text-red-400 font-semibold flex-shrink-0">PINNED</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatTime(n.timestamp)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPanel;