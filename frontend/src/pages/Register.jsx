import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaUserTag, FaFileMedical } from 'react-icons/fa';
import { authAPI } from '../services/api';
import GlassCard from '../components/GlassCard';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Bank Employee');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [registeredOtp, setRegisteredOtp] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRegisteredOtp('');
    setLoading(true);
    try {
      const data = await authAPI.register(email, password, fullName, role);
      sessionStorage.setItem('otp_verify_email', email);
      if (data.otp_code) {
        sessionStorage.setItem('otp_code_bypass', data.otp_code);
        setRegisteredOtp(data.otp_code);
      }
      setSuccess(`Staff account registered! Verification OTP code: ${data.otp_code || 'Sent to server'}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Staff registration failed. Please review values.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-boi-saffron/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-boi-blue/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-boi-saffron rounded-2xl flex items-center justify-center font-bold text-navy-950 text-3xl font-display shadow-neon-saffron mx-auto mb-4">
            BOI
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 font-display uppercase">Staff Registration</h2>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Bank of India AML Node Onboarding</p>
        </div>

        <GlassCard className="border-t-4 border-t-boi-saffron shadow-glass-glow" hoverable={false}>
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <FaFileMedical className="text-boi-saffron" />
            <span>Create Staff Profile</span>
          </h3>

          {error && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 rounded-lg text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs font-semibold text-emerald-400 space-y-2">
              <div>{success}</div>
              {registeredOtp && (
                <button
                  type="button"
                  onClick={() => navigate('/otp-verification')}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded text-xs transition-all uppercase tracking-wider shadow"
                >
                  Proceed to OTP Verification →
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Full Name</label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <input
                  type="text"
                  required
                  placeholder="Officer name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Official Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <input
                  type="email"
                  required
                  placeholder="officer@boi.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Staff Role Mapping</label>
              <div className="relative">
                <FaUserTag className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all appearance-none cursor-pointer"
                >
                  <option value="Bank Employee">Bank Employee (Clerk/Cashier)</option>
                  <option value="Risk Analyst">Risk Analyst (AI Telemetry)</option>
                  <option value="Investigator">AML Investigator (SAR Report/Graph)</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>
            </div>

            {/* Register submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-700 text-navy-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Submitting Registration...' : 'Register Profile'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-800/80 pt-4 text-xs text-slate-500">
            Back to{" "}
            <Link to="/login" className="text-boi-saffron font-bold hover:underline">
              Staff Portal
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Register;
