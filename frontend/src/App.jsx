import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import StorageAnalytics from './pages/StorageAnalytics';
import SecurityCenter from './pages/SecurityCenter';
import DuplicateFinder from './pages/DuplicateFinder';
import CleanupCenter from './pages/CleanupCenter';
import Reports from './pages/Reports';
import ScanHistory from './pages/ScanHistory';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import RecommendationsDetail from './pages/RecommendationsDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './context/AuthContext';
import './index.css';

function ProtectedRoute({ children }) {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) return <div className="min-h-screen bg-dark-950 p-8"><LoadingSpinner /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-dark-950">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-0">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/storage-analytics" element={<StorageAnalytics />} />
            <Route path="/security-center" element={<SecurityCenter />} />
            <Route path="/duplicate-finder" element={<DuplicateFinder />} />
            <Route path="/cleanup-center" element={<CleanupCenter />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/scan-history" element={<ScanHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cleanup-center/:category" element={<RecommendationsDetail />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Landing Page - No layout */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />

        {/* App routes with layout */}
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
