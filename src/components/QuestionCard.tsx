"use client";

type Option = { id: string; label: string };
export function QuestionCard({ stem, options = [] as Option[] }: { stem: string; options: Option[] }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="font-semibold">{stem}</div>
      <div className="grid gap-2">
        {options.map((o) => (
          <button key={o.id} className="rounded-md border px-3 py-2 text-left hover:bg-secondary">
            {o.id}) {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
