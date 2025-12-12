import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useScrollToTop } from './hooks/useScrollToTop';
import { LoadingFallback } from './components/common/LoadingFallback';
import { InstallAppBanner } from './components/common/InstallAppBanner';

// Lazy load all route components for code splitting
const HomePage = lazy(() => import('./components/pages/HomePage').then(m => ({ default: m.HomePage })));
const ContactPage = lazy(() => import('./components/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const PricingPage = lazy(() => import('./components/pages/PricingPage').then(m => ({ default: m.PricingPage })));
const BiographyPage = lazy(() => import('./components/pages/BiographyPage').then(m => ({ default: m.BiographyPage })));
const LoginForm = lazy(() => import('./components/auth/LoginForm').then(m => ({ default: m.LoginForm })));
const RegisterForm = lazy(() => import('./components/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const DemoLoginPage = lazy(() => import('./components/auth/DemoLoginPage').then(m => ({ default: m.DemoLoginPage })));
const AdminLoginPage = lazy(() => import('./components/auth/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const AppOnboarding = lazy(() => import('./components/onboarding/AppOnboarding').then(m => ({ default: m.AppOnboarding })));

function AppRoutes() {
  const navigate = useNavigate();

  // Automatically scroll to top on route changes
  useScrollToTop();

  const {
    authUser,
    isAuthenticated,
    isAdmin,
    authLoading,
    authError,
    login,
    register,
    logout
  } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Onboarding route */}
        <Route path="/welcome" element={<AppOnboarding />} />

      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/biography" element={<BiographyPage />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : !hasSeenOnboarding ? (
            <Navigate to="/welcome" replace />
          ) : (
            <LoginForm
              onLogin={login}
              onSwitchToRegister={() => navigate('/register')}
              error={authError || undefined}
              loading={authLoading}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : !hasSeenOnboarding ? (
            <Navigate to="/welcome" replace />
          ) : (
            <RegisterForm
              onRegister={register}
              onSwitchToLogin={() => navigate('/login')}
              error={authError || undefined}
              loading={authLoading}
            />
          )
        }
      />

      {/* Hidden demo/admin login routes */}
      <Route
        path="/898-demo"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <DemoLoginPage
              onLogin={login}
              error={authError || undefined}
              loading={authLoading}
            />
          )
        }
      />
      <Route
        path="/898-admin"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AdminLoginPage
              onLogin={login}
              error={authError || undefined}
              loading={authLoading}
            />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <Dashboard user={authUser!} onLogout={logout} isAdmin={isAdmin} />
          )
        }
      />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <InstallAppBanner />
    </BrowserRouter>
  );
}

export default App;
