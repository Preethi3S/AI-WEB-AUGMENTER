import { SectionCard } from '../components/SectionCard.jsx';

export function ExtensionPage() {
  return (
    <SectionCard title="Chrome extension integration" subtitle="Connect the extension popup and service worker to the server and dashboard.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Info label="Manifest" value="Manifest V3 with service worker, content script, and context menus." />
        <Info label="Transport" value="Chrome runtime messaging plus HTTPS API requests to the backend." />
        <Info label="Auth" value="JWT stored in extension storage and sent as bearer token." />
        <Info label="Actions" value="Summarize page, ask questions, match resume, and save to dashboard." />
      </div>
    </SectionCard>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}