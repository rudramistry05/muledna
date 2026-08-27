import React, { useState, useEffect } from 'react';
import { 
  FaExchangeAlt, 
  FaDownload, 
  FaFilePdf, 
  FaSearch, 
  FaChevronLeft, 
  FaChevronRight,
  FaShieldAlt,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { transactionsAPI } from '../services/api';

const Transactions = () => {
  const [txData, setTxData] = useState({ transactions: [], total_count: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [page, status]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionsAPI.list({ page, size, search, status_filter: status });
      setTxData(data);
    } catch (e) {
      console.warn("Could not retrieve transaction logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  // Export CSV mock function
  const handleExportCSV = () => {
    const headers = ["Reference ID,Type,Source Account,Destination Account,Amount (INR),Risk Score (%),Status,Timestamp\n"];
    const rows = txData.transactions.map(t => 
      `"${t.transaction_reference}","${t.type}","${t.source_account?.account_number || ''}","${t.destination_account?.account_number || ''}",${t.amount},${t.risk_score},"${t.status}","${t.timestamp}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `boi_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF mock function
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="Transaction Ledger Interceptor" />
        
        <main className="p-8 space-y-6">
          
          {/* Action Toolbar Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-950/40 border border-slate-800 rounded-lg px-4 py-2 w-full md:w-96 focus-within:border-boi-saffron transition-all">
              <FaSearch className="text-slate-500 mr-2 text-xs" />
              <input
                type="text"
                placeholder="Search reference, beneficiary name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-slate-300 text-xs w-full outline-none placeholder:text-slate-600"
              />
              <button type="submit" className="hidden" />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Status Select */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none cursor-pointer focus:border-boi-saffron"
              >
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Blocked">Blocked</option>
                <option value="Pending">Pending</option>
              </select>

              {/* Exports */}
              <button 
                onClick={handleExportCSV}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                title="CSV Spreadsheet Download"
              >
                <FaDownload className="text-[10px]" />
                <span>CSV</span>
              </button>

              <button 
                onClick={handleExportPDF}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                title="Print ledger report"
              >
                <FaFilePdf className="text-[10px]" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          <GlassCard title="Live Intercepted Queue" subtitle="List of dynamic banking transactions analyzed by MuleDNA" hoverable={false}>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px] tracking-wider">
                    <th className="pb-3">Reference ID</th>
                    <th className="pb-3">Sender / Origin</th>
                    <th className="pb-3">Receiver / Dest</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">AI Threat Score</th>
                    <th className="pb-3">Primary Indicators</th>
                    <th className="pb-3">Verdict</th>
                    <th className="pb-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-boi-saffron font-bold animate-pulse font-mono">
                        RETRIEVING TRANSACTION AUDIT LOGS...
                      </td>
                    </tr>
                  ) : txData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                        No transactions registered matching current query.
                      </td>
                    </tr>
                  ) : (
                    txData.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 font-mono text-slate-300 font-semibold">{t.transaction_reference}</td>
                        <td className="py-3.5">
                          <div>
                            <span className="block font-semibold text-slate-200">{t.source_account?.customer_name || 'System'}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{t.source_account?.account_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div>
                            <span className="block font-semibold text-slate-200">{t.destination_account?.customer_name || 'N/A'}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{t.destination_account?.account_number || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 font-bold font-mono">
                          ₹{parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1">
                            <FaShieldAlt className={`text-[10px] ${t.risk_score >= 75 ? 'text-red-500' : t.risk_score >= 35 ? 'text-orange-500' : 'text-emerald-500'}`} />
                            <span className={`font-mono font-bold ${t.risk_score >= 75 ? 'text-red-400' : t.risk_score >= 35 ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {t.risk_score.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-slate-400 max-w-[200px] truncate" title={t.risk_reasons}>
                          {t.risk_reasons || 'Low Risk Indicators'}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'Approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                            t.status === 'Suspicious' ? 'bg-red-950 text-red-400 border border-red-900/30 animate-pulse' :
                            t.status === 'Blocked' ? 'bg-slate-900 text-red-500 border border-red-900/50' :
                            'bg-slate-900 text-slate-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500 font-mono text-[10px]">{new Date(t.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {txData.total_count > size && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <span className="text-[10px] text-slate-500 font-mono">
                  Showing {(page - 1) * size + 1} - {Math.min(page * size, txData.total_count)} of {txData.total_count} records
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <FaChevronLeft className="text-xs" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * size >= txData.total_count}
                    className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </main>
      </div>
    </div>
  );
};

export default Transactions;
