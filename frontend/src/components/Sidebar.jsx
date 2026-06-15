import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu,
  FiX,
  FiHome,
  FiBarChart2,
  FiSearch,
  FiShield,
  FiTool,
  FiFileText,
  FiClock,
  FiSettings,
} from 'react-icons/fi';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const checkScreen = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/storage-analytics', icon: FiBarChart2, label: 'Storage Analytics' },
    { path: '/duplicate-finder', icon: FiSearch, label: 'Duplicate Finder' },
    { path: '/security-center', icon: FiShield, label: 'Security Center' },
    { path: '/cleanup-center', icon: FiTool, label: 'Cleanup Center' },
    { path: '/reports', icon: FiFileText, label: 'Reports' },
    { path: '/scan-history', icon: FiClock, label: 'Scan History' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-dark-800/80 backdrop-blur text-neon-blue hover:bg-dark-700 transition-colors"
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isDesktop ? 0 : (isOpen ? 0 : -320),
          opacity: isDesktop ? 1 : (isOpen ? 1 : 0),
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`${isDesktop ? 'relative' : 'fixed'} left-0 top-0 w-80 h-screen z-40 glass border-r border-dark-700 flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-8 py-6 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold">
                CG
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ClutterGuard</h2>
                <p className="text-xs text-gray-400">v1.0.0</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="indicator"
                        className="ml-auto w-2 h-2 rounded-full bg-neon-blue"
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-6 border-t border-dark-700">
            <button className="w-full btn btn-primary">
              Analyze Files
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
