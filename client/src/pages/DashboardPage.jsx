import { BrainCircuit, FileText, FolderOpen, Radar, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import { fetchDashboard, searchSaved, selectDashboard } from '../store/dashboardSlice.js';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { fetchOverview } from '../store/slices/dashboardSlice.js';

export function DashboardPage() {
  const dispatch = useDispatch();
  const dashboard = useSelector(selectDashboard);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Analyses" value={dashboard.metrics?.analyses ?? '—'} helper="Saved summaries, Q&A, notes, and match reports." />
        <StatCard label="Resumes" value={dashboard.metrics?.resumes ?? '—'} helper="Uploaded resume PDFs parsed and indexed." accent="orange" />
        <StatCard label="Roadmaps" value={dashboard.metrics?.roadmaps ?? '—'} helper="Career paths generated from current skills and target role." />
      </div>

      <SectionCard
        title="Search workspace"
        subtitle="Search previous results across analyses, resumes, job descriptions, interview sets, roadmaps, and notes."
        action={
          <button
            onClick={() => dispatch(searchSaved('AI'))}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Example search
          </button>
        }
      >
        <SearchPanel />
      </SectionCard>

      <SectionCard title="Recent workspace state" subtitle="Your saved artifacts are surfaced here once connected to the API.">
        {dashboard.status === 'loading' ? <LoadingState /> : <RecentResults results={dashboard.searchResults} />}
      </SectionCard>
    </div>
  );
}

function SearchPanel() {
  const dispatch = useDispatch();

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <input
        placeholder="Search saved analyses, roadmaps, interview questions..."
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            dispatch(searchSaved(event.currentTarget.value));
          }
        }}
      />
      <button
        onClick={(event) => {
          const input = event.currentTarget.parentElement?.querySelector('input');
          if (input?.value) dispatch(searchSaved(input.value));
        }}
        className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Search
      </button>
    </div>
  );
}

function RecentResults({ results }) {
  if (!results) {
    return <p className="text-sm text-slate-400">Run a search or create an analysis to populate your dashboard.</p>;
  }

  const groups = [
    ['Analyses', results.analyses],
    ['Resumes', results.resumes],
    ['Jobs', results.jobs],
    ['Roadmaps', results.roadmaps],
    ['Interview Sets', results.interviews],
    ['Notes', results.notes]
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map(([title, items]) => (
        <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">{title}</h4>
          <div className="mt-3 space-y-3">
            {items?.length ? (
              items.map((item) => (
                <div key={item._id} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">{item.title || item.fileName || item.targetRole || 'Saved item'}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently saved'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No items yet.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
const cards = [
  { key: 'analyses', label: 'Analyses', icon: Sparkles },
  { key: 'resumes', label: 'Resumes', icon: FolderOpen },
  { key: 'jobDescriptions', label: 'Job Descriptions', icon: BrainCircuit },
  { key: 'interviewQuestionSets', label: 'Interview Sets', icon: FileText },
  { key: 'roadmaps', label: 'Roadmaps', icon: Radar },
  { key: 'notes', label: 'Notes', icon: FileText }
];

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { metrics } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchOverview());
  }, [dispatch]);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Your AI workspace at a glance"
        description="Track summaries, resume matches, roadmaps, and learning assets from one place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{metrics?.[card.key] ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-accent/15 p-3 text-accent">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h3 className="text-lg font-semibold text-white">What this workspace does</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• Summarizes webpages and extracts action items.</li>
            <li>• Answers questions from the current page context.</li>
            <li>• Matches resumes to job descriptions and surfaces gaps.</li>
            <li>• Generates interview questions, roadmaps, and study notes.</li>
          </ul>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Production path</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• Backend API on Render.</li>
            <li>• Client on Vercel.</li>
            <li>• MongoDB Atlas for persistence.</li>
            <li>• Extension packaged as MV3 from the extension folder.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}