import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages Import
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import OTPVerification from './pages/OTPVerification';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import FraudRings from './pages/FraudRings';
import RiskAnalysis from './pages/RiskAnalysis';
import VictimAlerts from './pages/VictimAlerts';
import Investigations from './pages/Investigations';
import SARReports from './pages/SARReports';
import ModelMetrics from './pages/ModelMetrics';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import MapPage from './pages/Map';

// Protected Route Checker
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user_profile');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.is_otp_verified === false) {
      return <Navigate to="/otp-verification" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />

        {/* Dashboard Command Console (Protected) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/transactions" element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        } />

        <Route path="/accounts" element={
          <ProtectedRoute>
            <Accounts />
          </ProtectedRoute>
        } />

        <Route path="/fraud-rings" element={
          <ProtectedRoute>
            <FraudRings />
          </ProtectedRoute>
        } />

        <Route path="/risk-analysis" element={
          <ProtectedRoute>
            <RiskAnalysis />
          </ProtectedRoute>
        } />

        <Route path="/victim-alerts" element={
          <ProtectedRoute>
            <VictimAlerts />
          </ProtectedRoute>
        } />

        <Route path="/investigations" element={
          <ProtectedRoute>
            <Investigations />
          </ProtectedRoute>
        } />

        <Route path="/sar-reports" element={
          <ProtectedRoute>
            <SARReports />
          </ProtectedRoute>
        } />

        <Route path="/model-metrics" element={
          <ProtectedRoute>
            <ModelMetrics />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />

        <Route path="/map" element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        } />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
