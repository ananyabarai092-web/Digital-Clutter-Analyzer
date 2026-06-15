import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiEye, FiCopy, FiZap } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { dashboardService } from '../services/api';

const SecurityCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSecurity = async () => {
      try {
        const response = await dashboardService.getSecurity();
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSecurity();
  }, []);

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;
  if (!data) return <div className="p-8 text-red-400">No data available</div>;

  const securityMetrics = [
    {
      icon: FiCheckCircle,
      label: 'Security Score',
      value: `${data.security_score || 0}/100`,
      subtitle: 'Overall system health',
      color: data.security_score > 70 ? 'green' : data.security_score > 40 ? 'yellow' : 'red',
    },
    {
      icon: FiAlertTriangle,
      label: 'Suspicious Files',
      value: data.suspicious_files || 0,
      subtitle: 'Potential threats detected',
      color: 'red',
    },
    {
      icon: FiEye,
      label: 'Hidden Executables',
      value: data.hidden_executables || 0,
      subtitle: 'Concealed programs found',
      color: 'purple',
    },
    {
      icon: FiCopy,
      label: 'Duplicate Executables',
      value: data.duplicate_executables || 0,
      subtitle: 'Repeated program files',
      color: 'orange',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Security Center</h1>
        <p className="text-gray-400">Real-time security monitoring and threat detection</p>
      </motion.div>

      {/* Security Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {securityMetrics.map((metric, idx) => (
          <StatCard
            key={idx}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            subtitle={metric.subtitle}
            color={metric.color}
          />
        ))}
      </div>

      {/* Risk Level Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Risk Level</h3>
            <p className="text-gray-400 text-sm">Overall system safety assessment</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold mb-2 ${
              data.risk_status === 'LOW RISK' ? 'text-green-400' :
              data.risk_status === 'MEDIUM RISK' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {data.risk_status}
            </div>
            <p className="text-sm text-gray-400">{data.malware_flags || 0} alerts</p>
          </div>
        </div>
      </motion.div>

      {/* Threat Details */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Detailed Threat Analysis</h3>
        
        <div className="space-y-6">
          {/* Suspicious Names */}
          {data.details?.suspicious_names && data.details.suspicious_names.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <FiAlertTriangle className="text-yellow-400" />
                Suspicious Files
              </h4>
              <div className="grid gap-2">
                {data.details.suspicious_names.slice(0, 5).map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg border border-yellow-500/20">
                    <span className="text-yellow-300">{name}</span>
                    <span className="badge badge-warning">Review</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Malware Names */}
          {data.details?.malware_names && data.details.malware_names.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <FiZap className="text-red-400" />
                Flagged Files
              </h4>
              <div className="grid gap-2">
                {data.details.malware_names.slice(0, 5).map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg border border-red-500/20">
                    <span className="text-red-300">{name}</span>
                    <span className="badge badge-danger">Quarantine</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SecurityCenter;
