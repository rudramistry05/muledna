import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaColumns, 
  FaExchangeAlt, 
  FaUsers, 
  FaProjectDiagram, 
  FaShieldAlt, 
  FaExclamationTriangle,
  FaFileInvoiceDollar, 
  FaSearch, 
  FaChartLine, 
  FaCog, 
  FaUserShield,
  FaSignOutAlt,
  FaGlobeAsia
} from 'react-icons/fa';
import { authAPI } from '../services/api';

const Sidebar = () => {
  // Grab current user from profile cache
  const userString = localStorage.getItem('user_profile');
  const user = userString ? JSON.parse(userString) : { role: 'Bank Employee', full_name: 'Amit Sharma' };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaColumns /> },
    { name: 'Transactions', path: '/transactions', icon: <FaExchangeAlt /> },
    { name: 'Accounts', path: '/accounts', icon: <FaUsers /> },
    { name: 'Fraud Rings', path: '/fraud-rings', icon: <FaProjectDiagram /> },
    { name: 'Risk Analysis', path: '/risk-analysis', icon: <FaShieldAlt /> },
    { name: 'Victim Alerts', path: '/victim-alerts', icon: <FaExclamationTriangle /> },
    { name: 'Investigations', path: '/investigations', icon: <FaSearch /> },
    { name: 'SAR Reports', path: '/sar-reports', icon: <FaFileInvoiceDollar /> },
    { name: 'Model Metrics', path: '/model-metrics', icon: <FaChartLine /> },
    { name: 'Real-Time Map', path: '/map', icon: <FaGlobeAsia /> },
    { name: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div className="flex flex-col">
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-boi-saffron rounded-lg flex items-center justify-center font-bold text-navy-950 text-xl font-display shadow-neon-saffron">
            BOI
          </div>
          <div>
            <h1 className="text-md font-bold tracking-wider text-slate-100 uppercase">MuleDNA</h1>
            <span className="text-[10px] text-boi-saffron font-semibold font-mono tracking-widest uppercase">AML Division</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-boi-saffron text-navy-950 font-bold shadow-neon-saffron'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
          
          {/* Conditional Admin Panel link */}
          {user.role === 'Admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-red-500 text-slate-950 font-bold shadow-neon-red'
                    : 'text-red-400/90 hover:text-red-300 hover:bg-red-950/20'
                }`
              }
            >
              <FaUserShield />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* User Session profile panel */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-boi-saffron border border-slate-700">
              {user.full_name?.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.full_name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
            title="Log Out"
          >
            <FaSignOutAlt className="text-sm" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
