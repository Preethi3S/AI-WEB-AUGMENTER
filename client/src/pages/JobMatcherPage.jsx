import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SectionCard } from '../components/SectionCard.jsx';
import { matchResume, selectAnalysis } from '../store/analysisSlice.js';

export function JobMatcherPage() {
  const dispatch = useDispatch();
  const analysis = useSelector(selectAnalysis);
  const [payload, setPayload] = useState({ resumeText: '', jobText: '' });

  return (
    <SectionCard title="Resume vs job description matcher" subtitle="Compare your resume against a target role and get a compatibility score.">
      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          value={payload.resumeText}
          onChange={(event) => setPayload((current) => ({ ...current, resumeText: event.target.value }))}
          className="min-h-96 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Resume text"
        />
        <textarea
          value={payload.jobText}
          onChange={(event) => setPayload((current) => ({ ...current, jobText: event.target.value }))}
          className="min-h-96 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Job description text"
        />
      </div>
      <button
        onClick={() => dispatch(matchResume(payload))}
        className="mt-4 rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950"
      >
        Calculate match
      </button>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-sm text-slate-200">
        {analysis.current ? (
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(analysis.current, null, 2)}</pre>
        ) : (
          <p>No match calculated yet.</p>
        )}
      </div>
    </SectionCard>
  );
}