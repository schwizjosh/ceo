import React from 'react';
import {
  Sparkles,
  Calendar,
  Users,
  MessageSquare,
  Compass,
  Map,
  ArrowRight
} from 'lucide-react';
import { Brand } from '../../types';
import { cn } from '../../utils/cn';

interface DashboardPageProps {
  brand: Brand | null;
  onBrandUpdate?: (updates: Partial<Brand>) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ brand }) => {
  const [loading, setLoading] = React.useState(true);

  const characterCount = brand?.cast_management?.length ?? 0;
  const themeCount = Object.keys(brand?.monthly_themes || {}).length;
  const channelCount = brand?.channels?.length ?? 0;
  const seasonCount = Object.keys(brand?.season_plans || {}).length;
  const subplotCount = Object.keys(brand?.weekly_subplots || {}).length;
  const calendarCount = Object.keys(brand?.monthly_calendars || {}).length;

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-slate-600">Preparing your control center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
      <section className="overflow-hidden rounded-3xl border border-primary-500/10 bg-gradient-to-br from-primary-500/10 via-white to-transparent p-8 shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
              <Compass className="h-4 w-4" /> Narrative Control Center
            </span>
            <div>
              <h1 className="text-3xl font-bold text-primary-900 sm:text-4xl">
                {brand ? `Welcome back to ${brand.brand_name}` : 'Your story studio is ready'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                {brand
                  ? 'Track momentum, align your cast, and keep every beat connected. Scroll down to see the strongest opportunities right now.'
                  : 'Create a brand to unlock character creation, content arcs, and event-driven planning in one intuitive dashboard.'}
              </p>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-lg">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Characters</p>
              <div className="mt-2 flex items-center justify-between">
                <Users className="h-5 w-5 text-primary-500" />
                <span className="text-2xl font-bold text-primary-900">{characterCount}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Monthly Themes</p>
              <div className="mt-2 flex items-center justify-between">
                <Calendar className="h-5 w-5 text-primary-500" />
                <span className="text-2xl font-bold text-primary-900">{themeCount}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/80 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Channels</p>
              <div className="mt-2 flex items-center justify-between">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold text-emerald-700">{channelCount}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Season Plans</p>
              <div className="mt-2 flex items-center justify-between">
                <Map className="h-5 w-5 text-indigo-500" />
                <span className="text-2xl font-bold text-indigo-700">{seasonCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
          {/* This Week's Content */}
          {brand && (() => {
            const today = new Date();
            const dates = [0, 1, 2].map(offset => {
              const date = new Date(today);
              date.setDate(today.getDate() + offset);
              return date;
            });

            const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const calendar = brand.monthly_calendars?.[monthKey];
            const cast = brand.cast_management || [];

            const getContentForDate = (date: Date) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              return calendar?.items.filter(item => item.date === dateStr) || [];
            };

            const getDayLabel = (offset: number) => {
              if (offset === 0) return 'Today';
              if (offset === 1) return 'Tomorrow';
              return dates[offset].toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            };

            return (
              <div className="rounded-3xl border border-primary-200/40 bg-gradient-to-br from-purple-500/10 via-white to-transparent p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">This Week's Content</h2>
                    <p className="mt-1 text-sm text-slate-500">Character assignments for your upcoming briefs</p>
                  </div>
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>

                <div className="mt-5 space-y-3">
                  {dates.map((date, index) => {
                    const content = getContentForDate(date);
                    const mainCharacters = content
                      .map(item => item.character_focus)
                      .filter(Boolean)
                      .slice(0, 3);

                    return (
                      <div key={index} className="rounded-2xl border border-purple-200/40 bg-white/80 px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                              {getDayLabel(index)}
                            </p>
                            <p className="mt-1 text-sm text-slate-900">
                              {content.length > 0 ? (
                                <>
                                  <span className="font-semibold">{content.length}</span> brief{content.length === 1 ? '' : 's'}
                                </>
                              ) : (
                                <span className="text-slate-500">No briefs scheduled</span>
                              )}
                            </p>
                            {mainCharacters.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {mainCharacters.map((char, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200"
                                  >
                                    <Users className="h-3 w-3" />
                                    {char}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {calendar && (
                  <div className="mt-4 text-center">
                    <a
                      href="/monthly"
                      className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      View full calendar
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Focus Routes</h2>
                <p className="mt-1 text-sm text-slate-500">Deep dive into the workspace area that will have the biggest impact today.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 space-y-4">
              <a
                href="/events"
                className="block rounded-2xl border border-primary-500/20 bg-primary-500/5 px-5 py-4 transition hover:border-primary-500/40 hover:bg-primary-500/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary-800">Events & Moments</p>
                  <span className="text-xs text-primary-600">Sync your timeline</span>
                </div>
                <p className="mt-2 text-sm text-primary-700">
                  Keep upcoming launches visible so subplot ideas and calendars stay relevant.
                </p>
              </a>

              <a
                href="/monthly"
                className="block rounded-2xl border border-emerald-500/20 bg-emerald-50/80 px-5 py-4 transition hover:border-emerald-500/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-emerald-700">Monthly Planning</p>
                  <span className="text-xs text-emerald-600">{themeCount > 0 ? `${themeCount} theme${themeCount === 1 ? '' : 's'} defined` : 'Set your arc'}</span>
                </div>
                <p className="mt-2 text-sm text-emerald-700">
                  Align your narrative pillars with actionable prompts for the next content cycle.
                </p>
              </a>

              <a
                href="/plot"
                className="block rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4 transition hover:border-indigo-500/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-indigo-800">Plot Builder</p>
                  <span className="text-xs text-indigo-600">Craft story beats</span>
                </div>
                <p className="mt-2 text-sm text-indigo-700">
                  Use AI-assisted arcs to keep every initiative grounded in character perspective.
                </p>
              </a>

              <a
                href="/chat"
                className="block rounded-2xl border border-slate-200/80 bg-slate-50 px-5 py-4 transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Andora Copilot</p>
                  <span className="text-xs text-slate-500">Collaborate faster</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Brief Andora on upcoming pushes, draft scripts, or refine pitches in real-time.
                </p>
              </a>
            </div>
          </div>

          {!brand && (
            <div className="rounded-3xl border border-dashed border-primary-300 bg-white/80 p-6 text-center shadow-inner">
              <Sparkles className="mx-auto h-8 w-8 text-primary-500" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Build your first brand</h2>
              <p className="mt-2 text-sm text-slate-600">
                Define your mission, capture your cast, and unlock guided storytelling experiences tailored to you.
              </p>
            </div>
          )}
      </section>
    </div>
  );
};
