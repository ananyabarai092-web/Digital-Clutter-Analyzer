import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RiskAnalysisChart = ({ data }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card"
    >
      <h3 className="text-lg font-semibold text-white mb-6">Risk Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
          <Legend />
          <Bar dataKey="safe" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="suspicious" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          <Bar dataKey="duplicates" fill="#ec4899" radius={[8, 8, 0, 0]} />
          <Bar dataKey="old" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RiskAnalysisChart;
