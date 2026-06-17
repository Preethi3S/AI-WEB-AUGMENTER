export function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      {eyebrow ? <div className="text-xs uppercase tracking-[0.35em] text-slate-400">{eyebrow}</div> : null}
      <h2 className="mt-2 text-3xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p> : null}
    </div>
  );
}