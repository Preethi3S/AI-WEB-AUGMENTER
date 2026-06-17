import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ResultBlock } from '../components/ResultBlock.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { askQuestion, selectAnalysis, summarizePage } from '../store/analysisSlice.js';

export function AnalysisPage() {
  const dispatch = useDispatch();
  const analysis = useSelector(selectAnalysis);
  const [form, setForm] = useState({
    title: 'Sample Page',
    url: 'https://example.com',
    text: '',
    question: 'What is the page about?'
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Summarize any webpage" subtitle="Paste the page content captured by the extension or any text you want analyzed.">
        <TextForm form={form} setForm={setForm} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950" onClick={() => dispatch(summarizePage(form))}>
            Generate summary
          </button>
          <button className="rounded-xl border border-white/10 px-4 py-2 text-slate-200" onClick={() => dispatch(askQuestion(form))}>
            Ask question
          </button>
        </div>
      </SectionCard>

      <SectionCard title="AI output" subtitle="This area renders the last returned analysis result.">
        {analysis.current ? (
          <div className="space-y-4">
            <ResultBlock title="Result">{typeof analysis.current === 'string' ? analysis.current : JSON.stringify(analysis.current, null, 2)}</ResultBlock>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No analysis yet. Submit content to see the structured response.</p>
        )}
      </SectionCard>
    </div>
  );
}

function TextForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <input
        value={form.title}
        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        placeholder="Page title"
      />
      <input
        value={form.url}
        onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        placeholder="Page URL"
      />
      <textarea
        value={form.text}
        onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
        className="min-h-72 w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        placeholder="Paste webpage content here"
      />
      <input
        value={form.question}
        onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        placeholder="Question about the page"
      />
    </div>
  );
}