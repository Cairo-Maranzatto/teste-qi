export function ActionBar({ onPrimary, onSecondary }: { onPrimary?: () => void; onSecondary?: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onPrimary} className="bg-black text-white px-4 py-2 rounded-md">Responder</button>
      <button onClick={onSecondary} className="border px-4 py-2 rounded-md">Pular</button>
    </div>
  );
}
