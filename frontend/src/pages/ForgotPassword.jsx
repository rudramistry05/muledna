import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEnvelope, FaLock, FaKey, FaShieldAlt } from 'react-icons/fa';
import { authAPI } from '../services/api';
import GlassCard from '../components/GlassCard';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSuccess('Reset OTP dispatched. Check console log output.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed. Verify email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authAPI.resetPassword(email, otpCode, newPassword);
      setSuccess('Password updated successfully. Redirecting...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Verify OTP code.');
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
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 font-display uppercase">Password Recovery</h2>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Reset authorization credentials</p>
        </div>

        <GlassCard className="border-t-4 border-t-boi-saffron shadow-glass-glow" hoverable={false}>
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <FaKey className="text-boi-saffron" />
            <span>{step === 1 ? 'Request Recovery Token' : 'Set New Password'}</span>
          </h3>

          {error && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-900/50 rounded-lg text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs font-semibold text-emerald-400">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-700 text-navy-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron flex items-center justify-center gap-2 mt-4"
              >
                {loading ? 'Dispatched Request...' : 'Send Recovery OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Reset Token (OTP)</label>
                <div className="relative">
                  <FaShieldAlt className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                  <input
                    type="text"
                    required
                    placeholder="6-digit OTP code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">New Security Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3.5 top-3.5 text-slate-500 text-sm" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-700 text-navy-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron flex items-center justify-center gap-2 mt-4"
              >
                {loading ? 'Updating Credentials...' : 'Reset Security Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-slate-800/80 pt-4 text-xs text-slate-500">
            Cancel and return to{" "}
            <Link to="/login" className="text-boi-saffron font-bold hover:underline">
              Staff Portal
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
