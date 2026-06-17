import { BrainCircuit, FileSearch, LogOut, NotebookPen, Radar, Sparkles } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks.js';
import { logout } from '../../store/slices/authSlice.js';
import { Button } from '../ui/Button.jsx';

const navItems = [
  { to: '/', label: 'Overview', icon: BrainCircuit },
  { to: '/analyses', label: 'Analyses', icon: Sparkles },
  { to: '/resume-matcher', label: 'Resume Matcher', icon: FileSearch },
  { to: '/roadmaps', label: 'Roadmaps', icon: Radar },
  { to: '/notes', label: 'Notes', icon: NotebookPen }
];

export function Shell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 p-4 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glow backdrop-blur lg:block">
          <Link to="/" className="mb-8 flex items-center gap-3 rounded-2xl bg-white/5 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">AI Web Augmenter</div>
              <div className="text-sm text-slate-400">Career-grade context engine</div>
            </div>
          </Link>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 transition ${isActive ? 'bg-accent text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-panel/80 p-4">
            <div className="text-sm text-slate-400">Signed in as</div>
            <div className="mt-1 font-medium">{user?.name || user?.email || 'User'}</div>
            <Button variant="secondary" className="mt-4 w-full" onClick={handleLogout}>
              <span className="inline-flex items-center gap-2"><LogOut className="h-4 w-4" /> Logout</span>
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-panel/70 shadow-glow backdrop-blur">
          <div className="border-b border-white/10 p-4 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.35em] text-slate-400">AI Workspace</div>
                <h1 className="mt-2 text-2xl font-semibold text-white">Transform webpages into structured career intelligence</h1>
              </div>
              <Button variant="secondary" onClick={handleLogout}>Logout</Button>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}