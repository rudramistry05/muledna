import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaDownload, FaCode, FaBook, FaCheckCircle } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { reportsAPI } from '../services/api';

const SARReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const casesData = await reportsAPI.cases();
      // Extract all cases that have compiled SAR reports
      const allSars = [];
      casesData.forEach(c => {
        if (c.sar_reports && c.sar_reports.length > 0) {
          c.sar_reports.forEach(r => {
            allSars.push({ ...r, case_title: c.title, severity: c.severity });
          });
        }
      });
      setReports(allSars);
      if (allSars.length > 0 && !selectedReport) {
        setSelectedReport(allSars[0]);
      }
    } catch (e) {
      console.warn("Could not retrieve SAR filings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = () => {
    if (!selectedReport) return;
    const blob = new Blob([selectedReport.report_xml], { type: 'text/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SAR_${selectedReport.subject_account}_${selectedReport.id}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="SAR Regulatory Filing Hub" />
        
        <main className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Column 1: SAR Index */}
          <div className="xl:col-span-1 space-y-6">
            <GlassCard title="Submitted FIU Documents" subtitle="Standard Suspicious Activity Reports" hoverable={false}>
              <div className="space-y-2 max-h-[550px] overflow-y-auto mt-2 pr-1">
                {loading ? (
                  <p className="text-center py-6 text-boi-saffron font-mono text-xs animate-pulse">Loading reports...</p>
                ) : reports.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 font-mono text-xs">No SAR filings generated yet.</p>
                ) : (
                  reports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                        selectedReport?.id === r.id
                          ? 'bg-boi-saffron/10 border-boi-saffron shadow-glass-glow'
                          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-xs text-slate-200">Doc ID: SAR-{r.id}</p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Subject: {r.subject_name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Column 2 & 3: Selected SAR Details */}
          <div className="xl:col-span-2 space-y-6">
            {selectedReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Left: Summary Narrative */}
                <div className="lg:col-span-2 space-y-6">
                  <GlassCard title="Filing Metadata" hoverable={false} className="border-t-4 border-t-boi-saffron">
                    <div className="text-left space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Filer Unit</span>
                        <strong className="text-slate-300 font-semibold">{selectedReport.filer_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Suspect Customer</span>
                        <strong className="text-slate-300 font-semibold">{selectedReport.subject_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Suspect Account</span>
                        <strong className="text-slate-300 font-mono">{selectedReport.subject_account}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Date Filed</span>
                        <strong className="text-slate-300 font-mono">{new Date(selectedReport.created_at).toLocaleString()}</strong>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard title="Federal AML Narrative" subtitle="Generated text description of suspect patterns" hoverable={false}>
                    <div className="p-3 bg-navy-900 border border-slate-800 rounded-lg text-left text-xs leading-relaxed text-slate-400 font-sans">
                      {selectedReport.summary_narrative}
                    </div>
                  </GlassCard>
                </div>

                {/* Right: XML Tree Code view & Downloads */}
                <div className="lg:col-span-3 space-y-6">
                  <GlassCard title="XML Code View" subtitle="Standard Compliance Output Tree" hoverable={false}>
                    <div className="relative">
                      <pre className="bg-slate-950 border border-slate-900 rounded-lg p-4 overflow-x-auto text-[9px] font-mono text-slate-300 text-left h-72">
                        <code>{selectedReport.report_xml}</code>
                      </pre>
                    </div>

                    <div className="flex gap-2.5 pt-4 justify-end">
                      <button
                        onClick={handleDownloadXML}
                        className="bg-boi-saffron hover:bg-boi-saffron/90 text-navy-950 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 uppercase transition-all shadow-neon-saffron"
                      >
                        <FaDownload />
                        <span>Download XML</span>
                      </button>
                    </div>
                  </GlassCard>

                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-lg text-xs leading-relaxed text-left flex gap-2.5">
                    <FaCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>SAR Submission Status: ACKNOWLEDGED.</strong> The document has been serialized and queued for regional Financial Intelligence Unit (FIU) batch transmission.
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <GlassCard className="flex items-center justify-center py-24" hoverable={false}>
                <p className="text-slate-500 font-mono text-xs">Select a suspicious activity report file from the left index panel.</p>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SARReports;
