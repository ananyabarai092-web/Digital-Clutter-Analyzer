import { motion } from 'framer-motion';

const StatCard = ({ icon: Icon, label, value, subtitle, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-neon-blue/20 to-neon-blue/5 border-neon-blue/30',
    purple: 'from-neon-purple/20 to-neon-purple/5 border-neon-purple/30',
    cyan: 'from-neon-cyan/20 to-neon-cyan/5 border-neon-cyan/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
  };

  const iconColors = {
    blue: 'text-neon-blue bg-neon-blue/20',
    purple: 'text-neon-purple bg-neon-purple/20',
    cyan: 'text-neon-cyan bg-neon-cyan/20',
    green: 'text-green-400 bg-green-500/20',
    red: 'text-red-400 bg-red-500/20',
    orange: 'text-orange-400 bg-orange-500/20',
  };

  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`card bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} border cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${iconColors[color] || iconColors.blue}`}>
          <Icon className="text-2xl" />
        </div>
        {trend !== undefined && (
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{label}</h3>
      <p className="text-3xl font-bold text-white mb-2">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </motion.div>
  );
};

export default StatCard;