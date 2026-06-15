import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiSun, FiMoon, FiX, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/api';

const NotificationPanel = ({ scanData, onClose, onMarkAllRead, onClearAll, notifications: externalNotifications }) => {
  const [internalNotifications, setInternalNotifications] = useState([]);

  // Determine which notification state to use
  const notifications = externalNotifications || internalNotifications;

  // Regenerate notifications from scan data, but respect cleared state
  useEffect(() => {
    // If external state is provided, don't regenerate (it's managed by Header)
    if (externalNotifications) return;

    const alerts = [];
    if (!scanData) {
      alerts.push({ id: 'healthy', title: 'System Healthy', description: 'No active threats detected. Run a scan to analyze.', severity: 'low', timestamp: new Date().toISOString(), pinned: false, unread: false });
      setInternalNotifications(alerts);
      return;
    }
    const security = scanData.security || {};
    const summary = scanData.summary || {};
    const duplicates = scanData.duplicate_files || [];

    if (security.risk_status === 'HIGH RISK' || (security.security_score || 100) < 25) {
      alerts.push({ id: 'high-risk', title: 'High Risk Files Detected', description: `Security score is ${security.security_score}/100. Review immediately.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.malware_flags > 0) {
      alerts.push({ id: 'malware', title: 'Malware Signatures Detected', description: `${security.malware_flags} files contain suspicious patterns.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.suspicious_files > 0) {
      alerts.push({ id: 'suspicious', title: 'Suspicious Executables Found', description: `${security.suspicious_files} executable files detected.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.hidden_executables > 0) {
      alerts.push({ id: 'hidden', title: 'Hidden Executables Found', description: `${security.hidden_executables} hidden executables detected.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.security_score < 60 && security.security_score >= 25) {
      alerts.push({ id: 'score-drop', title: 'Security Score Dropped', description: `Score is ${security.security_score}/100. Review suspicious files.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (summary.duplicate_count > 0 || duplicates.length > 0) {
      const cnt = summary.duplicate_count || duplicates.length;
      alerts.push({ id: 'dupes', title: 'Duplicate Files Detected', description: `${cnt} duplicate files. Recovery: ${summary.potential_recovery || 'Various'}.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (summary.storage_used_formatted) {
      const m = summary.storage_used_formatted.match(/^([\d.]+)\s*(GB|TB)$/i);
      if (m && ((m[2].toUpperCase() === 'GB' && parseFloat(m[1]) > 50) || m[2].toUpperCase() === 'TB')) {
        alerts.push({ id: 'storage', title: 'Storage Usage High', description: `Files consume ${summary.storage_used_formatted}. Consider cleanup.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
      }
    }
    if (alerts.length === 0) {
      alerts.push({ id: 'healthy', title: 'System Healthy', description: 'No threats detected. System is clean.', severity: 'low', timestamp: new Date().toISOString(), pinned: false, unread: false });
    }
    setInternalNotifications(alerts);
  }, [scanData, externalNotifications]);

  const severityIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  const severityBorder = { critical: 'border-red-500/30', high: 'border-orange-500/30', medium: 'border-yellow-500/30', low: 'border-green-500/30' };
  const severityBg = { critical: 'bg-red-500/5', high: 'bg-orange-500/5', medium: 'bg-yellow-500/5', low: 'bg-green-500/5' };

  const sorted = [...notifications].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (order[a.severity] || 99) - (order[b.severity] || 99);
  });

  const unreadCount = notifications.filter(n => n.unread).length;
  const highest = ['critical', 'high', 'medium', 'low'].find(s => notifications.some(n => n.severity === s)) || 'low';

  const formatTime = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const handleMarkAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setInternalNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    }
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    } else {
      setInternalNotifications([]);
    }
  };

  return (
    <>
      {/* Notification Panel */}
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
                <button onClick={handleMarkAllRead} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700 transition-colors cursor-pointer">Mark All Read</button>
              )}
              <button onClick={handleClearAll} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700 transition-colors cursor-pointer">Clear All</button>
              <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><FiX size={16} /></button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[500px] p-2 space-y-1">
            {sorted.length === 0 ? (
              <div className="text-center py-8">
                <FiBell className="mx-auto text-gray-600 text-3xl mb-2" />
                <p className="text-gray-500 text-sm">No notifications</p>
              </div>
            ) : (
              sorted.map((n) => (
                <div key={n.id} className={`flex gap-3 p-3 rounded-lg border ${severityBorder[n.severity]} ${severityBg[n.severity]} ${n.unread ? 'border-l-2' : 'opacity-70'}`}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{severityIcon[n.severity]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${n.unread ? 'text-white' : 'text-gray-300'}`}>{n.title}</p>
                      {n.pinned && <span className="text-[10px] uppercase text-red-400 font-semibold flex-shrink-0">PINNED</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{formatTime(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    setIsThemeLoaded(true);
  }, []);

  // Load scan data for notifications
  useEffect(() => {
    dashboardService.getDashboard()
      .then(res => setScanData(res.data))
      .catch(() => {});
    dashboardService.getNotifications()
      .then(res => setNotifications(res.data || []))
      .catch(() => {});
  }, []);

  // Generate notifications from scan data (when no external clearing has happened)
  useEffect(() => {
    if (!scanData) return;
    // Only generate if we haven't cleared/read them
    if (notifications.length > 0) return;

    const alerts = [];
    const security = scanData.security || {};
    const summary = scanData.summary || {};
    const duplicates = scanData.duplicate_files || [];

    if (security.risk_status === 'HIGH RISK' || (security.security_score || 100) < 25) {
      alerts.push({ id: 'high-risk', title: 'High Risk Files Detected', description: `Security score is ${security.security_score}/100. Review immediately.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.malware_flags > 0) {
      alerts.push({ id: 'malware', title: 'Malware Signatures Detected', description: `${security.malware_flags} files contain suspicious patterns.`, severity: 'critical', timestamp: new Date().toISOString(), pinned: true, unread: true });
    }
    if (security.suspicious_files > 0) {
      alerts.push({ id: 'suspicious', title: 'Suspicious Executables Found', description: `${security.suspicious_files} executable files detected.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.hidden_executables > 0) {
      alerts.push({ id: 'hidden', title: 'Hidden Executables Found', description: `${security.hidden_executables} hidden executables detected.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (security.security_score < 60 && security.security_score >= 25) {
      alerts.push({ id: 'score-drop', title: 'Security Score Dropped', description: `Score is ${security.security_score}/100. Review suspicious files.`, severity: 'high', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (summary.duplicate_count > 0 || duplicates.length > 0) {
      const cnt = summary.duplicate_count || duplicates.length;
      alerts.push({ id: 'dupes', title: 'Duplicate Files Detected', description: `${cnt} duplicate files. Recovery: ${summary.potential_recovery || 'Various'}.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
    }
    if (summary.storage_used_formatted) {
      const m = summary.storage_used_formatted.match(/^([\d.]+)\s*(GB|TB)$/i);
      if (m && ((m[2].toUpperCase() === 'GB' && parseFloat(m[1]) > 50) || m[2].toUpperCase() === 'TB')) {
        alerts.push({ id: 'storage', title: 'Storage Usage High', description: `Files consume ${summary.storage_used_formatted}. Consider cleanup.`, severity: 'medium', timestamp: new Date().toISOString(), pinned: false, unread: true });
      }
    }
    if (alerts.length === 0) {
      alerts.push({ id: 'healthy', title: 'System Healthy', description: 'No threats detected. System is clean.', severity: 'low', timestamp: new Date().toISOString(), pinned: false, unread: false });
    }
    setNotifications(alerts);
  }, [scanData]);

  // Close notifications on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Computed unread count
  const unreadCount = notifications.filter(n => n.unread).length;

  // Highest severity for bell color
  const highestSeverity = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'];
    for (const sev of order) {
      if (notifications.some(n => n.severity === sev)) return sev;
    }
    return 'low';
  }, [notifications]);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('clutterguard-theme', next);
  };

  const isDark = () => (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';

  // Mark all notifications as read
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    dashboardService.markNotificationsRead().catch(() => {});
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };

  const initials = (user?.full_name || user?.email || 'User')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 glass border-b border-dark-700">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left */}
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-white">ClutterGuard Dashboard</h1>
          <p className="text-xs text-gray-400">Smart File Analytics & Security Risk Assessment</p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors text-gray-400 hover:text-gray-200 cursor-pointer"
            title="Toggle Theme"
          >
            {isThemeLoaded && (isDark() ? <FiSun size={20} /> : <FiMoon size={20} />)}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-lg hover:bg-dark-700/50 transition-colors cursor-pointer ${
                showNotifications ? 'text-neon-blue' :
                highestSeverity === 'critical' ? 'text-red-400 animate-pulse' :
                highestSeverity === 'high' ? 'text-orange-400' :
                highestSeverity === 'medium' ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Notifications"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                scanData={scanData}
                onClose={() => setShowNotifications(false)}
                onMarkAllRead={markAllRead}
                onClearAll={clearAll}
                notifications={notifications}
              />
            )}
          </div>

          {/* User Profile - Navigates to /profile */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-colors cursor-pointer"
            title="User Profile"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-300 hidden sm:inline">{user?.full_name || 'User'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors text-gray-400 hover:text-red-400 cursor-pointer"
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
