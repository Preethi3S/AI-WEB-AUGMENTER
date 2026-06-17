export function ResultBlock({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
      <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">{title}</h4>
      <div className="mt-4 text-sm leading-6 text-slate-200">{children}</div>
    </div>
  );
}