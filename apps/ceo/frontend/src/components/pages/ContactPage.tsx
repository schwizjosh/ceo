import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { PyAvatar } from '../common/PyAvatar';
import { Mail, ArrowLeft, Calendar, MessageSquare, Clock } from 'lucide-react';

interface ContactPageProps {
  onBack?: () => void;
}

const conciergeNotes = [
  {
    title: 'Workshop with Py',
    detail: 'Schedule a live collaborative session where he maps your company strategy while you watch.'
  },
  {
    title: 'Migration support',
    detail: 'Bring existing documents, tone guides, and campaigns—our team helps onboard them into his memory.'
  },
  {
    title: 'Enterprise rituals',
    detail: 'Design weekly and monthly cadences so Py plugs into your leadership meetings.'
  }
];

export const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', company: '', message: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-slate-900">
      <header className="border-b border-slate-200 bg-[#f8f6f2]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <Button onClick={handleBack} variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <PyAvatar size="sm" className="ring-2 ring-slate-200" />
            <span className="font-display text-lg font-semibold tracking-tight">Speak with Py’s team</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-16">
        <section className="mb-12 space-y-6">
          <div className="eyebrow">Connection</div>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Let’s orchestrate your strategy together.</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Tell us what you are building, launching, or reimagining. A member of our team—and often Py himself—will reply with next steps within one business day.
          </p>
        </section>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
            {submitted ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900/90 text-white">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="font-display text-2xl font-semibold">Message received.</h2>
                <p className="mt-3 text-sm text-slate-600">
                  We’ll write back shortly with a suggested session time and a few prompts from Py to get started.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Adaeze Obi"
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="you@company.com"
                />

                <Input
                  label="Company or project"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Raysource Labs"
                />

                <Textarea
                  label="How can Py help?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  placeholder="Share the milestones ahead, the channels you own, or the conversations you want him to lead."
                  rows={6}
                />

                <Button type="submit" className="w-full">Send message</Button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-xl font-semibold">How we coordinate</h2>
              <ul className="mt-4 space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>Reply within 24 hours with next steps and prep materials.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>Typical discovery calls last 30 minutes and include a live demo with Py.</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span>Prefer async? We can coordinate via email or WhatsApp.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-xl font-semibold">Concierge support</h2>
              <ul className="mt-4 space-y-4 text-sm text-slate-600">
                {conciergeNotes.map((note) => (
                  <li key={note.title}>
                    <p className="font-medium text-slate-900">{note.title}</p>
                    <p>{note.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary-50 to-accent-50 p-6 text-sm">
              <p className="font-semibold text-slate-900 mb-2">Prefer to speak immediately?</p>
              <p className="text-slate-700 mb-3">
                Call us at <a href="tel:+2348086512223" className="font-medium text-primary-700 hover:text-primary-900">+234 808 651 2223</a>
              </p>
              <Button
                size="sm"
                onClick={() => window.open('https://wa.me/2347069719374', '_blank')}
                className="w-full"
              >
                Start a WhatsApp chat
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <PyAvatar size="sm" className="ring-2 ring-slate-200" />
              <p>© {new Date().getFullYear()} Py. All rights reserved.</p>
            </div>
            <a href="https://py.raysourcelabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">
              py.raysourcelabs.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
