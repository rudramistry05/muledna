import React, { useState } from 'react';
import { FaCog, FaCheckCircle, FaSlidersH, FaBell, FaInfoCircle } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';

const Settings = () => {
  const [branch, setBranch] = useState('Mumbai Main Branch');
  const [freezeThreshold, setFreezeThreshold] = useState(85);
  const [smsNotification, setSmsNotification] = useState(true);
  const [voiceCallSim, setVoiceCallSim] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaveMsg('');
    // Store variables locally
    localStorage.setItem('boi_branch_settings', branch);
    localStorage.setItem('boi_freeze_threshold', freezeThreshold.toString());
    setSaveMsg('AML configurations successfully updated.');
    setTimeout(() => {
      setSaveMsg('');
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="AML Regional Settings" />
        
        <main className="p-8 max-w-4xl space-y-6">
          <GlassCard title="Bank of India Node Configuration" hoverable={false} className="border-t-4 border-t-boi-saffron">
            
            {saveMsg && (
              <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <FaCheckCircle />
                <span>{saveMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
              
              {/* Branch settings */}
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Default Branch Node</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all appearance-none cursor-pointer"
                >
                  <option value="Mumbai Main Branch">Mumbai Main Branch (Nariman Point)</option>
                  <option value="Pune Main Branch">Pune Main Branch (Deccan Gymkhana)</option>
                  <option value="Delhi Main Branch">Delhi Main Branch (Connaught Place)</option>
                  <option value="Bengaluru Main Branch">Bengaluru Main Branch (MG Road)</option>
                  <option value="Kolkata Main Branch">Kolkata Main Branch (Salt Lake)</option>
                </select>
              </div>

              {/* Autolock sliders */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                    <FaSlidersH />
                    <span>Auto-Freeze Threat Threshold ({freezeThreshold}%)</span>
                  </label>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={freezeThreshold}
                  onChange={(e) => setFreezeThreshold(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-boi-saffron focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                  Transactions scoring above this percentage will automatically freeze the suspect and beneficiary accounts immediately.
                </span>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                  <FaBell />
                  <span>Real-time Warning Channels</span>
                </label>

                <div className="flex items-center justify-between text-xs py-1">
                  <div className="text-left">
                    <span className="block font-bold text-slate-200">Twilio SMS Dispatches</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Dispatches warnings to victim handsets</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsNotification}
                    onChange={(e) => setSmsNotification(e.target.checked)}
                    className="w-4 h-4 accent-boi-saffron cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <div className="text-left">
                    <span className="block font-bold text-slate-200">Voice Dialer Simulations</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Trigger automated voice callbacks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceCallSim}
                    onChange={(e) => setVoiceCallSim(e.target.checked)}
                    className="w-4 h-4 accent-boi-saffron cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-navy-900 border border-slate-800 rounded-lg text-[10px] text-slate-400 leading-relaxed flex gap-2">
                <FaInfoCircle className="text-boi-saffron text-base flex-shrink-0" />
                <span>
                  Adjusting threat sliders will update real-time transaction filter hooks. Settings apply instantly to intercept queries across branches.
                </span>
              </div>

              <button
                type="submit"
                className="bg-boi-saffron hover:bg-boi-saffron/90 text-navy-950 font-bold text-xs py-2.5 px-6 rounded-lg uppercase tracking-wider transition-all shadow-neon-saffron"
              >
                Save Settings
              </button>

            </form>
          </GlassCard>
        </main>
      </div>
    </div>
  );
};

export default Settings;
