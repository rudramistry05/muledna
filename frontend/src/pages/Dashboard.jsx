import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaExchangeAlt, 
  FaExclamationTriangle, 
  FaSnowflake, 
  FaShieldAlt, 
  FaPiggyBank, 
  FaBell 
} from 'react-icons/fa';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { metricsAPI, transactionsAPI } from '../services/api';

import socket from '../services/socket';

const COLORS = ['#FF9933', '#EF4444', '#06B6D4', '#10B981'];

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Set up Socket.IO listeners
    const handleNewTxn = (txn) => {
      setRecentTxns(prev => {
        if (prev.some(t => t.id === txn.id || t.transaction_reference === txn.transaction_reference)) {
          return prev;
        }
        return [txn, ...prev].slice(0, 5);
      });
    };

    const handleDashboardUpdate = (newKpis) => {
      setMetrics(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          kpis: { ...prev.kpis, ...newKpis }
        };
      });
    };

    socket.on('new_transaction', handleNewTxn);
    socket.on('dashboard_update', handleDashboardUpdate);

    return () => {
      socket.off('new_transaction', handleNewTxn);
      socket.off('dashboard_update', handleDashboardUpdate);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await metricsAPI.dashboard();
      setMetrics(data);
      const txData = await transactionsAPI.list({ size: 5 });
      setRecentTxns(txData.transactions);
    } catch (e) {
      console.warn("Could not retrieve dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex h-screen bg-navy-950 items-center justify-center">
        <div className="text-boi-saffron font-bold animate-pulse text-lg tracking-widest font-mono">
          LOADING BOI AML TERMINAL DATA...
        </div>
      </div>
    );
  }

  const kpis = metrics.kpis;
  const charts = metrics.charts;

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="Fraud Network Intelligence Command Centre" />
        
        <main className="p-8 space-y-8">
          {/* Headline Grid KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard hoverable={false} className="border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Total Accounts</span>
                  <h4 className="text-2xl font-bold font-display mt-1">{kpis.total_accounts}</h4>
                </div>
                <div className="p-2 bg-blue-950/40 rounded-lg border border-blue-900/35">
                  <FaUsers className="text-blue-400 text-lg" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="border-l-4 border-l-boi-saffron">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Today's Transactions</span>
                  <h4 className="text-2xl font-bold font-display mt-1">{kpis.today_transactions}</h4>
                </div>
                <div className="p-2 bg-boi-saffron/10 rounded-lg border border-boi-saffron/20">
                  <FaExchangeAlt className="text-boi-saffron text-lg" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="border-l-4 border-l-red-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Fraud Cases</span>
                  <h4 className="text-2xl font-bold font-display mt-1 text-red-400 neon-text-red">{kpis.total_cases}</h4>
                </div>
                <div className="p-2 bg-red-950/40 rounded-lg border border-red-900/35">
                  <FaExclamationTriangle className="text-red-400 text-lg" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="border-l-4 border-l-cyan-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Frozen Accounts</span>
                  <h4 className="text-2xl font-bold font-display mt-1 text-cyan-400">{kpis.frozen_accounts}</h4>
                </div>
                <div className="p-2 bg-cyan-950/40 rounded-lg border border-cyan-900/35">
                  <FaSnowflake className="text-cyan-400 text-lg" />
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard hoverable={false} className="border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Money Saved (INR)</span>
                  <h4 className="text-xl font-bold font-display mt-1 text-emerald-400">₹{kpis.money_saved.toLocaleString()}</h4>
                </div>
                <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-900/35">
                  <FaPiggyBank className="text-emerald-400 text-lg" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="border-l-4 border-l-violet-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">AI Accuracy</span>
                  <h4 className="text-xl font-bold font-display mt-1 text-violet-400">{kpis.ai_accuracy}%</h4>
                </div>
                <div className="p-2 bg-violet-950/40 rounded-lg border border-violet-900/35">
                  <FaShieldAlt className="text-violet-400 text-lg" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Active Alerts</span>
                  <h4 className="text-xl font-bold font-display mt-1 text-amber-400">{kpis.current_alerts}</h4>
                </div>
                <div className="p-2 bg-amber-950/40 rounded-lg border border-amber-900/35">
                  <FaBell className="text-amber-400 text-lg" />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Risk score timeline trend */}
            <GlassCard title="Ensemble Risk Scoring Trend" subtitle="Daily average risk indices of live transactions">
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.risk_score_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.3} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B192C', borderColor: 'rgba(255,255,255,0.06)' }} />
                    <Line type="monotone" dataKey="avg_risk" stroke="#FF9933" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Fraud cases per day */}
            <GlassCard title="Daily Fraud Escalations" subtitle="Number of accounts marked suspicious per day">
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.fraud_cases_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.3} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B192C', borderColor: 'rgba(255,255,255,0.06)' }} />
                    <Bar dataKey="cases" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Monthly Money saved vs loss */}
            <GlassCard title="Monthly Saving Integrity" subtitle="Mitigated funds vs successful fraud loss volume (INR)">
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthly_fraud}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.3} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B192C', borderColor: 'rgba(255,255,255,0.06)' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="saved" stroke="#10B981" fillOpacity={0.15} fill="url(#colorSaved)" name="Mitigated Volume" />
                    <Area type="monotone" dataKey="loss" stroke="#EF4444" fillOpacity={0.1} fill="url(#colorLoss)" name="Unchecked Leakage" />
                    
                    <defs>
                      <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Fraud Categories Pie */}
            <GlassCard title="Fraud Ring Distribution" subtitle="Proportion of flagged accounts by signature category">
              <div className="h-64 mt-2 flex items-center justify-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.fraud_types}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {charts.fraud_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0B192C', borderColor: 'rgba(255,255,255,0.06)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 pl-4 text-left space-y-2">
                  {charts.fraud_types.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-400 font-semibold">{entry.name}:</span>
                      <span className="font-bold text-slate-200 font-mono">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Recent Suspicious Transactions Table */}
          <GlassCard title="Intercept Logs (Most Recent)" subtitle="Live transaction tracking feed">
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                    <th className="pb-3">Reference ID</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">AI Risk</th>
                    <th className="pb-3">Verdict Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 font-mono text-slate-300 font-semibold">{t.transaction_reference}</td>
                      <td className="py-3.5 text-slate-400">{t.type}</td>
                      <td className="py-3.5 font-bold font-mono">₹{parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3.5 text-slate-500">{new Date(t.timestamp).toLocaleString()}</td>
                      <td className="py-3.5">
                        <span className={`font-mono font-bold ${t.risk_score >= 75 ? 'text-red-400' : t.risk_score >= 35 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {t.risk_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                          t.status === 'Suspicious' ? 'bg-red-950 text-red-400 border border-red-900/30 animate-pulse' :
                          'bg-slate-900 text-slate-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
