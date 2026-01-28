import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Layout (static - needed immediately)
import Layout from './components/Layout/Layout';
import Disclaimer from './components/common/Disclaimer';

// Auth pages (lazy loaded)
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Signup = React.lazy(() => import('./pages/Auth/Signup'));
const JoinRelationship = React.lazy(() => import('./pages/Auth/JoinRelationship'));

// Main pages (lazy loaded)
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const Assessments = React.lazy(() => import('./pages/Assessments/Assessments'));
const AssessmentQuiz = React.lazy(() => import('./pages/Assessments/AssessmentQuiz'));
const Matchup = React.lazy(() => import('./pages/Matchup/Matchup'));
const DailyLog = React.lazy(() => import('./pages/DailyLog/DailyLog'));
const Strategies = React.lazy(() => import('./pages/Strategies/Strategies'));
const Reports = React.lazy(() => import('./pages/Reports/Reports'));
const Settings = React.lazy(() => import('./pages/Settings/Settings'));

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route wrapper (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <>
      <Disclaimer />
      <React.Suspense
        fallback={
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <CircularProgress />
          </Box>
        }
      >
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/join/:code"
          element={<JoinRelationship />}
        />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="assessments/:type" element={<AssessmentQuiz />} />
          <Route path="matchup" element={<Matchup />} />
          <Route path="daily" element={<DailyLog />} />
          <Route path="strategies" element={<Strategies />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </React.Suspense>
    </>
  );
}

export default App;
