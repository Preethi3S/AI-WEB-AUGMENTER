import clsx from 'clsx';

export function Card({ className = '', children }) {
  return <div className={clsx('rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur', className)}>{children}</div>;
}