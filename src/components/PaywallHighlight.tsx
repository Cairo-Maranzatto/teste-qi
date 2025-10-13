export function PaywallHighlight({ cents }: { cents: number }) {
  const reais = Math.round(cents / 100);
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="text-lg font-semibold">Acesse seu resultado</div>
      <div className="text-2xl font-bold">R$ {reais}</div>
      <ul className="text-sm text-muted-foreground list-disc pl-4">
        <li>QI em destaque</li>
        <li>Percentil e faixa</li>
        <li>PIX recomendado</li>
      </ul>
    </div>
  );
}
