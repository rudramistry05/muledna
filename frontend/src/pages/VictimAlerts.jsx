import React, { useState, useEffect } from 'react';
import { 
  FaExclamationTriangle, 
  FaPhoneAlt, 
  FaCommentDots, 
  FaMobileAlt, 
  FaShieldAlt, 
  FaCheck, 
  FaTimes, 
  FaVolumeUp,
  FaBell
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { alertsAPI, transactionsAPI } from '../services/api';

const VictimAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const [voiceCallState, setVoiceCallState] = useState('idle'); // idle, calling, active, finished
  const [voiceScript, setVoiceScript] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [targetPhone, setTargetPhone] = useState('+919876543210');
  const [customMsg, setCustomMsg] = useState('ALERT: Bank of India Fraud Control Panel has detected high-risk activity on your profile. Please verify immediately.');
  const [sendingDirect, setSendingDirect] = useState(false);
  const [directFeedback, setDirectFeedback] = useState(null);

  const handleSendDirectAlert = async (type = 'SMS') => {
    if (!targetPhone) return;
    setSendingDirect(true);
    setDirectFeedback(null);
    try {
      const res = await alertsAPI.sendDirectSms(targetPhone, customMsg, type);
      const isWarning = res.status === 'Warning' || res.dispatch_status?.includes('Fallback');
      setDirectFeedback({
        type: isWarning ? 'warning' : 'success',
        msg: `${res.dispatch_status}${res.twilio_sid ? ' (SID: ' + res.twilio_sid + ')' : ''}`
      });
      fetchAlerts();
    } catch (err) {
      setDirectFeedback({
        type: 'error',
        msg: err.response?.data?.detail || 'Failed to dispatch phone alert.'
      });
    } finally {
      setSendingDirect(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!selectedAlert || selectedAlert.status !== 'Sent') return;

    setCountdown(selectedAlert.countdown_seconds);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoEscalate();
          return 0;
        }
        // Update local countdown values
        alertsAPI.update(selectedAlert.id, { countdown_seconds: prev - 1 });
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedAlert]);

  const fetchAlerts = async () => {
    try {
      const data = await alertsAPI.list();
      setAlerts(data);
      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }
    } catch (e) {
      console.warn("Could not retrieve alerts index.");
    }
  };

  const handleSelectAlert = (alert) => {
    setSelectedAlert(alert);
    setVoiceCallState('idle');
    setVoiceScript('');
    setActionMsg('');
  };

  const handleAutoEscalate = async () => {
    if (!selectedAlert) return;
    try {
      // Set to Blocked (standard safety fallback if user fails challenge)
      await transactionsAPI.block(selectedAlert.transaction_id);
      await alertsAPI.update(selectedAlert.id, { status: "Escalated", countdown_seconds: 0 });
      setActionMsg("WARNING: Time limit exceeded. Transaction blocked automatically and source account frozen.");
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    if (!selectedAlert) return;
    try {
      await transactionsAPI.approve(selectedAlert.transaction_id);
      await alertsAPI.update(selectedAlert.id, { status: "Acknowledged", countdown_seconds: 0 });
      setActionMsg("Override success. Suspect transfer has been authorized and executed.");
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlock = async () => {
    if (!selectedAlert) return;
    try {
      await transactionsAPI.block(selectedAlert.transaction_id);
      await alertsAPI.update(selectedAlert.id, { status: "Blocked", countdown_seconds: 0 });
      setActionMsg("Security action successful. Funds intercepted in mid-air. Recipient mule frozen.");
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerVoice = async () => {
    if (!selectedAlert) return;
    setVoiceCallState('calling');
    try {
      const res = await alertsAPI.triggerVoice(selectedAlert.id);
      setVoiceScript(res.script);
      setTimeout(() => {
        setVoiceCallState('active');
      }, 2000);
    } catch (err) {
      console.error(err);
      setVoiceCallState('idle');
    }
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="Live Fraud Intercept Dispatch" />
        
        <main className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Column 1: Alerts list */}
          <div className="xl:col-span-1 space-y-6">
            <GlassCard title="Active Interceptions" subtitle="Real-time warning relays dispatched" hoverable={false}>
              <div className="space-y-2 max-h-[550px] overflow-y-auto mt-2 pr-1">
                {alerts.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 font-mono text-xs">No notifications sent.</p>
                ) : (
                  alerts.map((al) => (
                    <div
                      key={al.id}
                      onClick={() => handleSelectAlert(al)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        selectedAlert?.id === al.id
                          ? 'bg-red-950/20 border-red-500 shadow-glass-glow'
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-xs text-slate-200">{al.victim_name}</p>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{al.victim_phone}</span>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          al.status === 'Sent' ? 'bg-red-950 text-red-400 border border-red-900/30 animate-pulse' :
                          al.status === 'Acknowledged' ? 'bg-emerald-950 text-emerald-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {al.status}
                        </span>
                        {al.status === 'Sent' && al.countdown_seconds > 0 && (
                          <span className="text-[10px] font-bold font-mono text-boi-saffron mt-1">
                            {al.countdown_seconds}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Direct Phone Number Intercept Dispatcher */}
            <GlassCard title="Twilio Live Phone Dispatcher" subtitle="Send real-time SMS/Voice call by phone number" hoverable={false}>
              <div className="space-y-3 mt-2 text-left">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1">Target Phone Number</label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded py-2 px-3 text-xs font-mono text-boi-saffron outline-none focus:border-boi-saffron transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1">Alert Message Text</label>
                  <textarea
                    rows={2}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded py-1.5 px-3 text-xs font-mono text-slate-300 outline-none focus:border-boi-saffron transition-all resize-none"
                  />
                </div>

                {directFeedback && (
                  <div className={`p-2 rounded text-[10px] font-mono font-bold ${
                    directFeedback.type === 'success' ? 'bg-emerald-950/40 border border-emerald-900 text-emerald-400' :
                    directFeedback.type === 'warning' ? 'bg-amber-950/40 border border-amber-900 text-amber-400' :
                    'bg-red-950/40 border border-red-900 text-red-400'
                  }`}>
                    {directFeedback.msg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={sendingDirect || !targetPhone}
                    onClick={() => handleSendDirectAlert('SMS')}
                    className="bg-boi-saffron hover:bg-boi-saffron/90 disabled:bg-slate-800 text-navy-950 font-bold text-[10px] py-2.5 px-2 rounded uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-neon-saffron"
                  >
                    <FaCommentDots className="text-xs" />
                    <span>{sendingDirect ? 'Sending...' : 'Send Live SMS'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={sendingDirect || !targetPhone}
                    onClick={() => handleSendDirectAlert('Voice')}
                    className="bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-navy-950 font-bold text-[10px] py-2.5 px-2 rounded uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow"
                  >
                    <FaPhoneAlt className="text-xs" />
                    <span>{sendingDirect ? 'Dialing...' : 'Live Voice Call'}</span>
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Column 2 & 3: Selected Alert Control */}
          <div className="xl:col-span-2 space-y-6">
            {selectedAlert ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left: Alerts info & call triggers */}
                <div className="lg:col-span-3 space-y-6">
                  <GlassCard title="Security Intercept Dashboard" hoverable={false}>
                    <div className="space-y-4 text-left">
                      
                      {/* Active Countdown block */}
                      {selectedAlert.status === 'Sent' && (
                        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-center space-y-1">
                          <h4 className="text-3xl font-extrabold font-mono text-red-400 neon-text-red">
                            {countdown}s
                          </h4>
                          <span className="text-[10px] uppercase font-mono text-red-300 font-bold tracking-widest block">
                            Victim Response Window
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                            If no action is recorded before the countdown reaches zero, the transaction will auto-escalate to Blocked and suspect accounts frozen.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Victim Account Name</span>
                          <strong className="text-slate-200">{selectedAlert.victim_name}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">SMS Number</span>
                          <strong className="text-slate-200 font-mono">{selectedAlert.victim_phone}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Transfer Volume</span>
                          <strong className="text-slate-200 font-mono">₹{parseFloat(selectedAlert.transaction?.amount || 150000).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">Target Account</span>
                          <strong className="text-slate-200 font-mono">{selectedAlert.transaction?.destination_account?.account_number || 'BOI0099887766'}</strong>
                        </div>
                      </div>

                      {actionMsg && (
                        <div className="p-3 bg-cyan-950/40 border border-cyan-900/50 text-cyan-300 rounded-lg text-xs font-semibold">
                          {actionMsg}
                        </div>
                      )}

                      {/* Control buttons */}
                      {selectedAlert.status === 'Sent' && (
                        <div className="flex gap-3 pt-3">
                          <button
                            onClick={handleBlock}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-neon-red"
                          >
                            <FaTimes />
                            <span>Block Transfer</span>
                          </button>
                          <button
                            onClick={handleApprove}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-neon-emerald"
                          >
                            <FaCheck />
                            <span>Authorize Override</span>
                          </button>
                        </div>
                      )}

                    </div>
                  </GlassCard>

                  {/* Voice Simulator */}
                  <GlassCard title="Automated Voice Call Simulation" subtitle="Warns victim via voice dialer" hoverable={false}>
                    <div className="space-y-4 text-left">
                      {voiceCallState === 'idle' && (
                        <button
                          onClick={handleTriggerVoice}
                          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 uppercase transition-all"
                        >
                          <FaPhoneAlt className="text-boi-saffron" />
                          <span>Initiate Warning Call</span>
                        </button>
                      )}

                      {voiceCallState === 'calling' && (
                        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-center space-y-3">
                          <div className="w-12 h-12 bg-boi-saffron/10 border border-boi-saffron rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <FaPhoneAlt className="text-boi-saffron animate-bounce" />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-300 block">DIALING VICTIM HANDSET...</span>
                        </div>
                      )}

                      {voiceCallState === 'active' && (
                        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
                            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
                              <FaVolumeUp />
                              <span>CALL ACTIVE (15s)</span>
                            </span>
                            <button 
                              onClick={() => setVoiceCallState('idle')}
                              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold font-mono"
                            >
                              DISCONNECT
                            </button>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 italic">"{voiceScript}"</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* Right: Phone Mock Frame for Twilio / Push simulations */}
                <div className="lg:col-span-2 space-y-6 flex justify-center">
                  <div className="w-60 h-[480px] bg-slate-950 border-[6px] border-slate-800 rounded-[30px] p-4 flex flex-col justify-between shadow-glass-glow relative overflow-hidden">
                    {/* Speaker camera bar */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full" />
                    
                    {/* Status Top bar */}
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 mt-2 px-1">
                      <span>BOI Network</span>
                      <span>10:14 PM</span>
                    </div>

                    {/* Messages/Notification display */}
                    <div className="flex-1 flex flex-col justify-center gap-4">
                      {/* Push Notification Panel */}
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 bg-boi-saffron rounded flex items-center justify-center font-bold text-[8px] text-navy-950">B</div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">BOI Shield</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-200">Suspicious Transfer Suspended</p>
                        <p className="text-[8px] text-slate-500 leading-tight">Verify payment details via security panel.</p>
                      </div>

                      {/* SMS Notification Frame */}
                      <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl text-left space-y-1.5">
                        <span className="text-[8px] text-slate-500 block font-mono">FROM: BOI-SECURE</span>
                        <p className="text-[9px] text-slate-300 leading-normal">
                          ALERT: Suspect transfer of ₹{(selectedAlert.transaction?.amount || 150000).toLocaleString()} detected. If not you, press here:
                        </p>
                        <button 
                          onClick={handleBlock}
                          className="w-full bg-red-500/80 hover:bg-red-500 text-slate-950 font-bold text-[9px] py-1.5 rounded uppercase tracking-wider transition-colors"
                        >
                          FREEZE NOW
                        </button>
                      </div>
                    </div>

                    {/* Home button notch */}
                    <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mt-2" />
                  </div>
                </div>

              </div>
            ) : (
              <GlassCard className="flex items-center justify-center py-24" hoverable={false}>
                <p className="text-slate-500 font-mono text-xs">Select an active warning signal from the left list to initiate safety overrides.</p>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VictimAlerts;
