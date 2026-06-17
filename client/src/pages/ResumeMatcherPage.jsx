import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { api } from '../utils/api.js';

export function ResumeMatcherPage() {
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const response = await api.post('/ai/match-resume', { resumeText, jobText });
      setResult(response.data.data.result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Matching"
        title="Resume vs job description"
        description="Paste a resume and job description to generate a compatibility score, skills gap, and improvement guidance."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <label className="text-sm text-slate-300">Resume text</label>
          <textarea className="mt-2 h-72 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
        </Card>
        <Card>
          <label className="text-sm text-slate-300">Job description text</label>
          <textarea className="mt-2 h-72 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" value={jobText} onChange={(e) => setJobText(e.target.value)} />
        </Card>
      </div>

      <Button className="mt-4" onClick={analyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Generate Match'}
      </Button>

      {result ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="text-sm text-slate-400">Match Score</div>
            <div className="mt-2 text-5xl font-semibold text-white">{result.matchScore}%</div>
          </Card>
          <Card>
            <div className="text-sm text-slate-400">Matching Skills</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">{result.matchingSkills.map((skill) => <li key={skill}>• {skill}</li>)}</ul>
          </Card>
          <Card>
            <div className="text-sm text-slate-400">Missing Skills</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">{result.missingSkills.map((skill) => <li key={skill}>• {skill}</li>)}</ul>
          </Card>
          <Card>
            <div className="text-sm text-slate-400">Improvement Suggestions</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">{result.improvementSuggestions.map((item) => <li key={item}>• {item}</li>)}</ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}