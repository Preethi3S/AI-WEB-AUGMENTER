import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { api } from '../utils/api.js';

export function NotesPage() {
  const [text, setText] = useState('Paste an article, tutorial, or research excerpt here.');
  const [result, setResult] = useState(null);

  const generate = async () => {
    const response = await api.post('/ai/notes', { title: 'Study Notes', url: '', text });
    setResult(response.data.data.result);
  };

  return (
    <div>
      <PageHeader eyebrow="Learning" title="AI notes generator" description="Turn long-form content into notes, flashcards, MCQs, and revision material." />
      <Card>
        <textarea className="h-64 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none" value={text} onChange={(e) => setText(e.target.value)} />
        <Button className="mt-4" onClick={generate}>Generate Notes</Button>
      </Card>
      {result ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card><div className="text-sm text-slate-400">Notes</div><p className="mt-2 text-sm text-slate-300">{result.notes}</p></Card>
          <Card><div className="text-sm text-slate-400">Flashcards</div><div className="mt-3 space-y-3 text-sm text-slate-300">{result.flashcards.map((item) => <div key={item.front}><strong>Q:</strong> {item.front}<br /><strong>A:</strong> {item.back}</div>)}</div></Card>
        </div>
      ) : null}
    </div>
  );
}