import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LiveMatchesPage from './pages/LiveMatchesPage';
import MatchDetailsPage from './pages/MatchDetailsPage';
import MatchResultPage from './pages/MatchResultPage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TossPage from './pages/TossPage';
import PlayingXIPage from './pages/PlayingXIPage';
import AdminScoringConsolePage from './pages/AdminScoringConsolePage';
import { useAuth } from './context/AuthContext';

// Protected Route Component for Admin controls
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="py-20 text-center text-slate-500">Checking authorization...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveMatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailsPage />} />
          <Route path="/result/:id" element={<MatchResultPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/toss/:id"
            element={
              <ProtectedRoute>
                <TossPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/playing-xi/:id"
            element={
              <ProtectedRoute>
                <PlayingXIPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/score/:id"
            element={
              <ProtectedRoute>
                <AdminScoringConsolePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
