import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, selectAuthUser } from '../store/authSlice.js';

const navItems = [
  { to: '/', label: 'Overview' },
  { to: '/analysis', label: 'Summaries' },
  { to: '/matcher', label: 'Resume Match' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/extension', label: 'Extension' }
];

export function AppShell() {
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth');
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="absolute inset-0 grid-veil opacity-30 pointer-events-none" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 flex-col border-r border-white/10 bg-slate-950/80 p-6 xl:flex">
          <div className="mb-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-glow">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">AI Web Augmenter</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">Productivity cockpit for job hunting and learning</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Signed in as</p>
            <p className="mt-1 break-all">{user?.email || 'User'}</p>
            <button
              onClick={handleLogout}
              className="mt-4 rounded-xl bg-ember-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-ember-400"
            >
              Logout
            </button>
          </div>
        </aside>
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
          <header className="glass sticky top-4 z-20 mb-6 flex items-center justify-between rounded-3xl px-5 py-4 shadow-glow">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Dashboard</p>
              <h2 className="mt-1 text-xl font-semibold text-white">AI Web Augmenter Workspace</h2>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 xl:hidden">
                Account
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="mb-6 flex gap-2 overflow-x-auto xl:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-4 py-2 text-sm ${isActive ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}