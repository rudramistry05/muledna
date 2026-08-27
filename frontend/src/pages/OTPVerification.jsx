import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import { authAPI } from '../services/api';
import GlassCard from '../components/GlassCard';

const OTPVerification = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [bypassOtp, setBypassOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cachedEmail = sessionStorage.getItem('otp_verify_email');
    if (!cachedEmail) {
      // Fallback redirect if email context is missing
      navigate('/login');
    } else {
      setEmail(cachedEmail);
      const bypass = sessionStorage.getItem('otp_code_bypass');
      if (bypass) {
        setBypassOtp(bypass);
      }
    }
  }, [navigate]);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Verify OTP
      await authAPI.verifyOtp(email, otpCode);
      
      const token = localStorage.getItem('access_token');
      if (token) {
        setSuccess('Verification successful! Authorizing session...');
        const profile = await authAPI.getMe();
        localStorage.setItem('user_profile', JSON.stringify(profile));
        
        sessionStorage.removeItem('otp_verify_email');
        sessionStorage.removeItem('otp_code_bypass');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setSuccess('OTP Verified successfully! Redirecting to login portal...');
        sessionStorage.removeItem('otp_verify_email');
        sessionStorage.removeItem('otp_code_bypass');
        
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP code. Verify entered code.');
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
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 font-display uppercase">Security Challenge</h2>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Multi-factor login authorization</p>
        </div>

        <GlassCard className="border-t-4 border-t-boi-saffron shadow-glass-glow" hoverable={false}>
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <FaShieldAlt className="text-boi-saffron animate-pulse" />
            <span>Enter OTP Code</span>
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

          {bypassOtp && (
            <div className="p-3 mb-4 bg-boi-saffron/10 border border-boi-saffron/30 rounded-lg text-xs font-semibold text-boi-saffron flex items-center justify-between">
              <span>Developer OTP Challenge: <strong>{bypassOtp}</strong></span>
              <button 
                type="button"
                onClick={() => setOtpCode(bypassOtp)}
                className="bg-boi-saffron text-navy-950 px-2 py-1 rounded text-[10px] hover:bg-boi-saffron/90 font-bold"
              >
                Autofill
              </button>
            </div>
          )}

          <div className="p-3 bg-navy-900 border border-slate-800 rounded-lg mb-5 text-[11px] text-slate-400 leading-relaxed">
            A temporary challenge token has been generated for: <strong className="text-slate-200 font-bold">{email}</strong>. 
            Check your terminal logs or Docker backend console logs to extract the generated OTP.
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Verification OTP</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-3 px-4 text-center font-mono font-bold text-base tracking-widest text-boi-saffron outline-none focus:border-boi-saffron transition-all"
                  maxLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-700 text-navy-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'Authorizing Login Signature...' : 'Confirm Login Token'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <button 
              onClick={() => navigate('/login')} 
              className="hover:text-slate-300 font-bold flex items-center gap-1"
            >
              <FaArrowLeft className="text-[10px]" />
              <span>Back to Portal login</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default OTPVerification;
