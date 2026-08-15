import type { BatchResult } from "../types";

const STORAGE_KEY = "fotozada_encontro_carros_pontal_batch";
// Um pouco abaixo do cron `fotozada-cleanup` do backend (apaga batches com
// mais de 1h) para nunca tentar retomar um lote que o banco já descartou.
const TTL_MS = 55 * 60 * 1000;

interface StoredBatch {
  result: BatchResult;
  savedAt: number;
}

// Persiste o lote em andamento para que um refresh ou aba fechada retome a
// tela de status em vez de perder o rastro de uma foto ainda imprimindo.
export function saveBatch(result: BatchResult): void {
  try {
    const entry: StoredBatch = { result, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Navegação privada / quota excedida — a retomada simplesmente não funciona.
  }
}

export function loadBatch(): BatchResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredBatch;
    if (!entry.result || Date.now() - entry.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

export function clearBatch(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
