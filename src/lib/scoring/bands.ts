export function bandFromIQ(iq: number): { band: string; text: string } {
  if (iq >= 130) return { band: "Muito alta", text: "Entre uma minoria com desempenho muito acima." };
  if (iq >= 115) return { band: "Alta", text: "Significativamente acima da média." };
  if (iq >= 105) return { band: "Ligeiramente acima", text: "Um pouco acima da média." };
  if (iq >= 95) return { band: "Média", text: "Resultado dentro da média da população." };
  if (iq >= 85) return { band: "Ligeiramente abaixo", text: "Dentro de uma faixa ligeiramente abaixo da média." };
  return { band: "Abaixo da média", text: "Seu resultado está abaixo da média da população." };
}
