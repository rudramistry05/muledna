import networkx as nx
import community as community_louvain
from sqlalchemy.orm import Session
from typing import Dict, List, Any
import math
from app.models.account import Account
from app.models.transaction import Transaction

class FraudGraphAnalysisService:
    def __init__(self, db: Session):
        self.db = db

    def generate_fraud_network(self) -> Dict[str, Any]:
        """
        Queries all accounts and recent suspicious/normal transactions.
        Builds a NetworkX graph, computes centralities, detects communities (Louvain),
        and formats the output specifically for React Flow rendering.
        """
        # 1. Fetch Accounts
        accounts = self.db.query(Account).all()
        account_map = {a.id: a for a in accounts}
        
        # 2. Fetch Transactions (last 100 transactions to keep graph lightweight and performant)
        txns = self.db.query(Transaction).order_by(Transaction.timestamp.desc()).limit(100).all()
        
        # Build Directed Graph
        di_graph = nx.DiGraph()
        
        # Add all accounts as nodes
        for acc in accounts:
            di_graph.add_node(
                acc.id,
                label=acc.customer_name,
                risk_score=acc.risk_score,
                status=acc.status,
                account_number=acc.account_number,
                balance=float(acc.balance)
            )
            
        # Add edges representing money transfers
        for t in txns:
            if t.source_account_id and t.destination_account_id:
                # Accumulate transaction amounts on edges
                if di_graph.has_edge(t.source_account_id, t.destination_account_id):
                    di_graph[t.source_account_id][t.destination_account_id]['weight'] += float(t.amount)
                    di_graph[t.source_account_id][t.destination_account_id]['txn_count'] += 1
                else:
                    di_graph.add_edge(
                        t.source_account_id,
                        t.destination_account_id,
                        weight=float(t.amount),
                        txn_count=1
                    )
                    
        # 3. Louvain Community Detection (requires Undirected Graph)
        undirected_graph = di_graph.to_undirected()
        
        # Louvain partition
        try:
            # If graph is empty or has no nodes, return empty partition
            if len(undirected_graph.nodes) > 0:
                partition = community_louvain.best_partition(undirected_graph)
            else:
                partition = {}
        except Exception as e:
            print(f"[MuleDNA] Louvain failed: {e}. Defaulting all to community 0.")
            partition = {node: 0 for node in di_graph.nodes}
            
        # 4. Compute Network Centrality Metrics
        # Degree centrality represents general activity
        deg_centrality = nx.degree_centrality(di_graph)
        # Out-degree centrality represents potential controllers (distributors of stolen money)
        out_deg_centrality = nx.out_degree_centrality(di_graph)
        
        # 5. Format React Flow Nodes and Edges
        react_nodes = []
        react_edges = []
        
        # Calculate standard grid layouts for nodes to look neat initially
        # Group nodes by community to place them in visual clusters
        communities = {}
        for node_id, comm_id in partition.items():
            communities.setdefault(comm_id, []).append(node_id)
            
        # Layout spacing variables
        comm_idx = 0
        for comm_id, node_ids in communities.items():
            # Calculate cluster centers
            cx = (comm_idx % 3) * 500
            cy = (comm_idx // 3) * 500
            
            # Place nodes in a circle around cluster center
            num_nodes = len(node_ids)
            for item_idx, node_id in enumerate(node_ids):
                acc = account_map.get(node_id)
                if not acc:
                    continue
                
                # Determine Node Classification
                # Check if this node is a Controller (high out-degree and high risk)
                # Check if it is a Victim (has mostly outgoing transfers and low risk score)
                # Check if it is a Mule (has incoming from controller and outgoing to others)
                out_cent = out_deg_centrality.get(node_id, 0.0)
                node_type = "Mule Account"
                
                if acc.risk_score >= 85.0 and out_cent > 0.2:
                    node_type = "Fraud Controller"
                elif acc.risk_score < 30.0:
                    node_type = "Victim"
                elif "Merchant" in acc.customer_name or "Store" in acc.customer_name:
                    node_type = "Merchant"
                elif "Bank" in acc.customer_name:
                    node_type = "Bank"
                    
                # Node position in layout
                angle = (2 * 3.14159 * item_idx) / max(1, num_nodes)
                radius = 120.0 if num_nodes > 1 else 0.0
                px = cx + radius * math.cos(angle)
                py = cy + radius * math.sin(angle)
                
                react_nodes.append({
                    "id": str(node_id),
                    "type": "customNode",
                    "position": {"x": px, "y": py},
                    "data": {
                        "label": acc.customer_name,
                        "accountNumber": acc.account_number,
                        "riskScore": acc.risk_score,
                        "status": acc.status,
                        "balance": float(acc.balance),
                        "nodeType": node_type,
                        "community": comm_id,
                        "centrality": round(deg_centrality.get(node_id, 0.0), 3)
                    }
                })
            comm_idx += 1

        # Build React Flow Edges
        edge_index = 1
        for u, v, data in di_graph.edges(data=True):
            # Edge styling depending on risk
            risk_high = False
            u_acc = account_map.get(u)
            v_acc = account_map.get(v)
            if u_acc and v_acc:
                if u_acc.risk_score > 70.0 or v_acc.risk_score > 70.0:
                    risk_high = True
                    
            react_edges.append({
                "id": f"edge-{u}-{v}-{edge_index}",
                "source": str(u),
                "target": str(v),
                "label": f"Rs.{data['weight']:,.2f}",
                "animated": risk_high,
                "style": {
                    "stroke": "#EF4444" if risk_high else "#3B82F6",
                    "strokeWidth": 2 if risk_high else 1.2
                },
                "data": {
                    "amount": data["weight"],
                    "transactionsCount": data["txn_count"]
                }
            })
            edge_index += 1

        # Summary Metrics
        total_suspicious_edges = sum(1 for e in react_edges if e["animated"])
        
        return {
            "nodes": react_nodes,
            "edges": react_edges,
            "metrics": {
                "total_communities": len(communities),
                "suspicious_flows_count": total_suspicious_edges,
                "highest_risk_score": max([a.risk_score for a in accounts]) if accounts else 0.0
            }
        }
