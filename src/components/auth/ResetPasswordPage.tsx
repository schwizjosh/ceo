import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { AndoraAvatar } from '../common/AndoraAvatar';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);

    try {
      await apiClient.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-accent-500/8 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AndoraAvatar size="xl" />
          </div>
          <h1 className="text-3xl font-bold shimmer-text mb-2">Reset Your Password</h1>
          <p className="text-slate-500">Create a new password for your account</p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="glass-effect p-8 rounded-lg border border-primary-500/30 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-dark-900 mb-2">Password Reset Successful!</h2>
            <p className="text-slate-600 mb-4">
              Your password has been updated. Redirecting you to login...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-effect p-6 rounded-lg border border-primary-500/30">
              <div className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full"
                  disabled={!token || loading}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full"
                  disabled={!token || loading}
                />

                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-xs text-slate-600">
                    Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters for security.
                  </p>
                </div>

                {error && (
                  <div className="p-3 glass-effect border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full flex items-center justify-center"
                  size="lg"
                  disabled={loading || !token}
                >
                  <Lock size={16} className="mr-2" />
                  Reset Password
                </Button>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
