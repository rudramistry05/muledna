import React, { useState, useEffect } from 'react';
import { FaSearch, FaBell, FaSun, FaMoon, FaUserCircle, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import { alertsAPI, authAPI } from '../services/api';

import socket from '../services/socket';

const Navbar = ({ title }) => {
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const userString = localStorage.getItem('user_profile');
  const user = userString ? JSON.parse(userString) : { full_name: 'Amit Sharma', role: 'Bank Employee' };

  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 5000); // Check for fresh alarms every 5s

    // Request HTML5 notification permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Live WebSocket handlers
    const handleBrowserNotification = (data) => {
      fetchActiveAlerts();
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(data.title || "BOI Shield Intercept", {
          body: data.message || "A suspicious transaction has been paused for verification.",
        });
      }
    };

    socket.on('browser_notification', handleBrowserNotification);
    socket.on('alert_update', fetchActiveAlerts);

    return () => {
      clearInterval(interval);
      socket.off('browser_notification', handleBrowserNotification);
      socket.off('alert_update', fetchActiveAlerts);
    };
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      const data = await alertsAPI.active();
      setAlerts(data);
    } catch (e) {
      console.warn("Could not retrieve notification updates.");
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-navy-900/85 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Title & Organization Info */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold font-display text-slate-100">{title || "AML Hub"}</h2>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-navy-800 rounded-full border border-slate-700/50">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-slate-400 font-mono">BOI-MUM-NODE-A4</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden lg:flex items-center w-96 bg-slate-950/40 rounded-full border border-slate-800 px-4 py-1.5 focus-within:border-boi-saffron transition-all">
        <FaSearch className="text-slate-500 text-sm mr-3" />
        <input 
          type="text" 
          placeholder="Search suspects, account numbers, transactions, device UUIDs..."
          className="bg-transparent text-slate-300 text-xs w-full outline-none placeholder:text-slate-600"
        />
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-5">
        
        {/* Real-time Alerts Notification Center */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800/30 transition-colors relative"
          >
            <FaBell className="text-md" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-navy-900 animate-ping" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-panel border border-slate-800 rounded-xl shadow-glass-glow p-4 z-50">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300">Live Warning Signals</span>
                <span className="text-[10px] px-2 py-0.5 bg-red-950 text-red-400 font-bold rounded">
                  {alerts.length} Urgent
                </span>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-4 text-center">No active intercept alerts.</p>
                ) : (
                  alerts.map((a) => (
                    <div 
                      key={a.id} 
                      className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg flex items-start gap-2.5 hover:bg-red-950/30 transition-all cursor-pointer"
                      onClick={() => {
                        setShowNotifications(false);
                        window.location.href = '/victim-alerts';
                      }}
                    >
                      <FaShieldAlt className="text-red-500 text-sm mt-0.5 animate-bounce" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-200">Mule Activity Blocked</p>
                        <p className="text-[10px] text-slate-400">Victim: {a.victim_name}</p>
                        <span className="text-[9px] text-boi-saffron font-bold font-mono">
                          Challenge Countdown: {a.countdown_seconds}s
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card info */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-5">
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-200">{user.full_name}</span>
            <span className="block text-[9px] text-boi-saffron font-semibold font-mono tracking-wider">{user.role}</span>
          </div>
          <FaUserCircle className="text-2xl text-slate-500 border border-slate-800 rounded-full" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
