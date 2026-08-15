import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Printer, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BASE_LAYOUTS } from "../lib/layouts";
import { PRINT_COMPLETE_DELAY_SECONDS } from "../../print/lib/print-timing";
import { useBatchStatus } from "../../print/hooks/use-batch-status";
import { useQueuePosition } from "../../print/hooks/use-queue-position";
import type { JobStatus } from "../../print/types";
import type { BatchResult } from "../types";

const LABEL: Record<JobStatus, string> = {
  pending_approval: "Aguardando",
  queued: "Na fila",
  printing: "Imprimindo…",
  done: "Pronto!",
  error: "Erro",
  canceled: "Cancelado",
};

const BADGE_CLASS: Record<JobStatus, string> = {
  pending_approval: "bg-[#f2e6c1]/15 text-[#f2e6c1]/70 border-[#f2e6c1]/20",
  queued: "bg-[#f2e6c1]/15 text-[#f2e6c1]/80 border-[#f2e6c1]/20",
  printing: "bg-[#d8442b]/30 text-[#f2e6c1] border-[#d8442b]/50",
  done: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  error: "bg-red-500/20 text-red-300 border-red-400/30",
  canceled: "bg-red-500/15 text-red-300/70 border-red-400/20",
};

function labelForLayout(layoutId: string | undefined): string {
  return BASE_LAYOUTS.find((l) => l.id === layoutId)?.label ?? "Item";
}

// "3 fotos na frente" -> "~1min30s" — approximate, since a job already
// printing may be partway through its own delay, not just starting it.
function formatEstimate(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

export function StatusStep({
  result,
  submitting,
  onNew,
}: {
  result: BatchResult | null;
  submitting: boolean;
  onNew: () => void;
}) {
  const statuses = useBatchStatus(
    result?.batchId ?? "",
    result?.jobIds ?? [],
    result?.status ?? "queued",
  );

  const jobs = (result?.jobIds ?? []).map((id, i) => ({
    id,
    layout: result?.items[i]?.layout,
    copies: result?.items[i]?.copies ?? 1,
  }));

  const total = jobs.reduce((s, j) => s + j.copies, 0);
  const statusesDone = jobs.length > 0 && jobs.every((j) => statuses[j.id] === "done");
  // Gated on `!statusesDone`, not `!allDone` — allDone can become true purely
  // from queueState below, and gating on it would disable this hook, reset
  // queueState to null, flip allDone back to false, re-enable... a flicker loop.
  const queueState = useQueuePosition(result?.batchId, !submitting && !statusesDone);
  // Resuming a batch (after a refresh/tab close) seeds `statuses` from
  // localStorage, not live data — if it already finished printing while the
  // tab was closed, no Realtime broadcast will ever arrive to flip it to
  // "done". `queue_position`'s `pending: false` is the fallback signal for
  // that case (it can't distinguish "done" from "error", same as elsewhere).
  const allDone = !submitting && jobs.length > 0 && (statusesDone || queueState?.pending === false);

  // Once `allDone` is true via the queue_position fallback, `statuses` may
  // still show stale non-terminal values (no broadcast ever arrived) —
  // reconcile per-job display so badges/counts don't contradict the header.
  function statusFor(jobId: string): JobStatus {
    const raw = statuses[jobId] ?? "queued";
    if (allDone && raw !== "error" && raw !== "canceled") return "done";
    return raw;
  }

  const done = jobs
    .filter((j) => statusFor(j.id) === "done")
    .reduce((s, j) => s + j.copies, 0);

  // Estimated wait for people still queued behind this batch (2nd place or
  // later) — not a countdown for this batch's own print. Derived from
  // `ahead` (already live-polled via queue_position, robust to refresh —
  // survives a fresh mount with no stale-value flash, since it's re-fetched
  // from the DB, not read from localStorage) times the fixed per-print delay.
  // `baseSeconds` is computed synchronously in render (not inside the effect)
  // so the very first paint after `ahead` changes already shows the right
  // number — only the "ticking down between polls" part needs an effect.
  const ahead = queueState?.ahead ?? 0;
  const baseSeconds = ahead * PRINT_COMPLETE_DELAY_SECONDS;
  const [elapsedSinceSync, setElapsedSinceSync] = useState(0);
  useEffect(() => {
    setElapsedSinceSync(0);
    if (ahead <= 0) return;
    const id = setInterval(() => setElapsedSinceSync((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [ahead]);
  const estimatedSeconds = Math.max(0, baseSeconds - elapsedSinceSync);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6"
    >
      <motion.div
        animate={allDone ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
        transition={{ duration: 0.6 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f2e6c1]/10 backdrop-blur-sm"
      >
        {allDone ? (
          <PartyPopper className="h-10 w-10 text-[#f2e6c1]" />
        ) : (
          <Printer className="h-10 w-10 animate-pulse text-[#f2e6c1]" />
        )}
      </motion.div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-[#f2e6c1]">
          {submitting ? "Enviando…" : allDone ? "Pronto! Retire sua foto" : "Imprimindo…"}
        </h2>
        <p className="mt-1 text-sm text-[#f2e6c1]/50">
          {submitting
            ? "Preparando sua foto para impressão"
            : `${done} de ${total} folha${total !== 1 ? "s" : ""} pronta${done !== 1 ? "s" : ""}`}
        </p>
      </div>

      {queueState?.pending && !allDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs rounded-2xl border border-[#d8442b]/30 bg-[#d8442b]/10 px-5 py-4 text-center backdrop-blur-sm"
        >
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#f2e6c1]/80">
            <Users className="h-3.5 w-3.5" /> Sua vez na fila
          </p>
          {queueState.ahead > 0 ? (
            <>
              <p className="mt-1 text-4xl font-black text-[#f2e6c1]">{queueState.ahead + 1}º</p>
              <p className="text-xs text-[#f2e6c1]/50">
                {queueState.ahead} {queueState.ahead === 1 ? "foto" : "fotos"} na sua frente
              </p>
              <div className="mt-3 border-t border-[#d8442b]/20 pt-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#f2e6c1]/70">
                  Tempo estimado até a sua foto
                </p>
                <p className="mt-0.5 text-2xl font-black text-[#f2e6c1]">
                  {formatEstimate(estimatedSeconds)}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-lg font-bold text-[#f2e6c1]">É a sua vez!</p>
          )}
        </motion.div>
      )}

      <div className="w-full max-w-xs">
        <Progress
          value={submitting ? undefined : total ? (done / total) * 100 : 0}
          className={`h-3 bg-[#f2e6c1]/10 ${submitting ? "animate-pulse" : ""}`}
        />
      </div>

      {!submitting && (
        <div className="w-full max-w-xs space-y-2">
          {jobs.map((j, i) => {
            const st = statusFor(j.id);
            return (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between rounded-xl bg-[#f2e6c1]/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-sm text-[#f2e6c1]">
                  {labelForLayout(j.layout)} ×{j.copies}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${BADGE_CLASS[st]}`}>
                  {LABEL[st]}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNew}
              className="rounded-2xl bg-[#d8442b] px-8 py-3.5 font-bold text-[#f2e6c1] shadow-lg shadow-[#d8442b]/25"
            >
              Nova foto
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
