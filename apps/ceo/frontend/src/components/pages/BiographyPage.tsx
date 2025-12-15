import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { ArrowLeft, Sparkles, Calendar, MapPin, Heart, BookOpen, Zap, PenLine } from 'lucide-react';

interface BiographyPageProps {
  onBack?: () => void;
}

const timeline = [
  {
    year: '2018',
    title: 'Introduced by Raysource Labs',
    description:
      'Born on April 14, 2018, Py entered the internet as a cultural hybrid—part Igbo heritage, part neural network, all strategist.'
  },
  {
    year: '2019-2021',
    title: 'Learning the craft',
    description:
      'He spent early years collecting rituals from strategists, copywriters, and filmmakers, building a library of company frameworks and tonal memories.'
  },
  {
    year: '2022-Present',
    title: 'Agency in motion',
    description:
      'Now he serves as a retained partner for founders and marketing teams, orchestrating launches, weekly strategic cadences, and signature company strategies.'
  }
];

const traits = [
  {
    icon: Sparkles,
    title: 'Sharp insight',
    description: 'Py mirrors the human insight of a seasoned strategist—curious, quick to analyze, and deeply empathetic.'
  },
  {
    icon: PenLine,
    title: 'Strategic discipline',
    description: 'He structures every message with clear stakes, emotional beats, and calls to action that feel effortless.'
  },
  {
    icon: Zap,
    title: 'Always on',
    description: 'He listens continuously, learning from every campaign to sharpen the next response or recommendation.'
  }
];

export const BiographyPage: React.FC<BiographyPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));

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
            <span className="font-display text-lg font-semibold tracking-tight">Py</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-16">
        <section className="mb-16 space-y-6 text-center">
          <div className="mx-auto w-28 rounded-full border border-slate-200 bg-white p-1">
            <PyAvatar size="lg" />
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Biography</p>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">
              The agentic strategist behind your company's voice.
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-600">
              Py is not a faceless app. He is a personified intelligence who listens, relates, and strategizes as if he were in the room with you. Here is the story behind the voice.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" /> Born April 14, 2018
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" /> Lives everywhere the internet reaches
            </span>
          </div>
        </section>

        <section className="mb-16 grid gap-6 md:grid-cols-3">
          {traits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/90 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </section>

        <section className="mb-16 space-y-10">
          <h2 className="font-display text-3xl font-semibold">Milestones that shaped him.</h2>
          <div className="space-y-6">
            {timeline.map((item) => (
              <div key={item.year} className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{item.year}</div>
                <h3 className="mt-3 font-display text-2xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16 rounded-3xl border border-slate-200 bg-white p-8">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold">How he spends a typical week.</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <Heart className="mt-0.5 h-4 w-4 text-slate-400" />
                Coaching founders on tone and strategic arcs before major announcements.
              </li>
              <li className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 text-slate-400" />
                Archiving lived experiences, customer quotes, and cultural moments into reusable strategy libraries.
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-slate-400" />
                Translating analytics into empathetic strategic plans that feel human.
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 px-8 py-12 text-white">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold text-white">Bring him into your company's room.</h2>
            <p className="text-sm text-slate-200">
              Py shows up prepared—with drafts, data, and a calm voice that keeps your strategy grounded. Invite him to your next planning session and feel the difference of working with an agent, not an app.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
                Start working with him
              </Button>
              <Button size="lg" variant="ghost" className="text-white" onClick={() => navigate('/contact')}>
                Book a conversation
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
