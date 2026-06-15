import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiFileText, FiCalendar, FiEye, FiRefreshCw } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getReports();
      setReports(response.data.reports || []);
      setReportHistory(response.data.report_history || []);
      setRawData(response.data.raw_data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No scan data available. Run a scan on the Dashboard first.');
      } else {
        setError('Failed to load reports. Backend may be offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (type) => {
    if (!rawData) return;
    
    let content = '';
    let filename = '';
    
    switch (type) {
      case 'storage':
        content = JSON.stringify(rawData.storage || {}, null, 2);
        filename = 'storage_report.json';
        break;
      case 'security':
        content = JSON.stringify(rawData.security || {}, null, 2);
        filename = 'security_report.json';
        break;
      case 'cleanup':
        content = JSON.stringify({
          recommendations: rawData.cleanup_recommendations || [],
          duplicates: rawData.duplicate_files || [],
          old_files: rawData.old_files || {},
        }, null, 2);
        filename = 'cleanup_report.json';
        break;
      default:
        content = JSON.stringify(rawData, null, 2);
        filename = 'full_report.json';
    }
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async (reportId) => {
    try {
      const response = await dashboardService.downloadReportPdf(reportId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clutterguard_report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      downloadReport('full');
    }
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Reports</h1>
          <p className="text-gray-400">View and download analysis reports</p>
        </motion.div>
        <div className="card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadReports} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Reports</h1>
        <p className="text-gray-400">View and download analysis reports</p>
      </motion.div>

      {/* Report Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, idx) => {
          const Icon = FiFileText;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="card group hover:shadow-xl hover:shadow-neon-blue/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className="text-3xl text-neon-blue" />
                <span className="badge badge-info">Latest</span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
              
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiCalendar size={16} />
                  {report.date}
                </div>
                <div className="text-gray-400">{report.items}</div>
                <div className="text-gray-500">{report.size}</div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => downloadReport(report.type)}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  <FiDownload size={16} />
                  Download
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Reports Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card mt-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Report History</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadReports}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw /> Refresh
          </motion.button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Report Type</th>
                <th>Generated</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reportHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500 py-4">
                    No reports available. Run a scan first.
                  </td>
                </tr>
              ) : (
                reportHistory.map((report, idx) => (
                  <tr key={idx}>
                    <td className="font-medium text-white">{report.title}</td>
                    <td className="text-gray-400">{report.date}</td>
                    <td>
                      <span className="badge badge-success">Ready</span>
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => report.id ? downloadPdf(report.id) : downloadReport(report.type)}
                        className="text-neon-blue hover:text-neon-cyan"
                      >
                        PDF
                      </motion.button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
