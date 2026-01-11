import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import UserPortal from './components/UserPortal';
import AdminPortal from './components/AdminPortal';
import SimulatorPortal from './components/SimulatorPortal';
import GuardConsole from './components/GuardConsole';
import GuardAuth from './components/GuardAuth';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Not logged in -> Redirect to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user's role is allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Guard trying to access Admin -> Redirect to Guard Console
    if (user.role === 'GUARD') {
      return <Navigate to="/guard" replace />;
    }
    // Default redirect to landing
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/guard-login" element={<Navigate to="/guard" replace />} />
          <Route path="/guard" element={<GuardConsole />} />
          <Route path="/user" element={<UserPortal />} />
          <Route path="/simulator" element={<SimulatorPortal />} />

          {/* Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPortal />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
