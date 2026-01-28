import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';

// Layout
import Layout from './components/Layout/Layout';
import Disclaimer from './components/common/Disclaimer';

// Auth pages
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import JoinRelationship from './pages/Auth/JoinRelationship';

// Main pages
import Dashboard from './pages/Dashboard/Dashboard';
import Assessments from './pages/Assessments/Assessments';
import AssessmentQuiz from './pages/Assessments/AssessmentQuiz';
import Matchup from './pages/Matchup/Matchup';
import DailyLog from './pages/DailyLog/DailyLog';
import Strategies from './pages/Strategies/Strategies';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';

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
    </>
  );
}

export default App;
