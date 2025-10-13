export type Answer = { correct: boolean };

export function computeRawScore(A: Answer[]): number {
  return A.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0);
}

// PRD v1: IQ = 100 + 3*(acertos-15), clamp 55..145
export function computeIQ(raw: number): number {
  return clamp(55, 145, Math.round(100 + 3 * (raw - 15)));
}

export function computePercentile(iq: number): number {
  const z = (iq - 100) / 15;
  const p = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.round(100 * p);
}

export function clamp(min: number, max: number, v: number) {
  return Math.max(min, Math.min(max, v));
}

// Aproximação de erf (Abramowitz & Stegun 7.1.26)
export function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
