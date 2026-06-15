import axios from 'axios';

// In production (Vercel), use the Render backend URL
// In development, use localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minute timeout for scans
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clutterguard-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (payload) => api.post('/register', payload),
  login: (payload) => api.post('/login', payload),
  profile: () => api.get('/profile'),
  updateSettings: (payload) => api.put('/settings', payload),
};

export const dashboardService = {
  // Health check
  getHealth: () => api.get('/health'),

  // Dashboard - get all dashboard data
  getDashboard: () => api.get('/dashboard'),

  // Scan - start a new scan
  startScan: (path) => api.post('/scan', { path }),

  // Scan progress polling
  getScanProgress: (scanId) => api.get(`/scan/progress/${scanId}`),

  // Duplicates - get duplicate files
  getDuplicates: () => api.get('/duplicates'),

  // Security - get security analysis
  getSecurity: () => api.get('/security'),

  // Cleanup - get cleanup suggestions
  getCleanup: () => api.get('/cleanup'),

  // Reports - get reports data
  getReports: () => api.get('/reports'),
  downloadReportPdf: (reportId) => api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' }),

  // Scan History
  getScanHistory: () => api.get('/scan-history'),

  // Analytics and notifications
  getAnalytics: () => api.get('/analytics'),
  getNotifications: () => api.get('/notifications'),
  markNotificationsRead: () => api.post('/notifications/read'),
  quarantineFile: (path) => api.post('/quarantine', { path }),

  // Cleanup Detail endpoints
  getOldFilesDetail: (minAgeDays = 90) => api.get(`/cleanup/old-files?min_age_days=${minAgeDays}`),
  getLargeFilesDetail: (minSizeMb = 100) => api.get(`/cleanup/large-files?min_size_mb=${minSizeMb}`),
  getSecurityFilesDetail: () => api.get('/cleanup/security-files'),

  // File Operations
  openFile: (filePath) => api.post('/files/open', { path: filePath }),
  deleteFile: (filePath) => api.delete('/files/delete', { data: { path: filePath } }),
  bulkDeleteFiles: (filePaths) => api.post('/files/bulk-delete', { paths: filePaths }),
  moveFile: (sourcePath, destinationFolder) => api.post('/files/move', {
    source_path: sourcePath,
    destination_folder: destinationFolder,
  }),
  bulkMoveFiles: (filePaths, destinationFolder) => api.post('/files/bulk-move', {
    paths: filePaths,
    destination_folder: destinationFolder,
  }),

  // Storage Growth Analytics
  getStorageGrowthHistory: (days = 90, interval = 'day') =>
    api.get(`/storage-growth/history?days=${days}&interval=${interval}`),
  getLatestStorageSnapshot: () => api.get('/storage-growth/latest'),

  // Legacy endpoints
  getSummary: () => api.get('/dashboard'),
  getStorage: () => api.get('/dashboard'),
  getCleanupRecommendations: () => api.get('/dashboard'),
};

export default api;