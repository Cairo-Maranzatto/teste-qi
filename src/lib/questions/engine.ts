import bank from "./banco_questoes_qi_v1.json";
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

export function getOrderedSelection(seed: string, total: number): BankQuestion[] {
  const shuffled = seededShuffle(BANK, seed);
  return shuffled.slice(0, Math.min(total, shuffled.length));
}

export function getQuestionByIndex(seed: string, index1: number, total: number): BankQuestion | null {
  if (!Number.isFinite(index1) || index1 < 1) return null;
  const sel = getOrderedSelection(seed, total);
  if (index1 > sel.length) return null;
  return sel[index1 - 1];
}
