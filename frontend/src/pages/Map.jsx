import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FaGlobeAsia, FaExchangeAlt, FaShieldAlt, FaPlaneDeparture } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';
import { accountsAPI, transactionsAPI } from '../services/api';
import socket from '../services/socket';

// Core coordination centers (Mumbai, Bengaluru, Delhi, etc.)
const defaultCenter = [19.0760, 72.8777];

const MapPage = () => {
  const [locations, setLocations] = useState([]);
  const [impossibleTravels, setImpossibleTravels] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();

    // Listen to live transaction events to dynamically update hotspots/markers
    const handleNewTxn = (txn) => {
      if (txn.source_account && txn.source_account.risk_score >= 75) {
        // Add coordinates dynamically
        const lat = txn.location_lat || 19.0760;
        const lon = txn.location_lon || 72.8777;
        
        setLocations(prev => [
          ...prev,
          {
            id: `live-${Date.now()}`,
            customer_name: txn.source_account.customer_name,
            city: "Live Intercept",
            latitude: lat,
            longitude: lon,
            type: "Transaction",
            risk_score: txn.risk_score,
            amount: txn.amount,
            ref: txn.transaction_reference
          }
        ]);
        
        // If impossible travel indicators are marked
        if (txn.risk_reasons?.toLowerCase().includes("travel") || txn.risk_score > 85) {
          // Simulate an impossible travel link from original coordinates
          setImpossibleTravels(prev => [
            ...prev,
            {
              id: `live-travel-${Date.now()}`,
              name: txn.source_account.customer_name,
              from: [19.0760, 72.8777], // Mumbai
              to: [lat + (Math.random() - 0.5) * 6, lon + (Math.random() - 0.5) * 6],
              speed: 1240
            }
          ]);
        }
      }
    };

    socket.on('new_transaction', handleNewTxn);
    return () => {
      socket.off('new_transaction', handleNewTxn);
    };
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const accountsList = await accountsAPI.list({ limit: 50 });
      const points = [];
      const travelLines = [];
      
      accountsList.forEach(acc => {
        // Gather transaction points
        if (acc.locations && acc.locations.length > 0) {
          acc.locations.forEach(loc => {
            if (loc.latitude && loc.longitude) {
              points.push({
                id: loc.id,
                customer_name: acc.customer_name,
                city: loc.city || "Unknown Branch",
                latitude: loc.latitude,
                longitude: loc.longitude,
                type: acc.risk_score > 70 ? "Suspicious Login" : "Secure Login",
                risk_score: acc.risk_score,
                email: acc.email,
                phone: acc.phone_number
              });
            }
          });

          // Check for simulated impossible travel pairs
          if (acc.risk_score >= 80 && acc.locations.length >= 2) {
            const l1 = acc.locations[0];
            const l2 = acc.locations[1];
            if (l1.latitude && l1.longitude && l2.latitude && l2.longitude) {
              travelLines.push({
                id: `line-${acc.id}`,
                name: acc.customer_name,
                from: [l2.latitude, l2.longitude],
                to: [l1.latitude, l1.longitude],
                speed: 1040 // km/h
              });
            }
          }
        }
      });

      // Default Hotspots (Mumbai Central, Delhi NCR, Pune Hub, Bangalore, Kolkata)
      const hotspotsList = [
        { city: "Mumbai Andheri East", lat: 19.1136, lon: 72.8697, cases: 14, severity: "Critical" },
        { city: "Delhi Connaught Place", lat: 28.6304, lon: 77.2177, cases: 8, severity: "High" },
        { city: "Pune Shivajinagar", lat: 18.5308, lon: 73.8475, cases: 6, severity: "Medium" },
        { city: "Bengaluru MG Road", lat: 12.9738, lon: 77.6119, cases: 11, severity: "Critical" },
      ];

      setLocations(points);
      setImpossibleTravels(travelLines);
      setHotspots(hotspotsList);
    } catch (e) {
      console.warn("Could not retrieve maps locations data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar title="Real-Time Geographical Fraud Mapping" />
        
        <main className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Map Frame Card */}
            <div className="lg:col-span-3">
              <GlassCard title="Global Transaction Signals & Fraud Heatmaps" subtitle="Dynamic coordinates visualization of logins and wire transfers" hoverable={false}>
                {loading ? (
                  <div className="h-[550px] flex items-center justify-center text-boi-saffron font-mono font-bold animate-pulse text-xs">
                    SYNCHRONIZING GLOBAL GPS TELEMETRIES...
                  </div>
                ) : (
                  <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-navy-900 relative">
                    <MapContainer center={defaultCenter} zoom={5} style={{ height: '100%', width: '100%', background: '#0b132b' }}>
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      
                      {/* Standard Logins Markers */}
                      {locations.map(loc => (
                        <CircleMarker
                          key={loc.id}
                          center={[loc.latitude, loc.longitude]}
                          radius={loc.risk_score > 70 ? 8 : 5}
                          fillColor={loc.risk_score > 70 ? "#EF4444" : "#10B981"}
                          color={loc.risk_score > 70 ? "#EF4444" : "#10B981"}
                          weight={1}
                          opacity={0.8}
                          fillOpacity={0.4}
                        >
                          <Popup>
                            <div className="text-navy-950 text-xs p-1 space-y-1 font-sans">
                              <p className="font-bold text-slate-900">{loc.customer_name}</p>
                              <p className="text-[10px] text-slate-500">Node: {loc.type}</p>
                              <p className="text-[10px] text-slate-500">Location: {loc.city}</p>
                              {loc.amount && <p className="font-bold text-slate-800">₹{parseFloat(loc.amount).toLocaleString()}</p>}
                              <p className={`text-[10px] font-bold ${loc.risk_score >= 70 ? 'text-red-600' : 'text-emerald-600'}`}>
                                Risk Index: {loc.risk_score.toFixed(1)}%
                              </p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}

                      {/* Hotspots Heatmap Circles */}
                      {hotspots.map((hs, i) => (
                        <CircleMarker
                          key={`hs-${i}`}
                          center={[hs.lat, hs.lon]}
                          radius={20 + (hs.cases * 2)}
                          fillColor="#FF9933"
                          color="#FF9933"
                          weight={0}
                          opacity={0.2}
                          fillOpacity={0.15}
                        >
                          <Popup>
                            <div className="text-navy-950 text-xs font-sans">
                              <p className="font-bold">{hs.city} (Hotspot)</p>
                              <p className="text-[10px]">Active Cases: {hs.cases}</p>
                              <p className="text-[10px] text-red-600 font-bold">Severity: {hs.severity}</p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}

                      {/* Impossible Travel Vector Lines */}
                      {impossibleTravels.map(it => (
                        <Polyline
                          key={it.id}
                          positions={[it.from, it.to]}
                          pathOptions={{
                            color: '#EF4444',
                            weight: 2,
                            dashArray: '5, 8',
                            className: 'animate-pulse'
                          }}
                        >
                          <Popup>
                            <div className="text-navy-950 text-xs font-sans">
                              <p className="font-bold text-red-600">Impossible Travel Alert</p>
                              <p className="text-[10px]">Subject: {it.name}</p>
                              <p className="text-[10px] text-slate-600">Speed: ~{it.speed} km/h (Exceeds air speed limits)</p>
                            </div>
                          </Popup>
                        </Polyline>
                      ))}
                    </MapContainer>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Sidebar telemetry */}
            <div className="lg:col-span-1 space-y-6 text-left">
              <GlassCard title="Compliance Telemetry" hoverable={false}>
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FaGlobeAsia className="text-lg text-blue-400" />
                    <div>
                      <strong className="text-slate-200 block">Total Coordinates Map</strong>
                      <span>{locations.length} live active markers</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <FaPlaneDeparture className="text-lg text-red-400" />
                    <div>
                      <strong className="text-red-400 block">Impossible Travel</strong>
                      <span>{impossibleTravels.length} vector alerts running</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <FaShieldAlt className="text-lg text-emerald-400" />
                    <div>
                      <strong className="text-emerald-400 block">Active Protection</strong>
                      <span>Shield auto-block enabled</span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard title="Active Hotspots list" hoverable={false}>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {hotspots.map((hs, i) => (
                    <div key={i} className="p-2 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{hs.city}</p>
                        <span className="text-[10px] text-slate-500">Coordinates: {hs.lat.toFixed(2)}, {hs.lon.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          hs.severity === 'Critical' ? 'bg-red-950 text-red-400' : 'bg-orange-950 text-orange-400'
                        }`}>
                          {hs.severity}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-400 mt-0.5">{hs.cases} Cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MapPage;
