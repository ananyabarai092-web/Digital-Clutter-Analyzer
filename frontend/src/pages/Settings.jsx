import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiDownload, FiEye, FiLogOut, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    notifications: true,
    auto_cleanup: false,
    deep_security_scan: true,
    folder_monitoring: false,
    scan_directory: '',
  });

  useEffect(() => {
    if (user?.settings) {
      setForm(prev => ({ ...prev, ...user.settings }));
    }
  }, [user]);

  const settings = [
    { title: 'Notifications', description: 'Receive alerts about security threats and recommendations', icon: FiBell, key: 'notifications' },
    { title: 'Auto Cleanup', description: 'Automatically remove temporary files weekly', icon: FiDownload, key: 'auto_cleanup' },
    { title: 'Deep Security Scan', description: 'Perform comprehensive malware scanning', icon: FiShield, key: 'deep_security_scan' },
    { title: 'Folder Monitoring', description: 'Track changes in your default scan directory', icon: FiEye, key: 'folder_monitoring' },
  ];

  const updateToggle = (key) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await authService.updateSettings(form);
      setUser(response.data);
      localStorage.setItem('clutterguard-user', JSON.stringify(response.data));
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Customize your ClutterGuard experience</p>
      </motion.div>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Preferences</h3>
          <div className="space-y-4">
            {settings.map((setting) => {
              const Icon = setting.icon;
              return (
                <div key={setting.key} className="flex items-center justify-between gap-4 p-4 bg-dark-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Icon className="text-2xl text-neon-blue" />
                    <div>
                      <h4 className="font-medium text-white">{setting.title}</h4>
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    onClick={() => updateToggle(setting.key)}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${form[setting.key] ? 'bg-neon-blue' : 'bg-dark-700'}`}
                  >
                    <motion.span layout className="inline-block h-6 w-6 rounded-full bg-white" animate={{ x: form[setting.key] ? 34 : 2 }} />
                  </motion.button>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Account</h3>
          <div className="space-y-4">
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <input type="email" value={user?.email || ''} readOnly className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-neon-blue focus:outline-none" />
            </div>
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <label className="block text-sm font-medium text-gray-400 mb-2">Default Scan Directory</label>
              <input
                type="text"
                value={form.scan_directory}
                onChange={(e) => setForm(prev => ({ ...prev, scan_directory: e.target.value }))}
                placeholder="C:/Users/YourName/Downloads"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:border-neon-blue focus:outline-none"
              />
            </div>
            {message && <p className="text-sm text-gray-400">{message}</p>}
            <button onClick={saveSettings} disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card">
          <h3 className="text-lg font-semibold text-white mb-6">About</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>ClutterGuard v1.0.0</p>
            <p>(c) 2026 ClutterGuard. All rights reserved.</p>
            <p className="mt-4 text-xs">Built with React, Tailwind CSS, Framer Motion, FastAPI, and MongoDB.</p>
          </div>
        </motion.div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="w-full btn btn-danger flex items-center justify-center gap-2">
          <FiLogOut />
          Logout
        </motion.button>
      </div>
    </div>
  );
};

export default Settings;
