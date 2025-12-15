import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { supabase } from '../../lib/supabase';
import { ArrowRight, PenLine, LineChart, Sparkles, Calendar, Radio, Quote, Feather, Check } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  company: string;
  position: string;
  content: string;
  avatar_url?: string;
  rating: number;
}

const featureCards = [
  {
    title: 'Company voice, mastered',
    description:
      "Py learns your tone, style, and messaging, then writes content that feels authentically yours.",
    icon: Feather
  },
  {
    title: 'Strategies that resonate',
    description:
      'From product launches to campaigns, Py crafts strategies that connect with your audience.',
    icon: PenLine
  },
  {
    title: 'Consistency across channels',
    description:
      'Maintain your company voice across every platform—social media, newsletters, blogs, and beyond.',
    icon: LineChart
  }
];

const rituals = [
  {
    label: 'Monthly planning',
    detail: 'Set your themes and strategic arcs. Py transforms them into a complete content calendar.'
  },
  {
    label: 'Content generation',
    detail: 'Generate posts, campaigns, and communications that match your company voice perfectly.'
  },
  {
    label: 'Multi-channel distribution',
    detail: 'One strategy, multiple formats. Py adapts your content for every platform.'
  }
];

const proofPoints = [
  { label: 'Companies supported', value: '210+' },
  { label: 'Strategies delivered monthly', value: '1,800+' },
  { label: 'Average response time', value: '2 min' }
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      // Skip if supabase is not configured (using API backend instead)
      if (!supabase) {
        console.log('Supabase not configured, skipping testimonials fetch');
        return;
      }

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTestimonials(data);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30 text-slate-900 relative">
      {/* Airy Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '4s' }} />
      </div>

      <header className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <button
            className="flex items-center space-x-3"
            onClick={() => navigate('/biography')}
          >
            <PyAvatar size="sm" className="ring-2 ring-slate-200" />
            <span className="font-display text-lg font-semibold tracking-tight">Py</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <button onClick={() => navigate('/pricing')} className="hover:text-slate-900">
              Pricing
            </button>
            <button onClick={() => navigate('/biography')} className="hover:text-slate-900">
              Meet Py
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-slate-900">
              Talk to us
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              Start working with him
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-20 md:grid-cols-[1.1fr_0.9fr] md:items-start">
          <div className="space-y-8">
            <div className="eyebrow">Your strategic partner</div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Meet Py. He is your company's strategist, and keeper of voice.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              He studies your company like a teammate, orchestrates campaigns, writes with empathy, and keeps every channel on message.
              Working with Py feels less like prompting an app and more like briefing a trusted colleague.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/register')} className="w-full sm:w-auto">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open('https://wa.me/2347069719374', '_blank')}
                className="w-full sm:w-auto"
              >
                Speak with our team
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 border-t border-slate-200 pt-6 text-sm text-slate-500">
              {proofPoints.map((item) => (
                <div key={item.label}>
                  <p className="font-display text-2xl text-slate-900">{item.value}</p>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-effect rounded-3xl p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/30 to-primary-200/30 rounded-full blur-2xl"></div>

              <div className="relative z-10 mb-6 flex items-center gap-3">
                <PyAvatar size="md" className="ring-2 ring-slate-200" />
                <div>
                  <p className="font-display text-base font-semibold">Py</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">How it works</p>
                </div>
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">1</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Define your company</h4>
                    <p className="text-sm text-slate-600">Share your voice, values, and vision. Py learns and remembers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">2</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Map your strategy</h4>
                    <p className="text-sm text-slate-600">Set monthly themes and key moments. Py builds your content calendar.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">3</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Create and publish</h4>
                    <p className="text-sm text-slate-600">Generate on-brand content for every channel, ready when you need it.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="surface-muted rounded-3xl p-6">
              <p className="text-sm font-semibold text-slate-600">What Py creates</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-slate-400" />
                  Content that captures your unique voice and values.
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
                  Editorial calendars aligned with your launches and campaigns.
                </li>
                <li className="flex items-start gap-2">
                  <Radio className="mt-0.5 h-4 w-4 text-slate-400" />
                  Platform-ready content for social media, newsletters, and your website.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <div key={title} className="glass-effect flex h-full flex-col justify-between rounded-3xl p-6">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12">
            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl space-y-4">
                <div className="eyebrow">Your workflow</div>
                <h2 className="font-display text-3xl font-semibold">Brief him once, collaborate every day.</h2>
                <p className="text-base text-slate-600">
                  Py joins your workflow, syncs with your strategy, and delivers thoughtful content.
                  He writes, organizes, and strategizes with the consistency of a dedicated team member.
                </p>
              </div>
              <ul className="space-y-4 text-sm text-slate-600 md:max-w-sm">
                {rituals.map((item) => (
                  <li key={item.label} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                    <Check className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-slate-600">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-4">
              <div className="eyebrow">How companies feel</div>
              <h2 className="font-display text-3xl font-semibold">He keeps the room calm and the strategy sharp.</h2>
              <p className="text-base text-slate-600">
                Teams rely on Py to transform ideas into clear, compelling strategies. Here's what partners say after working with him.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 md:max-w-xl">
              {testimonials.map((testimonial) => (
                <blockquote
                  key={testimonial.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]"
                >
                  <Quote className="mb-4 h-5 w-5 text-slate-300" />
                  <p className="text-sm text-slate-700">{testimonial.content}</p>
                  <footer className="mt-4 text-xs text-slate-500">
                    <p className="font-semibold text-slate-800">{testimonial.name}</p>
                    <p>{testimonial.position}</p>
                    <p>{testimonial.company}</p>
                  </footer>
                </blockquote>
              ))}
              {testimonials.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <p className="text-sm text-slate-600">
                    Stories from our partners are coming soon. Be among the first to share what it feels like to co-create with Py.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="rounded-3xl bg-slate-900 px-8 py-12 text-white md:px-12 md:py-16">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <div className="eyebrow text-slate-300">Ready to begin</div>
                <h2 className="font-display text-3xl font-semibold text-white">Invite Py into your next campaign.</h2>
                <p className="max-w-xl text-sm text-slate-200">
                  Whether you're launching, rebranding, or simply keeping your strategy alive, he'll help you maintain the voice your audience knows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
                  Start for free
                </Button>
                <Button size="lg" variant="ghost" className="text-white" onClick={() => navigate('/pricing')}>
                  Review plans
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <PyAvatar size="sm" className="ring-2 ring-slate-200" />
                <span className="font-display text-lg font-semibold tracking-tight">Py</span>
              </div>
              <p className="text-sm text-slate-600 max-w-md">
                AI-powered strategy platform that helps businesses create consistent,
                narrative-driven content across all channels.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <button onClick={() => navigate('/pricing')} className="hover:text-slate-900 transition-colors">
                    Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/biography')} className="hover:text-slate-900 transition-colors">
                    About Py
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/register')} className="hover:text-slate-900 transition-colors">
                    Get Started
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Connect</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <button onClick={() => navigate('/contact')} className="hover:text-slate-900 transition-colors">
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => window.open('https://wa.me/2347069719374', '_blank')}
                    className="hover:text-slate-900 transition-colors"
                  >
                    WhatsApp
                  </button>
                </li>
                <li>
                  <a href="tel:+2348086512223" className="hover:text-slate-900 transition-colors">
                    +234 808 651 2223
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
              <p>© {new Date().getFullYear()} Py. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="https://py.raysourcelabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">
                  py.raysourcelabs.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
