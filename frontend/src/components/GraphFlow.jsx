import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  FaUserSecret, 
  FaUserSlash, 
  FaRegUser, 
  FaBuilding, 
  FaSnowflake, 
  FaWallet 
} from 'react-icons/fa';

// Custom Node component inside React Flow
const CustomNode = ({ data }) => {
  const isFrozen = data.status === 'Frozen';
  
  // Color configuration depending on Node classification
  const nodeStyles = {
    "Fraud Controller": {
      bg: "bg-red-950/70 border-red-500 text-red-100",
      glow: "shadow-neon-red",
      icon: <FaUserSecret className="text-red-400 text-lg animate-pulse" />
    },
    "Mule Account": {
      bg: "bg-orange-950/70 border-orange-500 text-orange-100",
      glow: "shadow-neon-saffron",
      icon: <FaUserSlash className="text-orange-400 text-lg" />
    },
    "Victim": {
      bg: "bg-blue-950/70 border-blue-500 text-blue-100",
      glow: "shadow-neon-blue",
      icon: <FaRegUser className="text-blue-400 text-lg" />
    },
    "Bank": {
      bg: "bg-slate-900/70 border-slate-600 text-slate-100",
      glow: "",
      icon: <FaBuilding className="text-slate-400 text-lg" />
    },
    "Merchant": {
      bg: "bg-cyan-950/70 border-cyan-500 text-cyan-100",
      glow: "",
      icon: <FaBuilding className="text-cyan-400 text-lg" />
    }
  };

  const style = nodeStyles[data.nodeType] || nodeStyles["Mule Account"];

  return (
    <div className={`p-3 rounded-lg border-2 ${isFrozen ? 'bg-slate-950/80 border-slate-700 text-slate-500 opacity-60' : `${style.bg} ${style.glow}`} w-48 text-left transition-all`}>
      {/* Handles for edges mapping connections */}
      <Handle type="target" position={Position.Top} className="bg-slate-600" />
      
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase font-mono tracking-wider font-bold">
          {data.nodeType}
        </span>
        {isFrozen ? <FaSnowflake className="text-cyan-300 text-sm animate-spin" /> : style.icon}
      </div>

      <div className="font-bold text-xs truncate mb-0.5">{data.label}</div>
      <div className="text-[10px] font-mono text-slate-400">{data.accountNumber}</div>

      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1">
          <FaWallet className="text-[9px] text-slate-500" />
          <span className="text-[9px] font-mono">₹{data.balance.toLocaleString()}</span>
        </div>
        <span className={`text-[10px] font-bold ${data.riskScore >= 75 ? 'text-red-400' : data.riskScore >= 35 ? 'text-orange-400' : 'text-emerald-400'}`}>
          {data.riskScore.toFixed(0)}% Risk
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-slate-600" />
    </div>
  );
};

const GraphFlow = ({ nodes = [], edges = [], onNodeClick, onFreezeRing }) => {
  
  // Register custom node type mapping
  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) {
      onNodeClick(node.data, node.id);
    }
  }, [onNodeClick]);

  return (
    <div className="w-full h-[550px] relative border border-slate-800 rounded-xl overflow-hidden bg-navy-950">
      
      {/* Floating Control Banner */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="px-3 py-1 bg-navy-900/80 backdrop-blur border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>Active Graph Session</span>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            if (n.data?.riskScore >= 75) return '#EF4444';
            if (n.data?.riskScore >= 35) return '#FF9933';
            return '#3B82F6';
          }}
          maskColor="rgba(4, 13, 18, 0.7)"
          style={{ background: '#0B192C', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <Background color="#1E3E62" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GraphFlow;
