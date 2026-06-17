import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { generateRoadmap, selectAnalysis } from '../store/analysisSlice.js';
import { api } from '../utils/api.js';

export function RoadmapPage() {
  const dispatch = useDispatch();
  const analysis = useSelector(selectAnalysis);
  const [payload, setPayload] = useState({ currentSkills: ['React', 'Node.js'], targetRole: 'Full Stack Developer' });

  return (
    <SectionCard title="Career roadmap generator" subtitle="Generate a practical path with courses, projects, milestones, and timeline.">
      <div className="grid gap-4 lg:grid-cols-2">
        <input
          value={payload.targetRole}
          onChange={(event) => setPayload((current) => ({ ...current, targetRole: event.target.value }))}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Target role"
        />
        <input
          value={payload.currentSkills.join(', ')}
          onChange={(event) => setPayload((current) => ({ ...current, currentSkills: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          placeholder="Current skills, comma separated"
        />
      </div>
      <button onClick={() => dispatch(generateRoadmap(payload))} className="mt-4 rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
        Generate roadmap
      </button>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-sm text-slate-200">
        {analysis.current ? <pre className="whitespace-pre-wrap break-words">{JSON.stringify(analysis.current, null, 2)}</pre> : <p>No roadmap generated yet.</p>}
      </div>
    </SectionCard>
  );
}
export function RoadmapPage() {
  const [currentSkills, setCurrentSkills] = useState('React, Node.js, MongoDB');
  const [targetRole, setTargetRole] = useState('AI Engineer');
  const [result, setResult] = useState(null);

  const generate = async () => {
    const response = await api.post('/ai/roadmap', { currentSkills: currentSkills.split(',').map((value) => value.trim()).filter(Boolean), targetRole });
    setResult(response.data.data.result);
  };

  return (
    <div>
      <PageHeader eyebrow="Planning" title="Career roadmap generator" description="Map current skills to a target role with a pragmatic learning path, projects, and milestones." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <label className="text-sm text-slate-300">Current skills</label>
          <textarea className="mt-2 h-32 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} />
        </Card>
        <Card>
          <label className="text-sm text-slate-300">Target role</label>
          <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
          <Button className="mt-4" onClick={generate}>Generate Roadmap</Button>
        </Card>
      </div>
      {result ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card><div className="text-sm text-slate-400">Timeline</div><div className="mt-2 text-xl text-white">{result.timeline}</div></Card>
          <Card><div className="text-sm text-slate-400">Technologies</div><div className="mt-2 text-sm text-slate-300">{result.technologies.join(', ')}</div></Card>
          <Card><div className="text-sm text-slate-400">Courses</div><div className="mt-3 space-y-2 text-sm text-slate-300">{result.courses.map((course) => <div key={course.title}>• {course.title} - {course.provider}</div>)}</div></Card>
          <Card><div className="text-sm text-slate-400">Projects</div><div className="mt-3 space-y-2 text-sm text-slate-300">{result.projects.map((project) => <div key={project.title}>• {project.title} - {project.impact}</div>)}</div></Card>
        </div>
      ) : null}
    </div>
  );
}