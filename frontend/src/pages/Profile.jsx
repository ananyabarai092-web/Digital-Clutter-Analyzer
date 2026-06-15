import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiMonitor, FiServer, FiUser, FiMail, FiSmartphone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState({
    name: 'User',
    username: 'clutterguard_user',
    email: 'user@clutterguard.local',
    device: '',
    os: '',
  });

  useEffect(() => {
    setUserInfo(prev => ({
      ...prev,
      name: user?.full_name || 'User',
      username: user?.email?.split('@')[0] || 'clutterguard_user',
      email: user?.email || 'user@clutterguard.local',
      device: navigator.platform || 'Windows PC',
      os: (() => {
        const ua = navigator.userAgent;
        if (ua.includes('Windows NT 10.0')) return 'Windows 11';
        if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
        if (ua.includes('Windows NT 6.1')) return 'Windows 7';
        if (ua.includes('Mac OS X')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        return navigator.platform || 'Unknown';
      })(),
    }));
  }, [user]);

  const initials = userInfo.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors cursor-pointer"
      >
        <FiArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Dashboard</span>
      </motion.button>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 via-neon-purple/5 to-transparent" />

        {/* Glass card */}
        <div className="relative card backdrop-blur-xl">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-neon-blue/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-neon-purple/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Profile header */}
            <div className="flex flex-col items-center mb-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="relative"
              >
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink blur-xl opacity-50 animate-pulse-glow" />
                {/* Avatar */}
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-neon-blue/30">
                  {initials}
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white mt-6"
              >
                {userInfo.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-gray-400 mt-1"
              >
                @{userInfo.username}
              </motion.p>
            </div>

            {/* Info cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {[
                { icon: FiUser, label: 'Full Name', value: userInfo.name },
                { icon: FiServer, label: 'Username', value: `@${userInfo.username}` },
                { icon: FiMail, label: 'Email Address', value: userInfo.email },
                { icon: FiMonitor, label: 'Device Name', value: userInfo.device },
                { icon: FiSmartphone, label: 'Operating System', value: userInfo.os },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/50 backdrop-blur-sm border border-dark-700/50 hover:border-neon-blue/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center flex-shrink-0 group-hover:bg-neon-blue/20 transition-colors">
                    <item.icon className="text-neon-blue" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm text-white font-medium truncate mt-0.5">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom decorative text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center mt-8"
            >
              <p className="text-xs text-gray-500">ClutterGuard v1.0.0</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
