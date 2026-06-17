import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { registerUser } from '../store/slices/authSlice.js';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const submit = async (event) => {
    event.preventDefault();
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Create account</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Register</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none ring-0 placeholder:text-slate-500" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none ring-0 placeholder:text-slate-500" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none ring-0 placeholder:text-slate-500" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {auth.error ? <p className="text-sm text-red-400">{auth.error}</p> : null}
          <Button type="submit" className="w-full" disabled={auth.status === 'loading'}>
            {auth.status === 'loading' ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-400">Already have an account? <Link className="text-accent" to="/login">Sign in</Link></p>
      </Card>
    </div>
  );
}