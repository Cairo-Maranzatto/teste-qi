export function ProgressDual({ qPct = 0, tPct = 0 }: { qPct: number; tPct: number }) {
  return (
    <div className="space-y-2">
      <div className="h-2 w-full bg-secondary rounded">
        <div className="h-2 bg-black rounded" style={{ width: `${qPct}%` }} />
      </div>
      <div className="h-2 w-full bg-secondary rounded">
        <div className="h-2 bg-neutral-500 rounded" style={{ width: `${tPct}%` }} />
      </div>
    </div>
  );
}
