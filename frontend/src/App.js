import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Layout (static - needed immediately)
import Layout from './components/Layout/Layout';
import Disclaimer from './components/common/Disclaimer';

// Landing page (lazy loaded)
const Landing = React.lazy(() => import('./pages/Landing/Landing'));

// Auth pages (lazy loaded)
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Signup = React.lazy(() => import('./pages/Auth/Signup'));
const JoinRelationship = React.lazy(() => import('./pages/Auth/JoinRelationship'));
const ForgotPassword = React.lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/Auth/ResetPassword'));

// Main pages (lazy loaded)
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const Assessments = React.lazy(() => import('./pages/Assessments/Assessments'));
const AssessmentQuiz = React.lazy(() => import('./pages/Assessments/AssessmentQuiz'));
const Matchup = React.lazy(() => import('./pages/Matchup/Matchup'));
const DailyLog = React.lazy(() => import('./pages/DailyLog/DailyLog'));
const Strategies = React.lazy(() => import('./pages/Strategies/Strategies'));
const Reports = React.lazy(() => import('./pages/Reports/Reports'));
const Settings = React.lazy(() => import('./pages/Settings/Settings'));
const ScheduleMeeting = React.lazy(() => import('./pages/Meetings/ScheduleMeeting'));
const Gratitude = React.lazy(() => import('./pages/Gratitude/Gratitude'));

// Course pages (lazy loaded)
// const Subscribe = React.lazy(() => import('./pages/Subscribe/Subscribe')); // FREE ERA: removed
const CourseJourney = React.lazy(() => import('./pages/Course/Journey'));
const CourseWeekDetail = React.lazy(() => import('./pages/Course/WeekDetail'));

// Therapist pages (lazy loaded)
const TherapistDashboard = React.lazy(() => import('./pages/Therapist/TherapistDashboard'));
const ClientProgress = React.lazy(() => import('./pages/Therapist/ClientProgress'));
const SessionPrep = React.lazy(() => import('./pages/Therapist/SessionPrep'));
const CoupleView = React.lazy(() => import('./pages/Therapist/CoupleView'));
const AlertsPage = React.lazy(() => import('./pages/Therapist/AlertsPage'));
const TreatmentPlanner = React.lazy(() => import('./pages/Therapist/TreatmentPlanner'));

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('./pages/Admin'));
const AdminUsers = React.lazy(() => import('./pages/Admin/Users'));
const AdminUserDetail = React.lazy(() => import('./pages/Admin/UserDetail'));
const AdminAnalytics = React.lazy(() => import('./pages/Admin/Analytics'));
const AdminPushNotifications = React.lazy(() => import('./pages/Admin/PushNotifications'));
const AdminSubscriptions = React.lazy(() => import('./pages/Admin/Subscriptions'));
const CommandCenter = React.lazy(() => import('./pages/Admin/CommandCenter'));

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

// Therapist Route wrapper
const TherapistRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.role !== 'therapist') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setOverlaysWebView({ overlay: false });
    }
  }, []);

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
        {/* Landing page — unauthenticated users see this at root */}
        <Route
          path="/welcome"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />

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
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
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
          <Route path="meetings" element={<ScheduleMeeting />} />
          <Route path="gratitude" element={<Gratitude />} />
          {/* <Route path="subscribe" element={<Subscribe />} /> FREE ERA: removed */}
          {/* Course routes */}
          <Route path="course" element={<CourseJourney />} />
          <Route path="course/week" element={<CourseWeekDetail />} />
          <Route path="course/week/:weekNumber" element={<CourseWeekDetail />} />
          {/* Therapist routes */}
          <Route path="therapist" element={<TherapistRoute><TherapistDashboard /></TherapistRoute>} />
          <Route path="therapist/clients/:id" element={<TherapistRoute><ClientProgress /></TherapistRoute>} />
          <Route path="therapist/clients/:id/session-prep" element={<TherapistRoute><SessionPrep /></TherapistRoute>} />
          <Route path="therapist/clients/:id/treatment-plan" element={<TherapistRoute><TreatmentPlanner /></TherapistRoute>} />
          <Route path="therapist/couples/:id" element={<TherapistRoute><CoupleView /></TherapistRoute>} />
          <Route path="therapist/alerts" element={<TherapistRoute><AlertsPage /></TherapistRoute>} />
          {/* Admin routes - protected by backend + frontend checks */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/users/:id" element={<AdminUserDetail />} />
          <Route path="admin/analytics" element={<AdminAnalytics />} />
          <Route path="admin/push" element={<AdminPushNotifications />} />
          <Route path="admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="admin/command-center" element={<CommandCenter />} />
        </Route>

        {/* Catch all — send unauthenticated to landing, authenticated to dashboard */}
        <Route path="*" element={<CatchAll />} />
      </Routes>
      </React.Suspense>
    </>
  );
}

// Catch-all route that directs based on auth state
const CatchAll = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/welcome" replace />;
};

export default App;
