import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaFileInvoiceDollar, 
  FaFolderOpen, 
  FaClock, 
  FaEdit,
  FaCheckCircle,
  FaDownload,
  FaFilePdf,
  FaUser,
  FaExchangeAlt,
  FaLaptop,
  FaMapMarkerAlt,
  FaProjectDiagram,
  FaShieldAlt
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import RiskGauge from '../components/RiskGauge';
import { reportsAPI } from '../services/api';
import socket from '../services/socket';

const SHAP_COLORS = { positive: '#EF4444', negative: '#10B981' };

const Investigations = () => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [sarSuccess, setSarSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, ai, devices, network

  useEffect(() => {
    fetchCases();

    // Dynamically append new fraud cases generated in real-time
    const handleNewTxn = () => {
      // Refresh case list when a live transaction triggers a new case
      fetchCases();
    };

    socket.on('new_transaction', handleNewTxn);
    return () => {
      socket.off('new_transaction', handleNewTxn);
    };
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await reportsAPI.cases();
      setCases(data);
      if (data.length > 0) {
        // Retain selection if existing
        if (selectedCase) {
          const freshSelected = data.find(c => c.id === selectedCase.id);
          if (freshSelected) {
            setSelectedCase(freshSelected);
            setNotes(freshSelected.summary || '');
            return;
          }
        }
        handleSelectCase(data[0]);
      }
    } catch (e) {
      console.warn("Could not retrieve investigation dockets.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = (caseObj) => {
    setSelectedCase(caseObj);
    setNotes(caseObj.summary || '');
    setSaveSuccess('');
    setSarSuccess('');
  };

  const handleSaveNotes = async () => {
    if (!selectedCase) return;
    try {
      setSaveSuccess('');
      await reportsAPI.updateCase(selectedCase.id, { summary: notes });
      setSaveSuccess('Notes saved successfully.');
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateSAR = async () => {
    if (!selectedCase) return;
    try {
      setSarSuccess('');
      const report = await reportsAPI.generateSar(selectedCase.id);
      setSarSuccess(`SAR Compliance Filing #${report.id} generated! XML & PDF compiled in PostgreSQL.`);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  // Triggers downloading of the PDF binary from base64 encoding
  const handleDownloadPDF = async (sarId) => {
    try {
      const res = await reportsAPI.downloadSar(sarId);
      if (!res.report_pdf_base64) {
        alert("PDF report is not available for this case.");
        return;
      }
      const byteCharacters = atob(res.report_pdf_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SAR_BOI_REPORT_${res.subject_account}_${res.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download PDF: ", err);
    }
  };

  const handleDownloadXML = async (sarId) => {
    try {
      const res = await reportsAPI.downloadSar(sarId);
      const blob = new Blob([res.report_xml], { type: 'text/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SAR_${res.subject_account}_${res.id}.xml`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download XML: ", err);
    }
  };

  // Convert SHAP JSON into Recharts format
  const getShapChartData = () => {
    if (!selectedCase?.prediction?.shap_values_json) return [];
    try {
      const parsed = JSON.parse(selectedCase.prediction.shap_values_json);
      return Object.entries(parsed).map(([name, val]) => ({
        feature: name.replace("_", " ").toUpperCase(),
        impact: parseFloat(val.toFixed(2))
      })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    } catch (err) {
      return [];
    }
  };

  const shapData = getShapChartData();

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="AML Audit & Forensics Investigation Command" />
        
        <main className="p-8 grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Column 1: Case Files Index */}
          <div className="xl:col-span-1 space-y-6">
            <GlassCard title="Active Investigation Files" subtitle="Sort by date updated" hoverable={false}>
              <div className="space-y-2 max-h-[550px] overflow-y-auto mt-2 pr-1">
                {loading && cases.length === 0 ? (
                  <p className="text-center py-6 text-boi-saffron font-mono text-xs animate-pulse">Loading cases index...</p>
                ) : cases.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 font-mono text-xs">No active cases registered.</p>
                ) : (
                  cases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        selectedCase?.id === c.id
                          ? 'bg-boi-saffron/10 border-boi-saffron shadow-glass-glow'
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-xs text-slate-200 truncate max-w-[150px]">{c.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Suspect: {c.account?.customer_name}</span>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          c.severity === 'Critical' ? 'bg-red-950 text-red-400 border border-red-900/30 animate-pulse' :
                          c.severity === 'High' ? 'bg-orange-950 text-orange-400 border border-orange-900/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {c.severity}
                        </span>
                        <span className="block text-[8px] text-slate-500 font-mono mt-1">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Column 2, 3, 4: Selected Case Details */}
          <div className="xl:col-span-3 space-y-6">
            {selectedCase ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Interactive Telemetry Tabs */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Tab Navigation header */}
                  <div className="flex bg-slate-900/60 border border-slate-800 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'overview' ? 'bg-boi-saffron text-navy-950 shadow-glass-glow' : 'text-slate-400 hover:bg-slate-800/40'}`}
                    >
                      <FaUser />
                      <span>Overview</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('ai')}
                      className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-boi-saffron text-navy-950 shadow-glass-glow' : 'text-slate-400 hover:bg-slate-800/40'}`}
                    >
                      <FaShieldAlt />
                      <span>AI Explanations</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('devices')}
                      className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'devices' ? 'bg-boi-saffron text-navy-950 shadow-glass-glow' : 'text-slate-400 hover:bg-slate-800/40'}`}
                    >
                      <FaLaptop />
                      <span>Device & IP Logs</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('network')}
                      className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${activeTab === 'network' ? 'bg-boi-saffron text-navy-950 shadow-glass-glow' : 'text-slate-400 hover:bg-slate-800/40'}`}
                    >
                      <FaProjectDiagram />
                      <span>Fraud Rings</span>
                    </button>
                  </div>

                  {/* Tab Content 1: Overview */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <GlassCard title="Customer Profile Details" hoverable={false}>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs text-left">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Name</span>
                            <strong className="text-slate-200 text-sm">{selectedCase.account.customer_name}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Account Number</span>
                            <strong className="text-slate-200 font-mono text-sm">{selectedCase.account.account_number}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Phone Contact</span>
                            <strong className="text-slate-200">{selectedCase.account.phone_number || "+919876543210"}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Email Address</span>
                            <strong className="text-slate-200">{selectedCase.account.email || "customer@legit.com"}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Home Branch</span>
                            <strong className="text-slate-200">{selectedCase.account.home_branch || "Nariman Point Branch"}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Routing Number</span>
                            <strong className="text-slate-200 font-mono">{selectedCase.account.routing_number || "BOID0000101"}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Balance Integrity</span>
                            <strong className="text-emerald-400 font-mono">₹{selectedCase.account.balance.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Account Status</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5 uppercase ${
                              selectedCase.account.status === 'Frozen' ? 'bg-red-950 text-red-400 border border-red-900/30' : 'bg-emerald-950 text-emerald-400'
                            }`}>
                              {selectedCase.account.status}
                            </span>
                          </div>
                        </div>
                      </GlassCard>

                      <GlassCard title="Intercepted Transaction Details" hoverable={false}>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs text-left">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Transfer Reference ID</span>
                            <strong className="text-slate-200 font-mono text-sm">{selectedCase.latest_transaction.reference}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Transaction Amount</span>
                            <strong className="text-red-400 font-mono text-sm">₹{selectedCase.latest_transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Timestamp</span>
                            <strong className="text-slate-300">{new Date(selectedCase.latest_transaction.date || selectedCase.created_at).toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">Description Narrative</span>
                            <strong className="text-slate-300 italic">"{selectedCase.latest_transaction.description || 'Urgent payout split'}"</strong>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* Tab Content 2: AI SHAP Explanations */}
                  {activeTab === 'ai' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <GlassCard title="Risk Dial" hoverable={false} className="lg:col-span-2">
                          <div className="flex flex-col items-center justify-center">
                            <RiskGauge score={selectedCase.prediction.ensemble_score} size={130} />
                            
                            <div className="w-full space-y-2 mt-4 border-t border-slate-800/80 pt-4 text-xs text-left">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-mono">XGBoost Score</span>
                                <span className="font-mono font-bold text-slate-300">{selectedCase.prediction.xgb_score.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-mono">LightGBM Score</span>
                                <span className="font-mono font-bold text-slate-300">{selectedCase.prediction.lgb_score.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-mono">Isolation Forest</span>
                                <span className="font-mono font-bold text-slate-300">{selectedCase.prediction.iforest_score.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </GlassCard>

                        <GlassCard title="Local SHAP Feature Contributions" hoverable={false} className="lg:col-span-3">
                          <div className="h-64 mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={shapData}
                                layout="vertical"
                                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E3E62" opacity={0.2} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                                <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={8} width={110} />
                                <Tooltip contentStyle={{ backgroundColor: '#0B192C', borderColor: 'rgba(255,255,255,0.06)' }} />
                                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                                  {shapData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.impact > 0 ? SHAP_COLORS.positive : SHAP_COLORS.negative} 
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </GlassCard>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 3: Devices & Locations */}
                  {activeTab === 'devices' && (
                    <div className="space-y-6">
                      <GlassCard title="Suspect Fingerprints (Associated Devices)" hoverable={false}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                                <th className="pb-2">Device Model</th>
                                <th className="pb-2">OS Platform</th>
                                <th className="pb-2">IP Access Address</th>
                                <th className="pb-2">Hardware UUID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {selectedCase.devices.map((d, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/10">
                                  <td className="py-2.5 font-bold text-slate-300">{d.name}</td>
                                  <td className="py-2.5 text-slate-400">{d.os}</td>
                                  <td className="py-2.5 text-slate-400 font-mono">{d.ip}</td>
                                  <td className="py-2.5 font-mono text-slate-500 text-[10px]">{d.uuid}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </GlassCard>

                      <GlassCard title="Geographical Locations Log" hoverable={false}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                                <th className="pb-2">City</th>
                                <th className="pb-2">Country</th>
                                <th className="pb-2">Coordinates</th>
                                <th className="pb-2">IP Identifier</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {selectedCase.locations.map((l, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/10">
                                  <td className="py-2.5 font-bold text-slate-300">{l.city}</td>
                                  <td className="py-2.5 text-slate-400">{l.country}</td>
                                  <td className="py-2.5 font-mono text-slate-400">
                                    <span className="text-boi-saffron">{l.latitude?.toFixed(4)}</span>, 
                                    <span className="text-cyan-400 ml-1">{l.longitude?.toFixed(4)}</span>
                                  </td>
                                  <td className="py-2.5 font-mono text-slate-500">{l.ip || '103.88.22.41'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* Tab Content 4: Network & Fraud Rings */}
                  {activeTab === 'network' && (
                    <div className="space-y-6">
                      <GlassCard title="Mule Ring Network Connections" hoverable={false}>
                        <div className="space-y-4 text-left text-xs">
                          <div className="flex items-center gap-3 p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400">
                            <FaProjectDiagram className="text-xl flex-shrink-0 animate-pulse" />
                            <div>
                              <strong className="block text-sm">Organized Cluster Linked</strong>
                              <span>This suspect accounts group maps to community Louvain Index #{selectedCase.account.risk_score > 80 ? '3' : '1'}.</span>
                            </div>
                          </div>

                          <div className="space-y-2 mt-4">
                            <h4 className="text-[10px] uppercase font-mono text-slate-500 font-bold">Related Suspect Nodes</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                                <span className="text-[10px] font-mono text-red-400 block font-bold">Controller Account</span>
                                <strong className="text-slate-200">Manoj Gowda (Suspended)</strong>
                                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">BOI0099887766</span>
                              </div>

                              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                                <span className="text-[10px] font-mono text-orange-400 block font-bold">Connected Mule</span>
                                <strong className="text-slate-200">Suresh Kumar (Active)</strong>
                                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">BOI0011223344</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* Investigator Notes Card */}
                  <GlassCard title="Investigator Action Notes" hoverable={false}>
                    <div className="text-left space-y-2">
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Document evidence traces (e.g. Credit-Debit symmetry, Louvain group linkages, device matches)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-boi-saffron transition-all"
                      />
                      {saveSuccess && (
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">{saveSuccess}</span>
                      )}
                      <button
                        onClick={handleSaveNotes}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        Save Entry
                      </button>
                    </div>
                  </GlassCard>

                </div>

                {/* Right: SAR Generation & Downloads */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* compliance filings */}
                  <GlassCard title="Suspicious Activity Report" hoverable={false}>
                    <div className="space-y-4 text-left text-xs">
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Verify AML signals. Generating the SAR publishes structured XML and PDF records to the central audit registry.
                      </p>

                      {sarSuccess && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-lg text-xs font-semibold">
                          {sarSuccess}
                        </div>
                      )}

                      {selectedCase.sar_reports && selectedCase.sar_reports.length > 0 ? (
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                          <span className="text-[9px] uppercase font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <FaCheckCircle />
                            <span>SAR Record Active</span>
                          </span>
                          
                          <button
                            onClick={() => handleDownloadXML(selectedCase.sar_reports[0].id)}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FaDownload />
                            <span>Download XML</span>
                          </button>
                          
                          <button
                            onClick={() => handleDownloadPDF(selectedCase.sar_reports[0].id)}
                            className="w-full bg-red-950 hover:bg-red-900/60 border border-red-900/30 text-red-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FaFilePdf />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleGenerateSAR}
                          className="w-full bg-boi-saffron hover:bg-boi-saffron/90 text-navy-950 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 uppercase transition-all shadow-neon-saffron"
                        >
                          <FaFileInvoiceDollar />
                          <span>Generate SAR Documents</span>
                        </button>
                      )}
                    </div>
                  </GlassCard>

                  {/* Dynamic Investigation Timeline */}
                  <GlassCard title="Investigation File Log" hoverable={false}>
                    <div className="relative border-l border-slate-800 pl-4 space-y-5 text-left text-[11px] mt-2">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-bold text-slate-300 block">AI Auto-Flag Triggered</span>
                        <span className="text-slate-500 font-mono text-[9px]">
                          Score: {selectedCase.prediction.ensemble_score.toFixed(1)}% | Status: paused
                        </span>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-slate-600" />
                        <span className="font-bold text-slate-400 block">Push/SMS Warning Relayed</span>
                        <span className="text-slate-500 font-mono text-[9px]">Dispatched to phone</span>
                      </div>

                      {selectedCase.sar_reports && selectedCase.sar_reports.length > 0 && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="font-bold text-emerald-400 block">SAR Regulatory Files Compiled</span>
                          <span className="text-slate-500 font-mono text-[9px]">XML & PDF Saved in DB</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>

              </div>
            ) : (
              <GlassCard className="flex items-center justify-center py-24" hoverable={false}>
                <p className="text-slate-500 font-mono text-xs">Select an active case file from the index panel to initiate research.</p>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Investigations;
