export function LoadingState({ label = 'Loading workspace...' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
        <p>{label}</p>
      </div>
    </div>
  );
}