import { useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { fetchSavedResults } from '../store/slices/analysisSlice.js';

export function AnalysesPage() {
  const dispatch = useAppDispatch();
  const saved = useAppSelector((state) => state.analyses.saved);

  useEffect(() => {
    dispatch(fetchSavedResults());
  }, [dispatch]);

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Saved analyses"
        description="Browse summaries, question answers, match results, skill gaps, interview packs, roadmaps, and notes."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {saved.analyses.map((item) => (
          <Card key={String(item._id)}>
            <div className="text-sm text-slate-400">{item.kind}</div>
            <div className="mt-1 text-lg font-semibold text-white">{item.title}</div>
            <div className="mt-3 text-sm text-slate-300">{item.pageUrl || 'Local analysis'}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}