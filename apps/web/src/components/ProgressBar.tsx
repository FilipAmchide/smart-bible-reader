export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={clamped}>
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
