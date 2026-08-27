import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEnvelope, FaLock, FaBuilding, FaUserCircle } from 'react-icons/fa';
import { authAPI } from '../services/api';
import GlassCard from '../components/GlassCard';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      // Stash email in sessionStorage for OTP phase verification
      sessionStorage.setItem('otp_verify_email', email);
      if (data.user?.otp_code) {
        sessionStorage.setItem('otp_code_bypass', data.user.otp_code);
      }
      
      // Redirect to OTP Challenge verification
      navigate('/otp-verification');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      
      {/* Decorative ambient lighting backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-boi-saffron/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-boi-blue/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* BOI Identity Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-boi-saffron rounded-2xl flex items-center justify-center font-bold text-navy-950 text-3xl font-display shadow-neon-saffron mx-auto mb-4">
            BOI
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 font-display uppercase">MuleDNA Gateway</h2>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Bank of India Fraud Control Panel</p>
        </div>

        <GlassCard className="border-t-4 border-t-boi-saffron shadow-glass-glow" hoverable={false}>
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <FaUserCircle className="text-boi-saffron" />
            <span>Staff Authentication</span>
          </h3>

          {/* Quick Demo Staff Credentials Selector */}
          <div className="mb-5 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px]">
            <div className="text-slate-400 font-mono font-semibold mb-1.5 flex items-center justify-between">
              <span>DEMO ACCESSIBLE ROLES</span>
              <span className="text-[10px] text-boi-saffron font-bold">Pass: password123</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => { setEmail('admin@boi.co.in'); setPassword('password123'); }}
                className="px-2 py-1 bg-slate-800/80 hover:bg-boi-saffron/20 border border-slate-700 hover:border-boi-saffron text-left rounded text-slate-300 transition-all flex flex-col"
              >
                <span className="font-bold text-boi-saffron text-[10px]">Admin</span>
                <span className="text-[9px] text-slate-400 truncate">admin@boi.co.in</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('analyst@boi.co.in'); setPassword('password123'); }}
                className="px-2 py-1 bg-slate-800/80 hover:bg-boi-saffron/20 border border-slate-700 hover:border-boi-saffron text-left rounded text-slate-300 transition-all flex flex-col"
              >
                <span className="font-bold text-sky-400 text-[10px]">Risk Analyst</span>
                <span className="text-[9px] text-slate-400 truncate">analyst@boi.co.in</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('investigator@boi.co.in'); setPassword('password123'); }}
                className="px-2 py-1 bg-slate-800/80 hover:bg-boi-saffron/20 border border-slate-700 hover:border-boi-saffron text-left rounded text-slate-300 transition-all flex flex-col"
              >
                <span className="font-bold text-emerald-400 text-[10px]">Investigator</span>
                <span className="text-[9px] text-slate-400 truncate">investigator@boi.co.in</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('clerk@boi.co.in'); setPassword('password123'); }}
                className="px-2 py-1 bg-slate-800/80 hover:bg-boi-saffron/20 border border-slate-700 hover:border-boi-saffron text-left rounded text-slate-300 transition-all flex flex-col"
              >
                <span className="font-bold text-amber-400 text-[10px]">Bank Employee</span>
                <span className="text-[9px] text-slate-400 truncate">clerk@boi.co.in</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 rounded-lg text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Official Email ID</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <input
                  type="email"
                  required
                  placeholder="name@boi.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Security Password</label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                />
              </div>
            </div>

            {/* Recovery options */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
                Select Branch: <strong className="text-boi-saffron font-semibold">HQ Mumbai</strong>
              </span>
              <Link to="/forgot-password" className="text-boi-saffron hover:underline font-semibold">
                Forgot Password?
              </Link>
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-700 text-navy-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Validating Security Signature...' : 'Request OTP Verification'}
            </button>
          </form>
          
          <div className="mt-6 text-center border-t border-slate-800/80 pt-4 text-xs text-slate-500">
            Authorized Banking Access Only.{" "}
            <Link to="/register" className="text-boi-saffron font-bold hover:underline">
              Request Credentials
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Login;
