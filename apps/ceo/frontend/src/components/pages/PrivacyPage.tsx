import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';

interface PrivacyPageProps {
  onBack?: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30 text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-20 glass-effect border-b border-primary-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PyAvatar size="md" />
              <span className="text-xl font-bold shimmer-text">Py</span>
            </div>
            <Button onClick={handleBack} variant="outline" className="flex items-center">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="bg-primary-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-primary-300" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 shimmer-text">Privacy Policy</h1>
            <p className="text-xl text-slate-600">
              Last Updated: October 2025
            </p>
            <p className="text-slate-500 mt-4">
              Your privacy is important to us. This policy outlines how Py collects, uses, and protects your information.
            </p>
          </div>

          {/* Quick Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="glass-effect p-6 rounded-lg border border-primary-500/20 text-center">
              <Lock className="w-8 h-8 text-primary-300 mx-auto mb-3" />
              <h3 className="font-semibold text-primary-900 mb-2">Secure by Default</h3>
              <p className="text-sm text-slate-500">Your data is encrypted and protected</p>
            </div>
            <div className="glass-effect p-6 rounded-lg border border-accent-500/20 text-center">
              <Eye className="w-8 h-8 text-accent-300 mx-auto mb-3" />
              <h3 className="font-semibold text-primary-900 mb-2">Full Transparency</h3>
              <p className="text-sm text-slate-500">We're clear about data collection</p>
            </div>
            <div className="glass-effect p-6 rounded-lg border border-purple-500/20 text-center">
              <FileText className="w-8 h-8 text-purple-300 mx-auto mb-3" />
              <h3 className="font-semibold text-primary-900 mb-2">Your Control</h3>
              <p className="text-sm text-slate-500">You own and control your data</p>
            </div>
          </div>

          {/* Policy Content */}
          <div className="glass-effect p-8 rounded-lg border border-primary-500/20 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">1. Information We Collect</h2>
              <div className="space-y-4 text-slate-600">
                <div>
                  <h3 className="text-lg font-semibold text-primary-800 mb-2">Account Information</h3>
                  <p className="text-slate-500">
                    When you register for Py, we collect your email address, name, and password.
                    This information is necessary to create and maintain your account.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-800 mb-2">Company & Content Data</h3>
                  <p className="text-slate-500">
                    We store the company information, strategies, team members, and content you create within Py.
                    This data is essential to provide our services and remains under your complete control.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-800 mb-2">Usage Information</h3>
                  <p className="text-slate-500">
                    We collect information about how you use Py, including features accessed, AI models used,
                    and token consumption. This helps us improve our service and provide better support.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">2. How We Use Your Information</h2>
              <div className="space-y-3 text-slate-500">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain the Py platform</li>
                  <li>Generate AI-powered content and strategies</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send service-related notifications and updates</li>
                  <li>Improve our services and develop new features</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Ensure platform security and prevent fraud</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">3. Data Sharing and Disclosure</h2>
              <div className="space-y-4 text-slate-500">
                <p>
                  <strong className="text-slate-600">We do not sell your personal information.</strong> We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong className="text-slate-600">AI Service Providers:</strong> Your content is processed by OpenAI and Anthropic to generate AI responses. These providers have their own privacy policies and data handling practices.</li>
                  <li><strong className="text-slate-600">Service Providers:</strong> We work with trusted third parties for payment processing, hosting, and analytics.</li>
                  <li><strong className="text-slate-600">Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and users.</li>
                  <li><strong className="text-slate-600">Business Transfers:</strong> In the event of a merger or acquisition, your data may be transferred to the new entity.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">4. Data Security</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication and password hashing</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and monitoring</li>
                  <li>Secure cloud infrastructure (Supabase)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">5. Your Rights and Choices</h2>
              <div className="space-y-3 text-slate-500">
                <p>You have the following rights regarding your data:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong className="text-slate-600">Access:</strong> Request a copy of your personal data</li>
                  <li><strong className="text-slate-600">Correction:</strong> Update or correct your information</li>
                  <li><strong className="text-slate-600">Deletion:</strong> Request deletion of your account and data</li>
                  <li><strong className="text-slate-600">Export:</strong> Export your company and content data</li>
                  <li><strong className="text-slate-600">Opt-Out:</strong> Unsubscribe from marketing communications</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, contact us at <a href="mailto:privacy@py.raysourcelabs.com" className="text-primary-400 hover:text-primary-300">privacy@py.raysourcelabs.com</a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">6. Cookies and Tracking</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  Py uses cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintain your login session</li>
                  <li>Remember your preferences</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized experiences</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings, but disabling them may affect platform functionality.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">7. Data Retention</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  We retain your data for as long as your account is active or as needed to provide services.
                  When you delete your account, we will delete your personal data within 30 days, except where
                  retention is required for legal or legitimate business purposes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">8. Children's Privacy</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  Py is not intended for users under the age of 13. We do not knowingly collect information
                  from children under 13. If you believe we have collected such information, please contact us
                  immediately.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">9. International Users</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  Py is operated from the United States. If you access our service from outside the U.S.,
                  your data may be transferred to and processed in the United States. By using Py, you
                  consent to this transfer and processing.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">10. Changes to This Policy</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of significant changes
                  by email or through the platform. Your continued use of Py after changes take effect
                  constitutes acceptance of the updated policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">11. Contact Us</h2>
              <div className="space-y-3 text-slate-500">
                <p>
                  If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="glass-effect p-6 rounded-lg border border-primary-500/20 mt-4">
                  <p className="font-semibold text-primary-800 mb-2">Py by Raysource Labs</p>
                  <p>Email: <a href="mailto:privacy@py.raysourcelabs.com" className="text-primary-400 hover:text-primary-300">privacy@py.raysourcelabs.com</a></p>
                  <p>Website: <a href="https://raysourcelabs.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">raysourcelabs.com</a></p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="mt-12 glass-effect p-8 rounded-lg border border-primary-500/20 text-center bg-gradient-to-br from-primary-900/20 to-purple-900/20">
            <h3 className="text-xl font-semibold text-primary-900 mb-3">Questions About Privacy?</h3>
            <p className="text-slate-600 mb-6">
              Our team is here to help. Reach out anytime with questions or concerns.
            </p>
            <Button onClick={onBack} className="inline-flex items-center">
              <Shield size={16} className="mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
