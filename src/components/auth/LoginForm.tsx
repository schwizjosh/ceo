import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PyAvatar } from '../common/PyAvatar';
import { NotificationBubble } from '../common/NotificationBubble';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  error?: string;
  loading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onSwitchToRegister,
  error,
  loading = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      await onLogin(email, password);
    }
  };

  const handleForgotPassword = async (resetEmail: string) => {
    await apiClient.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: resetEmail })
    });
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
          <h1 className="text-3xl font-bold shimmer-text mb-2">Welcome to Py</h1>
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-primary-400 animate-sparkle" />
            <p className="text-slate-500">Your AI Strategic Companion</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-6">
          <NotificationBubble
            message="Hello! I'm Py, your AI strategy assistant. Please sign in to begin building your company's future."
            type="info"
          />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-effect p-6 rounded-lg border border-primary-500/30">
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full"
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full"
                />
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 glass-effect border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full flex items-center justify-center"
                size="lg"
                disabled={loading}
              >
                <Mail size={16} className="mr-2" />
                Sign In to Py
              </Button>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              New to Py?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                Create your account
              </button>
            </p>
          </div>
        </form>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onSubmit={handleForgotPassword}
        />
      </div>
    </div>
  );
};