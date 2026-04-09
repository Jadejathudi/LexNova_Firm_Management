import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import BookConsultation from './pages/BookConsultation';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import AILegalGuide from './pages/AILegalGuide';
import DocumentVault from './pages/DocumentVault';
import SecureMessaging from './pages/SecureMessaging';
import Profile from './pages/Profile';
import CRMLayout from './pages/crm/CRMLayout';
import CRMDashboardPage from './pages/crm/CRMDashboardPage';
import CRMMatters from './pages/crm/CRMMatters';
import CRMClients from './pages/crm/CRMClients';
import CRMTeam from './pages/crm/CRMTeam';
import CRMFinance from './pages/crm/CRMFinance';
import CRMConsultations from './pages/crm/CRMConsultations';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function ClientRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'client') return <Navigate to="/crm" />;
  return children;
}

function InternalRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'client') return <Navigate to="/dashboard" />;
  return children;
}

function ClientLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <BottomNav />
    </>
  );
}

function InternalLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/book" element={<BookConsultation />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/ai-guide" element={<><Navbar /><AILegalGuide /><BottomNav /></>} />

      {/* Client routes */}
      <Route path="/dashboard" element={
        <ClientRoute><ClientLayout><Dashboard /></ClientLayout></ClientRoute>
      } />
      <Route path="/cases" element={
        <ClientRoute><ClientLayout><CasesList /></ClientLayout></ClientRoute>
      } />
      <Route path="/cases/:id" element={
        <PrivateRoute><ClientLayout><CaseDetail /></ClientLayout></PrivateRoute>
      } />
      <Route path="/documents" element={
        <PrivateRoute><ClientLayout><DocumentVault /></ClientLayout></PrivateRoute>
      } />
      <Route path="/chat" element={
        <PrivateRoute><ClientLayout><SecureMessaging /></ClientLayout></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><ClientLayout><Profile /></ClientLayout></PrivateRoute>
      } />

      {/* CRM (internal) routes */}
      <Route path="/crm" element={
        <InternalRoute><InternalLayout><CRMLayout /></InternalLayout></InternalRoute>
      }>
        <Route index element={<CRMDashboardPage />} />
        <Route path="matters" element={<CRMMatters />} />
        <Route path="clients" element={<CRMClients />} />
        <Route path="team" element={<CRMTeam />} />
        <Route path="finance" element={<CRMFinance />} />
        <Route path="consultations" element={<CRMConsultations />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
