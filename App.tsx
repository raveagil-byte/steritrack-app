import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginView from './views/LoginView';
import CSSDView from './views/CSSDView';
import NurseView from './views/NurseView';
import InventoryView from './views/InventoryView';
import AnalyticsView from './views/AnalyticsView';
import ActivityLogView from './views/ActivityLogView';
import AdminView from './views/AdminView';
import ProfileView from './views/ProfileView';
import { Layout } from './components/Layout';
import { Role } from './types';
import { Toaster } from './components/ui/Toaster';

// Protected Route Wrapper
const ProtectedRoute = ({ roles, children }: { roles?: Role[], children: React.ReactNode }) => {
  const { currentUser } = useAppContext();

  if (!currentUser) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/inventory" replace />} />

        <Route path="/cssd" element={
          <ProtectedRoute roles={[Role.ADMIN, Role.CSSD]}>
            <CSSDView />
          </ProtectedRoute>
        } />

        <Route path="/nurse" element={
          <ProtectedRoute roles={[Role.ADMIN, Role.NURSE]}>
            <NurseView />
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={<InventoryView />} />

        <Route path="/admin/*" element={
          <ProtectedRoute roles={[Role.ADMIN]}>
            <AdminView />
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={<AnalyticsView />} />

        <Route path="/activity" element={<ActivityLogView />} />

        <Route path="/profile" element={<ProfileView />} />
      </Route>

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppRoutes />
        <Toaster />
      </ThemeProvider>
    </AppProvider>
  );
};

export default App;
