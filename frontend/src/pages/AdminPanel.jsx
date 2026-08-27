import React, { useState, useEffect } from 'react';
import { 
  FaUserShield, 
  FaHistory, 
  FaHeartbeat, 
  FaUserCog, 
  FaUserSlash, 
  FaCheckCircle,
  FaServer,
  FaShieldAlt
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { metricsAPI } from '../services/api';

const AdminPanel = () => {
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const userString = localStorage.getItem('user_profile');
  const currentUser = userString ? JSON.parse(userString) : { role: 'Bank Employee' };

  useEffect(() => {
    if (currentUser.role === 'Admin') {
      fetchAdminData();
    }
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const logData = await metricsAPI.logs();
      setLogs(logData);
      
      const healthData = await metricsAPI.health();
      setHealth(healthData);
    } catch (e) {
      console.warn("Could not retrieve administrative audit metrics.");
    } finally {
      setLoading(false);
    }
  };

  // Redirect block if user is not authorized
  if (currentUser.role !== 'Admin') {
    return (
      <div className="flex h-screen bg-navy-950 text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Navbar title="Administrative Controls" />
          <main className="p-8 flex items-center justify-center h-[calc(100vh-64px)]">
            <GlassCard hoverable={false} className="border-t-4 border-t-red-500 max-w-md text-center p-8 space-y-4">
              <FaShieldAlt className="text-red-500 text-4xl mx-auto animate-bounce" />
              <h3 className="text-lg font-bold font-display uppercase tracking-wider text-red-400">Access Denied</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You do not have administrative clearance to access this control node. 
                Audits have registered this interaction attempt.
              </p>
            </GlassCard>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="System & User Operations Node" />
        
        <main className="p-8 space-y-8">
          
          {/* Health Metrics */}
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <GlassCard hoverable={false} className="border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block flex items-center gap-1.5">
                  <FaHeartbeat className="text-emerald-500" />
                  <span>Central status</span>
                </span>
                <h4 className="text-xl font-bold font-display mt-1 text-emerald-400">{health.status}</h4>
              </GlassCard>

              <GlassCard hoverable={false} className="border-l-4 border-l-blue-500">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block flex items-center gap-1.5">
                  <FaServer className="text-blue-500" />
                  <span>Database Link</span>
                </span>
                <h4 className="text-xl font-bold font-display mt-1 text-slate-200">{health.database}</h4>
              </GlassCard>

              <GlassCard hoverable={false} className="border-l-4 border-l-cyan-500">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block flex items-center gap-1.5">
                  <FaServer className="text-cyan-500" />
                  <span>Redis cache</span>
                </span>
                <h4 className="text-xl font-bold font-display mt-1 text-slate-200">{health.redis}</h4>
              </GlassCard>

              <GlassCard hoverable={false} className="border-l-4 border-l-boi-saffron">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block flex items-center gap-1.5">
                  <FaHeartbeat className="text-boi-saffron" />
                  <span>ML Engine</span>
                </span>
                <h4 className="text-xl font-bold font-display mt-1 text-boi-saffron">{health.ml_engine}</h4>
              </GlassCard>
            </div>
          )}

          {/* Audit Logs Table */}
          <GlassCard title="Investigator Action Logs" subtitle="Internal audit trail of bank officer updates" hoverable={false}>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                    <th className="pb-3">Log ID</th>
                    <th className="pb-3">Officer Email</th>
                    <th className="pb-3">Mitigate Action</th>
                    <th className="pb-3">Object Target</th>
                    <th className="pb-3">Reference ID</th>
                    <th className="pb-3">IP Address</th>
                    <th className="pb-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-boi-saffron font-mono animate-pulse">
                        RETRIEVING AUDIT STREAM...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 font-mono">
                        No audit logs recorded.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/10">
                        <td className="py-3 font-mono text-slate-500 font-semibold">{log.id}</td>
                        <td className="py-3 font-semibold text-slate-200">{log.user_email}</td>
                        <td className="py-3 text-slate-300">{log.action}</td>
                        <td className="py-3 font-mono text-[10px] text-slate-500">{log.target_table || 'N/A'}</td>
                        <td className="py-3 font-mono text-slate-400">{log.record_id || 'N/A'}</td>
                        <td className="py-3 font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                        <td className="py-3 text-slate-500 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
