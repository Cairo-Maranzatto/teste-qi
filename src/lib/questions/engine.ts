import bank from "./banco_questoes_qi_v2.json";
import { seededShuffle } from "@/lib/random";

export type BankOption = { id: string; label: string };
export type BankQuestion = {
  id: string;
  domain: string;
  difficulty: string;
  type: string;
  timeTargetSec: number;
  stem: string;
  options: BankOption[];
  correctId: string;
};

const BANK: BankQuestion[] = bank as any;

// Curadoria de candidatos por bloco (IDs conforme recomendações)
const EARLY_EASY = new Set([
  "q001", "q002", "q003", "q004", // padrões fáceis
  "q021", "q022", "q023", // lógica fáceis
  "q038", "q039", "q040", // verbal fáceis
]);
const MID_ACCESSIBLE = new Set([
  "q011", "q012", "q029", "q041", "q042", "q047",
]);
const LATE_HARD = new Set([
  "q017", "q018", "q019", "q020", // padrões difíceis
  "q034", "q035", "q036", "q037", // lógica difíceis
  "q049", "q050", // verbal difíceis
]);

type Domain = "padroes" | "logica" | "verbal";
type Difficulty = "facil" | "medio" | "dificil";

type Buckets = Record<Domain, Record<Difficulty, BankQuestion[]>>;

function buildBuckets(seed: string): Buckets {
  const byDomain: Buckets = {
    padroes: { facil: [], medio: [], dificil: [] },
    logica: { facil: [], medio: [], dificil: [] },
    verbal: { facil: [], medio: [], dificil: [] },
  } as Buckets;
  for (const q of BANK) {
    const d = q.domain as Domain;
    const diff = q.difficulty as Difficulty;
    if (byDomain[d] && byDomain[d][diff]) byDomain[d][diff].push(q);
  }
  // embaralhar cada bucket de forma determinística
  (Object.keys(byDomain) as Domain[]).forEach((dom) => {
    (Object.keys(byDomain[dom]) as Difficulty[]).forEach((diff) => {
      byDomain[dom][diff] = seededShuffle(byDomain[dom][diff], `${seed}|${dom}|${diff}`);
    });
  });
  return byDomain;
}

function take(from: BankQuestion[], n: number, used: Set<string>, prefer?: (q: BankQuestion) => boolean): BankQuestion[] {
  if (n <= 0) return [];
  const out: BankQuestion[] = [];
  const primary: BankQuestion[] = [];
  const secondary: BankQuestion[] = [];
  for (const q of from) {
    if (used.has(q.id)) continue;
    if (prefer && prefer(q)) primary.push(q); else secondary.push(q);
  }
  for (const arr of [primary, secondary]) {
    for (const q of arr) {
      if (out.length >= n) break;
      if (used.has(q.id)) continue;
      used.add(q.id);
      out.push(q);
    }
  }
  return out;
}

export function getOrderedSelection(seed: string, total: number): BankQuestion[] {
  const TOTAL = Math.min(total, 30);
  const buckets = buildBuckets(seed);
  const used = new Set<string>();

  // Quotas globais
  const quotaDomain: Record<Domain, number> = { padroes: 12, logica: 10, verbal: 8 };
  const quotaDiff: Record<Difficulty, number> = { facil: 6, medio: 18, dificil: 6 };

  // Helpers
  const preferEarly = (q: BankQuestion) => EARLY_EASY.has(q.id) || MID_ACCESSIBLE.has(q.id);
  const preferLate = (q: BankQuestion) => LATE_HARD.has(q.id);

  const selection: BankQuestion[] = [];

  // Bloco 1: Q1–Q8 (6 fáceis, 2 médias) Domínios alvo: 3 padroes, 3 verbal, 2 logica
  const b1Plan = [
    { dom: "padroes" as Domain, diff: "facil" as Difficulty, n: 3 },
    { dom: "verbal" as Domain, diff: "facil" as Difficulty, n: 3 },
    { dom: "logica" as Domain, diff: "facil" as Difficulty, n: 2 },
  ];
  for (const p of b1Plan) {
    const taken = take(buckets[p.dom][p.diff], p.n, used, preferEarly);
    selection.push(...taken);
    quotaDomain[p.dom] -= taken.length;
    quotaDiff[p.diff] -= taken.length;
  }
  // garantir 2 médias no bloco 1 (se ainda faltar)
  const b1MediumNeeded = Math.max(0, 8 - selection.length);
  if (b1MediumNeeded > 0) {
    // priorizar médias acessíveis
    const mediums: [Domain, Difficulty][] = [["padroes", "medio"], ["verbal", "medio"], ["logica", "medio"]];
    for (const [dom, diff] of mediums) {
      if (selection.length >= 8) break;
      const want = Math.min(1, b1MediumNeeded - (selection.length - 6));
      const taken = take(buckets[dom][diff], want, used, (q) => MID_ACCESSIBLE.has(q.id));
      if (taken.length) {
        selection.push(...taken);
        quotaDomain[dom] -= taken.length;
        quotaDiff[diff] -= taken.length;
      }
    }
  }
  // fallback se ainda < 8
  while (selection.length < 8) {
    const pools: [Domain, Difficulty][] = [["padroes", "medio"], ["verbal", "medio"], ["logica", "medio"]];
    let added = false;
    for (const [dom, diff] of pools) {
      const t = take(buckets[dom][diff], 1, used, (q) => MID_ACCESSIBLE.has(q.id));
      if (t.length) {
        selection.push(t[0]);
        quotaDomain[dom] -= 1;
        quotaDiff[diff] -= 1;
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  // Bloco 2: Q9–Q20 (12 itens) — majoritariamente médias; evitar difíceis
  while (selection.length < 20 && selection.length < TOTAL) {
    // escolher domínios que ainda têm maior quota restante para manter 12/10/8
    const domainsSorted = (Object.keys(quotaDomain) as Domain[]).sort((a, b) => quotaDomain[b] - quotaDomain[a]);
    let placed = false;
    for (const dom of domainsSorted) {
      // priorize médias
      const mid = take(buckets[dom]["medio"], 1, used, (q) => MID_ACCESSIBLE.has(q.id));
      if (mid.length) {
        selection.push(mid[0]);
        quotaDomain[dom] -= 1;
        quotaDiff["medio"] -= 1;
        placed = true;
        break;
      }
      // use fáceis remanescentes com parcimônia
      if (quotaDiff["facil"] > 0) {
        const ea = take(buckets[dom]["facil"], 1, used, preferEarly);
        if (ea.length) {
          selection.push(ea[0]);
          quotaDomain[dom] -= 1;
          quotaDiff["facil"] -= 1;
          placed = true;
          break;
        }
      }
    }
    if (!placed) break;
  }

  // Bloco 3: Q21–Q30 (10 itens) — 4–6 difíceis + médias para completar quotas
  while (selection.length < TOTAL) {
    // se ainda faltam difíceis para atingir 6 globais, priorize-os
    if (quotaDiff["dificil"] > 0) {
      // escolha domínio com maior quota restante e questão dura preferida para o fim
      const domainsSorted = (Object.keys(quotaDomain) as Domain[]).sort((a, b) => quotaDomain[b] - quotaDomain[a]);
      let placedHard = false;
      for (const dom of domainsSorted) {
        const dh = take(buckets[dom]["dificil"], 1, used, preferLate);
        if (dh.length) {
          selection.push(dh[0]);
          quotaDomain[dom] -= 1;
          quotaDiff["dificil"] -= 1;
          placedHard = true;
          break;
        }
      }
      if (placedHard) continue;
    }
    // complete com médias
    const domainsSorted2 = (Object.keys(quotaDomain) as Domain[]).sort((a, b) => quotaDomain[b] - quotaDomain[a]);
    let placed = false;
    for (const dom of domainsSorted2) {
      const mid = take(buckets[dom]["medio"], 1, used);
      if (mid.length) {
        selection.push(mid[0]);
        quotaDomain[dom] -= 1;
        quotaDiff["medio"] -= 1;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  // Se ainda não atingiu TOTAL (por falta de buckets), preencher com qualquer remanescente embaralhado
  if (selection.length < TOTAL) {
    const rest = seededShuffle(BANK.filter((q) => !used.has(q.id)), `${seed}|rest`);
    for (const q of rest) {
      if (selection.length >= TOTAL) break;
      selection.push(q);
    }
  }

  return selection.slice(0, TOTAL);
}

export function getQuestionByIndex(seed: string, index1: number, total: number): BankQuestion | null {
  if (!Number.isFinite(index1) || index1 < 1) return null;
  const sel = getOrderedSelection(seed, total);
  if (index1 > sel.length) return null;
  return sel[index1 - 1];
}
