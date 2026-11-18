import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { Navbar } from './components/Navbar.js';

// Pages
import { LandingPage } from './pages/LandingPage.js';
import { JoinPage } from './pages/JoinPage.js';
import { CreateCirclePage } from './pages/CreateCirclePage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ElderModePage } from './pages/ElderModePage.js';
import { MedicationsPage } from './pages/MedicationsPage.js';
import { AppointmentsPage } from './pages/AppointmentsPage.js';
import { SuggestionsPage } from './pages/SuggestionsPage.js';
import { EmergencyCardPage } from './pages/EmergencyCardPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-100 text-teal-800 font-black text-2xl animate-pulse">
        Connecting to CareCircle...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/join" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main id="main-content" className="flex-1">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/join" element={<JoinPage />} />
                    <Route path="/create-circle" element={<CreateCirclePage />} />

                    {/* Protected Member Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/elder"
                      element={
                        <ProtectedRoute>
                          <ElderModePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/medications"
                      element={
                        <ProtectedRoute>
                          <MedicationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/appointments"
                      element={
                        <ProtectedRoute>
                          <AppointmentsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/suggestions"
                      element={
                        <ProtectedRoute>
                          <SuggestionsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/emergency-card"
                      element={
                        <ProtectedRoute>
                          <EmergencyCardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
