import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiShield, FiBarChart2 } from 'react-icons/fi';

const LandingPage = () => {
  const features = [
    {
      icon: FiBarChart2,
      title: 'Storage Analytics',
      description: 'Comprehensive file analysis and storage breakdown',
    },
    {
      icon: FiShield,
      title: 'Security Scanning',
      description: 'Detect threats and suspicious files instantly',
    },
    {
      icon: FiCheckCircle,
      title: 'Smart Cleanup',
      description: 'Find and remove duplicate files automatically',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 glass border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold">
              CG
            </div>
            <span className="text-xl font-bold text-white">ClutterGuard</span>
          </div>
          <Link to="/signup">
            <button className="btn btn-primary">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-purple bg-clip-text text-transparent">
              Analyze. Secure. Optimize.
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Smart File Analytics & Security Risk Assessment Platform
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary flex items-center gap-2"
                >
                  Analyze Files
                  <FiArrowRight />
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-secondary"
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  <Icon className="text-3xl text-neon-blue mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-dark-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to clean up your digital life?
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Join thousands of users who trust ClutterGuard for comprehensive file management
          </p>
          <Link to="/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
            >
              Start Free Analysis
            </motion.button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
