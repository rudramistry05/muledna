import React, { useState, useEffect } from 'react';
import { 
  FaProjectDiagram, 
  FaSnowflake, 
  FaUserSlash, 
  FaSkullCrossbones,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import GraphFlow from '../components/GraphFlow';
import { fraudRingsAPI } from '../services/api';

import socket from '../services/socket';

const FraudRings = () => {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], metrics: {} });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ringFreezeSuccess, setRingFreezeSuccess] = useState('');

  useEffect(() => {
    fetchGraph();

    // Listen for live graph update notifications
    const handleGraphUpdate = () => {
      fetchGraph();
    };

    socket.on('new_transaction', handleGraphUpdate);
    socket.on('fraud_ring_update', handleGraphUpdate);

    return () => {
      socket.off('new_transaction', handleGraphUpdate);
      socket.off('fraud_ring_update', handleGraphUpdate);
    };
  }, []);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await fraudRingsAPI.get();
      setGraphData(data);
    } catch (e) {
      console.warn("Could not retrieve fraud network mapping.");
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeData, nodeId) => {
    setSelectedNode({ ...nodeData, id: nodeId });
  };

  const handleFreezeRing = async () => {
    if (!selectedNode) return;
    
    // Find all nodes in the same community
    const communityId = selectedNode.community;
    const targets = graphData.nodes
      .filter(n => n.data.community === communityId && n.data.status !== 'Frozen')
      .map(n => parseInt(n.id));

    if (targets.length === 0) {
      setRingFreezeSuccess("All accounts in this ring are already frozen!");
      return;
    }

    try {
      setRingFreezeSuccess('');
      const res = await fraudRingsAPI.freezeRing(targets);
      setRingFreezeSuccess(res.message);
      
      // Re-fetch graph
      setTimeout(() => {
        fetchGraph();
        setRingFreezeSuccess('');
      }, 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="Louvain Fraud Ring Graph Analytics" />
        
        <main className="p-8 space-y-6">
          
          {/* Top Panel summary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard hoverable={false} className="border-l-4 border-l-boi-saffron">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Detected Communities</span>
              <h4 className="text-xl font-bold font-display mt-1">
                {loading ? '...' : graphData.metrics?.total_communities || 0} Clusters
              </h4>
            </GlassCard>
            <GlassCard hoverable={false} className="border-l-4 border-l-red-500">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Suspicious Edge Flows</span>
              <h4 className="text-xl font-bold font-display mt-1 text-red-400 neon-text-red">
                {loading ? '...' : graphData.metrics?.suspicious_flows_count || 0} Transfers
              </h4>
            </GlassCard>
            <GlassCard hoverable={false} className="border-l-4 border-l-cyan-500">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-wider">Maximum Threat Score</span>
              <h4 className="text-xl font-bold font-display mt-1 text-cyan-400">
                {loading ? '...' : (graphData.metrics?.highest_risk_score || 0.0).toFixed(1)}/100
              </h4>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* React Flow Graph */}
            <div className="xl:col-span-2 space-y-4">
              <GlassCard title="Interactive Fraud Links Network" subtitle="Color-coded node mapping by Louvain community grouping" hoverable={false}>
                {loading ? (
                  <div className="h-[550px] flex items-center justify-center text-boi-saffron font-mono font-bold animate-pulse text-xs">
                    COMPILING TRANSACTION GRAPH CENTRALITIES...
                  </div>
                ) : (
                  <GraphFlow 
                    nodes={graphData.nodes} 
                    edges={graphData.edges} 
                    onNodeClick={handleNodeClick}
                  />
                )}
              </GlassCard>
            </div>

            {/* Sidebar metadata of selected node */}
            <div className="xl:col-span-1 space-y-6">
              <GlassCard title="Entity Risk Characterization" subtitle="Details of clicked account node" hoverable={false}>
                {selectedNode ? (
                  <div className="space-y-5 text-left">
                    
                    <div className="border-b border-slate-800 pb-4">
                      <h4 className="text-base font-bold text-slate-200">{selectedNode.label}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedNode.accountNumber}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Class Type</span>
                        <strong className="text-slate-300 font-semibold">{selectedNode.nodeType}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Cluster Group</span>
                        <strong className="text-boi-saffron font-bold font-mono">Louvain #{selectedNode.community}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Threat Score</span>
                        <strong className={`font-bold font-mono ${selectedNode.riskScore >= 75 ? 'text-red-400' : 'text-orange-400'}`}>
                          {selectedNode.riskScore.toFixed(1)}/100
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Centrality</span>
                        <strong className="text-slate-300 font-mono">{selectedNode.centrality} index</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-navy-900 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed flex gap-2">
                      <FaInfoCircle className="text-boi-saffron text-base flex-shrink-0 mt-0.5" />
                      <span>
                        This node belongs to a connected sub-community of accounts that trade values. 
                        Entities in Louvain #{selectedNode.community} are under investigation.
                      </span>
                    </div>

                    {ringFreezeSuccess && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-lg text-xs font-semibold">
                        {ringFreezeSuccess}
                      </div>
                    )}

                    <div className="space-y-2.5 pt-2">
                      <button
                        onClick={handleFreezeRing}
                        className="w-full bg-red-500 hover:bg-red-600 text-slate-950 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 uppercase transition-all shadow-neon-red"
                      >
                        <FaSkullCrossbones />
                        <span>Freeze Linked Ring</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <p className="text-slate-500 font-mono text-xs py-10 text-center">
                    Click on any account node in the graph canvas to inspect risk characteristics and mitigate threats.
                  </p>
                )}
              </GlassCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FraudRings;
