import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-6">
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="card w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white">
            <FiShield size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-gray-400">Sign in to ClutterGuard</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
        <div className="relative mb-4">
          <FiMail className="absolute left-3 top-3 text-gray-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-neon-blue" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
        <div className="relative mb-6">
          <FiLock className="absolute left-3 top-3 text-gray-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-neon-blue" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        <p className="text-sm text-gray-400 text-center mt-6">
          New to ClutterGuard? <Link to="/signup" className="text-neon-blue">Create an account</Link>
        </p>
      </motion.form>
    </div>
  );
};

export default Login;
