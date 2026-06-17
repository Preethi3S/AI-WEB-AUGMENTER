export function StatCard({ label, value, helper, accent = 'cyan' }) {
  const accentClass = accent === 'orange' ? 'from-ember-500/20 to-transparent' : 'from-cyan-500/20 to-transparent';

  return (
    <div className="panel relative overflow-hidden rounded-3xl p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentClass}`} />
      <div className="relative">
        <p className="text-sm text-slate-400">{label}</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">{value}</h3>
        <p className="mt-2 text-sm text-slate-300">{helper}</p>
      </div>
    </div>
  );
}