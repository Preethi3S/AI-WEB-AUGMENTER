import clsx from 'clsx';

export function Button({ className = '', variant = 'primary', ...props }) {
  const styles = {
    primary: 'bg-accent text-white shadow-glow hover:brightness-110',
    secondary: 'bg-white/5 text-slate-100 border border-white/10 hover:bg-white/10',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/5'
  };

  return <button className={clsx('rounded-xl px-4 py-2 font-medium transition', styles[variant], className)} {...props} />;
}