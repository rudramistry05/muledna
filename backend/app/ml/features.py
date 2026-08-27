import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.transaction import Transaction
from app.models.account import Account, Location, Device

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in kilometers.
    """
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers.
    return c * r

def calculate_entropy(labels: List[str]) -> float:
    """
    Computes Shannon Entropy of a list of labels.
    """
    if not labels:
        return 0.0
    
    counts = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1
        
    total = len(labels)
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
        
    return entropy

def extract_features(account_id: int, current_txn_amount: float, db: Session) -> Dict[str, float]:
    """
    Extract high-value fraud features for a given account and context.
    Returns a dictionary of features mapping to numeric outputs.
    """
    now = datetime.utcnow()
    
    # 1. Fetch transactions history for this account
    outgoing_txns = db.query(Transaction).filter(
        Transaction.source_account_id == account_id
    ).order_by(desc(Transaction.timestamp)).all()
    
    incoming_txns = db.query(Transaction).filter(
        Transaction.destination_account_id == account_id
    ).order_by(desc(Transaction.timestamp)).all()
    
    all_txns = outgoing_txns + incoming_txns
    all_txns.sort(key=lambda x: x.timestamp, reverse=True)
    
    # Defaults
    velocity_ratio = 1.0
    credit_debit_ratio = 1.0
    holding_time = 1440.0 # 24 hours in minutes
    counterparty_entropy = 0.0
    night_transaction_ratio = 0.0
    round_amount_ratio = 0.0
    location_entropy = 0.0
    dormancy_spike = 0.0
    impossible_travel = 0.0
    
    # Velocity calculation (ratio of last 24h outgoing vs last 30 days avg)
    if outgoing_txns:
        amounts_24h = [t.amount for t in outgoing_txns if t.timestamp >= now - timedelta(days=1)]
        amounts_30d = [t.amount for t in outgoing_txns if t.timestamp >= now - timedelta(days=30)]
        
        avg_24h = float(np.mean(amounts_24h)) if amounts_24h else 0.0
        avg_30d = float(np.mean(amounts_30d)) if amounts_30d else 0.0
        
        if avg_30d > 0:
            velocity_ratio = avg_24h / avg_30d
        else:
            velocity_ratio = 1.0 if avg_24h == 0 else 5.0

    # Credit/Debit Ratio (Total inbound / (Total outbound + 1))
    total_credit = float(sum(t.amount for t in incoming_txns))
    total_debit = float(sum(t.amount for t in outgoing_txns))
    credit_debit_ratio = total_credit / (total_debit + 1.0)
    
    # Holding Time (time diff between last inbound and subsequent outbound in minutes)
    if incoming_txns and outgoing_txns:
        last_inbound = incoming_txns[0]
        # Find first outbound that happened after last inbound
        subsequent_outbounds = [o for o in outgoing_txns if o.timestamp > last_inbound.timestamp]
        if subsequent_outbounds:
            first_subsequent = subsequent_outbounds[-1] # oldest of the newer outbounds
            diff = (first_subsequent.timestamp - last_inbound.timestamp).total_seconds()
            holding_time = max(0.0, diff / 60.0) # in minutes
            
    # Counterparty Entropy
    recipients = []
    for t in outgoing_txns:
        if t.destination_account_id:
            recipients.append(str(t.destination_account_id))
    for t in incoming_txns:
        if t.source_account_id:
            recipients.append(str(t.source_account_id))
    counterparty_entropy = calculate_entropy(recipients)

    # Night Transaction Ratio (proportion of txns between 11 PM and 4 AM)
    if all_txns:
        night_txns = [t for t in all_txns if t.timestamp.hour >= 23 or t.timestamp.hour < 4]
        night_transaction_ratio = len(night_txns) / len(all_txns)
        
    # Round Amount Ratio (proportion of txns that are multiples of 1000)
    if all_txns:
        round_txns = [t for t in all_txns if float(t.amount) % 1000 == 0]
        round_amount_ratio = len(round_txns) / len(all_txns)

    # Location Entropy
    locs = db.query(Location).filter(Location.account_id == account_id).all()
    cities = [l.city for l in locs if l.city]
    location_entropy = calculate_entropy(cities)

    # Dormancy Spike
    # If no transactions occurred in the last 15 days, but account was created > 30 days ago,
    # and this transaction is high volume, set flag.
    account = db.query(Account).filter(Account.id == account_id).first()
    if account:
        recent_txns = [t for t in all_txns if t.timestamp >= now - timedelta(days=15)]
        age_days = (now - account.created_at).days
        if not recent_txns and age_days > 30 and current_txn_amount > 10000:
            dormancy_spike = 1.0

    # Impossible Travel
    # If the user logged in/transacted in City A and then City B shortly after
    if len(locs) >= 2:
        sorted_locs = sorted(locs, key=lambda x: x.timestamp, reverse=True)
        loc_latest = sorted_locs[0]
        loc_prev = sorted_locs[1]
        
        if (loc_latest.latitude and loc_latest.longitude and 
            loc_prev.latitude and loc_prev.longitude):
            dist = haversine_distance(
                loc_latest.latitude, loc_latest.longitude,
                loc_prev.latitude, loc_prev.longitude
            )
            time_diff = (loc_latest.timestamp - loc_prev.timestamp).total_seconds()
            if time_diff > 0:
                speed_kmh = (dist / time_diff) * 3600.0
                # If speed is greater than 900 km/h (speed of commercial airliner)
                if speed_kmh > 900.0:
                    impossible_travel = min(1.0, speed_kmh / 2000.0)

    return {
        "velocity_ratio": velocity_ratio,
        "credit_debit_ratio": credit_debit_ratio,
        "holding_time": holding_time,
        "counterparty_entropy": counterparty_entropy,
        "night_transaction_ratio": night_transaction_ratio,
        "round_amount_ratio": round_amount_ratio,
        "location_entropy": location_entropy,
        "dormancy_spike": dormancy_spike,
        "impossible_travel": impossible_travel
    }
