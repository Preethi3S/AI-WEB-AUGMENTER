import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginUser, registerUser, selectAuthState, selectAuthToken } from '../store/authSlice.js';

export function AuthPage() {
  const token = useSelector(selectAuthToken);
  const authState = useSelector(selectAuthState);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (token) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    const action = mode === 'login' ? loginUser : registerUser;
    const result = await dispatch(action(form));
    if (action.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-4xl overflow-hidden rounded-[2rem] shadow-glow lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-500/20 via-slate-950 to-slate-900 p-8 lg:p-10">
          <div className="absolute inset-0 grid-veil opacity-40" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">AI Web Augmenter</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-white lg:text-5xl">
              Transform every webpage into a career intelligence workspace.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
              Summaries, job matching, roadmap generation, interview prep, and notes are all centralized in one secure dashboard.
            </p>
          </div>
          <div className="relative grid gap-4 sm:grid-cols-3">
            {[
              ['Summaries', 'Page context distilled into action'],
              ['Match Score', 'Resume and role compatibility'],
              ['Roadmaps', 'Learning paths with milestones']
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/95 p-8 lg:p-10">
          <div className="mb-6 flex rounded-2xl bg-white/5 p-1">
            {['login', 'register'].map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === item ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
              >
                {item === 'login' ? 'Login' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' ? (
              <Field label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            ) : null}
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />

            {authState.error ? <p className="text-sm text-rose-300">{authState.error}</p> : null}

            <button
              type="submit"
              disabled={authState.status === 'loading'}
              className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authState.status === 'loading' ? 'Processing...' : mode === 'login' ? 'Login securely' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
      />
    </label>
  );
}