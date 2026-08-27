import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaSnowflake, 
  FaUserSlash, 
  FaShieldAlt, 
  FaMapMarkerAlt, 
  FaLaptop, 
  FaExchangeAlt, 
  FaCheckCircle,
  FaFileMedical
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import RiskGauge from '../components/RiskGauge';
import { accountsAPI, transactionsAPI, reportsAPI } from '../services/api';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [accTxns, setAccTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freezeMsg, setFreezeMsg] = useState('');
  
  // Investigation Form State
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseSeverity, setCaseSeverity] = useState('Medium');
  const [caseSummary, setCaseSummary] = useState('');
  const [caseSuccess, setCaseSuccess] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountsAPI.list();
      setAccounts(data);
      if (data.length > 0 && !selectedAcc) {
        handleSelectAccount(data[0]);
      }
    } catch (e) {
      console.warn("Could not retrieve account list.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAcc(account);
    setFreezeMsg('');
    setShowCaseForm(false);
    setCaseSuccess('');
    try {
      // Query transactions where this account is source or destination
      // Using transactionsAPI.list with search filter as account number
      const txData = await transactionsAPI.list({ search: account.account_number, size: 50 });
      setAccTxns(txData.transactions);
    } catch (err) {
      console.warn("Could not retrieve account transactions.");
    }
  };

  const handleFreeze = async () => {
    if (!selectedAcc) return;
    try {
      const res = await accountsAPI.freeze(selectedAcc.id);
      setFreezeMsg(res.message);
      
      // Refresh list
      const freshAccounts = await accountsAPI.list();
      setAccounts(freshAccounts);
      const updated = freshAccounts.find(a => a.id === selectedAcc.id);
      if (updated) {
        setSelectedAcc(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setCaseSuccess('');
    try {
      await reportsAPI.createCase({
        title: caseTitle,
        severity: caseSeverity,
        summary: caseSummary,
        account_id: selectedAcc.id
      });
      setCaseSuccess('Investigation case successfully opened!');
      setCaseTitle('');
      setCaseSummary('');
      setTimeout(() => {
        setShowCaseForm(false);
        setCaseSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="AML Account Intelligence Hub" />
        
        <main className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Column 1: Accounts List */}
          <div className="xl:col-span-1 space-y-6">
            <GlassCard title="Bank of India Accounts" subtitle="Sorted by highest risk index" hoverable={false}>
              <div className="space-y-2 max-h-[600px] overflow-y-auto mt-2 pr-1">
                {loading ? (
                  <p className="text-center py-8 text-boi-saffron font-bold animate-pulse font-mono text-xs">
                    RETRIEVING ACCOUNTS INDEX...
                  </p>
                ) : accounts.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 font-mono text-xs">No accounts mapped.</p>
                ) : (
                  accounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        selectedAcc?.id === acc.id
                          ? 'bg-boi-saffron/10 border-boi-saffron shadow-glass-glow'
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-xs text-slate-200">{acc.customer_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{acc.account_number}</p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-xs font-bold font-mono ${
                          acc.risk_score >= 75 ? 'text-red-400' : acc.risk_score >= 35 ? 'text-orange-400' : 'text-emerald-400'
                        }`}>
                          {acc.risk_score.toFixed(0)}%
                        </span>
                        <span className={`block text-[8px] font-bold uppercase mt-0.5 ${
                          acc.status === 'Frozen' ? 'text-cyan-400' : 'text-slate-500'
                        }`}>
                          {acc.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Column 2 & 3: Selected Account Details */}
          <div className="xl:col-span-2 space-y-6">
            {selectedAcc ? (
              <>
                {/* Header Information panel */}
                <GlassCard hoverable={false} className="border-t-4 border-t-boi-saffron">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left: Metadata */}
                    <div className="text-left space-y-1.5 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          selectedAcc.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                          selectedAcc.status === 'Frozen' ? 'bg-red-950 text-red-400 border border-red-900/30 animate-pulse' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          Account Status: {selectedAcc.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold font-display text-slate-100">{selectedAcc.customer_name}</h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Account No: <strong className="text-slate-200">{selectedAcc.account_number}</strong> | 
                        Routing: <strong className="text-slate-200">{selectedAcc.routing_number || 'N/A'}</strong>
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        Branch: <strong className="text-slate-200">{selectedAcc.home_branch || 'Mumbai Main Branch'}</strong> | 
                        Phone: <strong className="text-slate-200">{selectedAcc.phone_number || 'N/A'}</strong>
                      </p>
                      <div className="pt-2 text-slate-200 font-mono text-base font-bold">
                        Balance: ₹{parseFloat(selectedAcc.balance).toLocaleString()}
                      </div>
                    </div>

                    {/* Middle: Risk Gauge */}
                    <div className="flex-shrink-0">
                      <RiskGauge score={selectedAcc.risk_score} size={130} />
                    </div>

                    {/* Right: Mitigate Actions */}
                    <div className="flex flex-col gap-2.5 w-full md:w-auto">
                      {selectedAcc.status !== 'Frozen' ? (
                        <button
                          onClick={handleFreeze}
                          className="bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 uppercase transition-all shadow-neon-red"
                        >
                          <FaUserSlash />
                          <span>Freeze Account</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                          <FaSnowflake className="animate-spin text-sm" />
                          <span>Mule System Suspended</span>
                        </div>
                      )}

                      <button
                        onClick={() => setShowCaseForm(!showCaseForm)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 uppercase transition-colors"
                      >
                        <FaFileMedical className="text-boi-saffron" />
                        <span>Open Case File</span>
                      </button>
                    </div>
                  </div>

                  {freezeMsg && (
                    <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-900/50 rounded-lg text-xs font-semibold text-cyan-300">
                      {freezeMsg}
                    </div>
                  )}
                </GlassCard>

                {/* Inline Investigation Form */}
                {showCaseForm && (
                  <GlassCard title="Launch Investigation Docket" subtitle="Assigns this suspect and triggers auditing workflow" hoverable={false}>
                    {caseSuccess && (
                      <div className="p-3 mb-4 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs font-semibold text-emerald-400">
                        {caseSuccess}
                      </div>
                    )}
                    <form onSubmit={handleCreateCase} className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Case Title / Reference</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mumbai Andheri Layering Cluster C"
                          value={caseTitle}
                          onChange={(e) => setCaseTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Severity Rating</label>
                          <select
                            value={caseSeverity}
                            onChange={(e) => setCaseSeverity(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all cursor-pointer"
                          >
                            <option value="Low">Low Risk</option>
                            <option value="Medium">Medium Risk</option>
                            <option value="High">High Risk</option>
                            <option value="Critical">Critical Threat</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Suspect ID</label>
                          <input
                            type="text"
                            disabled
                            value={selectedAcc.account_number}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-500 font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold mb-1.5">Narrative summary</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Outline specific red flags (new devices, swift layering, out-of-branch logins)..."
                          value={caseSummary}
                          onChange={(e) => setCaseSummary(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowCaseForm(false)}
                          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs px-3 py-2 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-boi-saffron hover:bg-boi-saffron/90 text-navy-950 font-bold text-xs px-4 py-2 rounded-lg uppercase tracking-wider transition-colors shadow-neon-saffron"
                        >
                          Open Docket
                        </button>
                      </div>
                    </form>
                  </GlassCard>
                )}

                {/* Sub Telemetry Tabs: Devices, Locations, and Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Device Logs */}
                  <GlassCard title="Fingerprinted Devices" subtitle="Associated login logs" hoverable={false}>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                            <th className="pb-2">OS / Model</th>
                            <th className="pb-2">IP Address</th>
                            <th className="pb-2">Last Login</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {selectedAcc.devices?.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-800/10">
                              <td className="py-2.5 flex items-center gap-1.5">
                                <FaLaptop className="text-slate-500 text-[10px]" />
                                <div>
                                  <span className="block font-semibold text-slate-300">{d.device_name}</span>
                                  <span className="block text-[8px] text-slate-500 font-mono">{d.device_uuid}</span>
                                </div>
                              </td>
                              <td className="py-2.5 font-mono text-slate-400">{d.ip_address}</td>
                              <td className="py-2.5 text-slate-500 font-mono text-[10px]">{new Date(d.last_login).toLocaleDateString()}</td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-600">No devices logged.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>

                  {/* Right: Geographic footprints */}
                  <GlassCard title="Geographic Logs" subtitle="GeoIP login tracking" hoverable={false}>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                            <th className="pb-2">Location</th>
                            <th className="pb-2">IP Address</th>
                            <th className="pb-2">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {selectedAcc.locations?.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-800/10">
                              <td className="py-2.5 flex items-center gap-1.5">
                                <FaMapMarkerAlt className="text-slate-500 text-[10px]" />
                                <span className="font-semibold text-slate-300">{l.city}, {l.country}</span>
                              </td>
                              <td className="py-2.5 font-mono text-slate-400">{l.ip_address}</td>
                              <td className="py-2.5 text-slate-500 font-mono text-[10px]">{new Date(l.timestamp).toLocaleDateString()}</td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-600">No geo logs registered.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </div>

                {/* Bottom: Transaction details for this account */}
                <GlassCard title="Suspect Transaction History" subtitle="Account audit trails" hoverable={false}>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                          <th className="pb-2">Reference</th>
                          <th className="pb-2">Category</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Risk</th>
                          <th className="pb-2">Verdict</th>
                          <th className="pb-2">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {accTxns.map((t) => {
                          const isSource = t.source_account_id === selectedAcc.id;
                          return (
                            <tr key={t.id} className="hover:bg-slate-800/10">
                              <td className="py-3 font-mono text-slate-300 font-semibold">{t.transaction_reference}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isSource ? 'bg-red-950/40 text-red-400' : 'bg-emerald-950/40 text-emerald-400'
                                }`}>
                                  {isSource ? 'OUTBOUND' : 'INBOUND'}
                                </span>
                              </td>
                              <td className="py-3 font-bold font-mono">₹{parseFloat(t.amount).toLocaleString()}</td>
                              <td className="py-3">
                                <span className={`font-mono font-bold ${t.risk_score >= 75 ? 'text-red-400' : t.risk_score >= 35 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                  {t.risk_score.toFixed(0)}%
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  t.status === 'Approved' ? 'bg-emerald-950 text-emerald-400' :
                                  t.status === 'Suspicious' ? 'bg-red-950 text-red-400 animate-pulse' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[10px]">{new Date(t.timestamp).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </>
            ) : (
              <GlassCard className="flex items-center justify-center py-20" hoverable={false}>
                <p className="text-slate-500 font-mono text-xs">Select an account from the left side panel to review risk characteristics.</p>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Accounts;
