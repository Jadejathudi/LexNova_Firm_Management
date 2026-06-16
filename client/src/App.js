import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import AdvocatesList from './pages/AdvocatesList';
import AdvocateProfile from './pages/AdvocateProfile';
import BookConsultation from './pages/BookConsultation';
import ConsultationDetails from './pages/ConsultationDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CasesList from './pages/CasesList';
import CaseDetail from './pages/CaseDetail';
import AILegalGuide from './pages/AILegalGuide';
import DocumentVault from './pages/DocumentVault';
import SecureMessaging from './pages/SecureMessaging';
import Profile from './pages/Profile';
import AdvocateDashboard from './pages/AdvocateDashboard';
import CRMLayout from './pages/crm/CRMLayout';
import CRMDashboardPage from './pages/crm/CRMDashboardPage';
import CRMMatters from './pages/crm/CRMMatters';
import CRMCases from './pages/crm/CRMCases';
import CRMClients from './pages/crm/CRMClients';
import CRMTeam from './pages/crm/CRMTeam';
import CRMFinance from './pages/crm/CRMFinance';
import CRMConsultations from './pages/crm/CRMConsultations';
import MattersList from './pages/matters/MattersList';
import MatterDetail from './pages/matters/MatterDetail';
import CorporateLanding from './pages/verticals/CorporateLanding';
import IncomeTaxLanding from './pages/verticals/IncomeTaxLanding';
import ImmigrationLanding from './pages/verticals/ImmigrationLanding';
import BCIDisclaimer from './components/BCIDisclaimer';
import UrgentHelp from './pages/UrgentHelp';
import CompliancePage from './pages/CompliancePage';
import CaseIntelligence from './pages/CaseIntelligence';
import CaseLibrary from './pages/CaseLibrary';
import CaseStrategy from './pages/CaseStrategy';
import CaseMonitoring from './pages/CaseMonitoring';
import BenchLanding from './pages/bench/BenchLanding';
import BenchDirectory from './pages/bench/BenchDirectory';
import BenchJudgeProfile from './pages/bench/BenchJudgeProfile';
import BenchSchedule from './pages/bench/BenchSchedule';
import BenchConfirmed from './pages/bench/BenchConfirmed';
import BenchHowItWorks from './pages/bench/BenchHowItWorks';
import BenchServices from './pages/bench/BenchServices';
import BenchMySessions from './pages/bench/BenchMySessions';
import JudgeLogin from './pages/bench/JudgeLogin';
import JudgeDashboard from './pages/bench/JudgeDashboard';
import JudgeSessionDetails from './pages/bench/JudgeSessionDetails';
import CRMBench from './pages/crm/CRMBench';
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
  if (user.role === 'judge') return <Navigate to="/judge/dashboard" />;
  if (user.role !== 'client') return <Navigate to="/crm" />;
  return children;
}

function InternalRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'client') return <Navigate to="/dashboard" />;
  if (user.role === 'judge') return <Navigate to="/judge/dashboard" />;
  return children;
}

function JudgeRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'judge') return <Navigate to="/login" />;
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
    <>
      <BCIDisclaimer />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/advocates" element={<AdvocatesList />} />
      <Route path="/advocates/:id" element={<AdvocateProfile />} />
      <Route path="/book" element={<BookConsultation />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/ai-guide" element={<><Navbar /><AILegalGuide /><BottomNav /></>} />
      <Route path="/urgent" element={<UrgentHelp />} />
      <Route path="/compliance" element={<CompliancePage />} />
      <Route path="/corporate" element={<CorporateLanding />} />
      <Route path="/income-tax" element={<IncomeTaxLanding />} />
      <Route path="/immigration" element={<ImmigrationLanding />} />
      <Route path="/intelligence" element={<CaseIntelligence />} />
      <Route path="/case-library" element={<CaseLibrary />} />
      <Route path="/case-strategy" element={<CaseStrategy />} />
      <Route path="/case-monitoring" element={<CaseMonitoring />} />

      {/* The Bench — standalone feature, own nav, no existing layout */}
      <Route path="/bench" element={<BenchLanding />} />
      <Route path="/bench/directory" element={<BenchDirectory />} />
      <Route path="/bench/how-it-works" element={<BenchHowItWorks />} />
      <Route path="/bench/services" element={<BenchServices />} />
      <Route path="/bench/judges/:id" element={<BenchJudgeProfile />} />
      <Route path="/bench/schedule/:judgeId" element={<BenchSchedule />} />
      <Route path="/bench/confirmed/:ref" element={<BenchConfirmed />} />
      <Route path="/bench/my-sessions" element={<BenchMySessions />} />

      {/* Judge Portal Routes */}
      <Route path="/judge/login" element={<JudgeLogin />} />
      <Route path="/judge/dashboard" element={<JudgeRoute><JudgeDashboard /></JudgeRoute>} />
      <Route path="/judge/session/:bookingId" element={<JudgeRoute><JudgeSessionDetails /></JudgeRoute>} />

      {/* Client routes */}
      <Route path="/dashboard" element={
        <ClientRoute><ClientLayout><Dashboard /></ClientLayout></ClientRoute>
      } />
      <Route path="/advocate-dashboard" element={
        <PrivateRoute><ClientLayout><AdvocateDashboard /></ClientLayout></PrivateRoute>
      } />
      <Route path="/consultation/:id" element={
        <PrivateRoute><ClientLayout><ConsultationDetails /></ClientLayout></PrivateRoute>
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
      <Route path="/matters" element={
        <PrivateRoute><ClientLayout><MattersList /></ClientLayout></PrivateRoute>
      } />
      <Route path="/matters/:id" element={
        <PrivateRoute><ClientLayout><MatterDetail /></ClientLayout></PrivateRoute>
      } />

      {/* CRM (internal) routes */}
      <Route path="/crm" element={
        <InternalRoute><InternalLayout><CRMLayout /></InternalLayout></InternalRoute>
      }>
        <Route index element={<CRMDashboardPage />} />
        <Route path="matters" element={<CRMMatters />} />
        <Route path="cases" element={<CRMCases />} />
        <Route path="clients" element={<CRMClients />} />
        <Route path="team" element={<CRMTeam />} />
        <Route path="finance" element={<CRMFinance />} />
        <Route path="consultations" element={<CRMConsultations />} />
        <Route path="bench" element={<CRMBench />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </>
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
