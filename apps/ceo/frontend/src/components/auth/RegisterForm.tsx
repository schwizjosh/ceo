import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PyAvatar } from '../common/PyAvatar';
import { NotificationBubble } from '../common/NotificationBubble';
import { UserPlus, Sparkles } from 'lucide-react';

interface RegisterFormProps {
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onSwitchToLogin: () => void;
  error?: string;
  loading?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onSwitchToLogin,
  error,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Registration form submitted:', {
      name: formData.name,
      email: formData.email,
      passwordLength: formData.password.length,
      passwordsMatch: formData.password === formData.confirmPassword,
      loading
    });
    
    if (loading) return; // Prevent double submission
    
    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Passwords do not match');
      // Don't submit if passwords don't match
      return;
    }
    
    if (formData.name && formData.email && formData.password) {
      try {
        console.log('🚀 Calling onRegister...');
        await onRegister(formData.email, formData.password, formData.name);
        console.log('✅ onRegister completed');
      } catch (error) {
        console.error('❌ Registration submission error:', error);
      }
    } else {
      console.log('❌ Form validation failed:', {
        hasName: !!formData.name,
        hasEmail: !!formData.email,
        hasPassword: !!formData.password
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <h1 className="text-3xl font-bold shimmer-text mb-2">Join Py</h1>
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-primary-400 animate-sparkle" />
            <p className="text-slate-500">Begin Your Strategic Journey</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-6">
          <NotificationBubble
            message="Welcome! I'm excited to help you build a powerful company strategy. Let's set up your account to get started."
            type="success"
          />
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-effect p-6 rounded-lg border border-primary-500/30">
            <div className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a password"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                required
                error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
              />

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
                disabled={loading || formData.password !== formData.confirmPassword}
              >
                <UserPlus size={16} className="mr-2" />
                Create Py Account
              </Button>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};