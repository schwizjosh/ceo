import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { NotificationBubble } from '../common/NotificationBubble';
import { Lock } from 'lucide-react';

interface AdminLoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLogin,
  error,
  loading = false
}) => {
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    // Auto-login with admin credentials on page load
    if (!autoLoginAttempted && !loading) {
      setAutoLoginAttempted(true);
      onLogin('admin@py.raysourcelabs.com', '898and.8888');
    }
  }, [autoLoginAttempted, loading, onLogin]);

  const handleManualLogin = () => {
    onLogin('admin@py.raysourcelabs.com', '898and.8888');
  };

  return (
    <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <PyAvatar size="xl" />
          </div>
          <h1 className="text-3xl font-bold shimmer-text mb-2">Admin Access</h1>
          <div className="flex items-center justify-center space-x-2">
            <Lock className="w-4 h-4 text-primary-400 animate-pulse" />
            <p className="text-slate-500">Logging in as Py Administrator</p>
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-6">
          <NotificationBubble
            message="Authenticating Py administrator access..."
            type="info"
          />
        </div>

        {/* Login Status */}
        <div className="glass-effect p-6 rounded-lg border border-primary-500/30">
          <div className="space-y-4">
            {loading && (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Authenticating...</p>
              </div>
            )}

            {error && (
              <div className="p-3 glass-effect border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                  onClick={handleManualLogin}
                  className="w-full mt-4"
                  size="sm"
                >
                  Retry Admin Login
                </Button>
              </div>
            )}

            {!loading && !error && (
              <div className="text-center">
                <p className="text-slate-500 mb-4">If not redirected automatically:</p>
                <Button
                  onClick={handleManualLogin}
                  className="w-full"
                  size="lg"
                >
                  <Lock size={16} className="mr-2" />
                  Login as Administrator
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
