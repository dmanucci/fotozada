import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Download, MessageCircleHeart, PartyPopper, Printer, Users } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { LAYOUTS } from "../lib/layouts";
import { PRINT_COMPLETE_DELAY_SECONDS } from "../../print/lib/print-timing";
import { useBatchStatus } from "../../print/hooks/use-batch-status";
import { useQueuePosition } from "../../print/hooks/use-queue-position";
import type { JobStatus } from "../../print/types";
import type { BatchResult } from "../types";
import { savePhoto } from "../lib/save-photo";

const LABEL: Record<JobStatus, string> = {
  pending_approval: "Aguardando",
  queued: "Na fila",
  printing: "Imprimindo…",
  done: "Pronto!",
  error: "Erro",
  canceled: "Cancelado",
};

const BADGE_CLASS: Record<JobStatus, string> = {
  pending_approval: "bg-white/60 text-[#8b5580]/70 border-[#8b5580]/20",
  queued: "bg-white/60 text-[#8b5580]/80 border-[#8b5580]/20",
  printing: "bg-[#ef8fb0]/20 text-[#b5487a] border-[#ef8fb0]/50",
  done: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40",
  error: "bg-red-500/20 text-red-700 border-red-500/40",
  canceled: "bg-red-500/15 text-red-700/70 border-red-500/30",
};

function labelForLayout(layoutId: string | undefined): string {
  return LAYOUTS.find((l) => l.id === layoutId)?.label ?? "Item";
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
  photoUrls = [],
}: {
  result: BatchResult | null;
  submitting: boolean;
  onNew: () => void;
  // pré-visualizações das fotos desta sessão (vazio após um refresh da página)
  photoUrls?: string[];
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
        className="flex h-20 w-20 items-center justify-center rounded-full bg-white/60 backdrop-blur-sm"
      >
        {allDone ? (
          <PartyPopper className="h-10 w-10 text-[#8b5580]" />
        ) : (
          <Printer className="h-10 w-10 animate-pulse text-[#8b5580]" />
        )}
      </motion.div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-[#8b5580]">
          {submitting ? "Enviando…" : allDone ? "Pronto! Retire sua foto" : "Imprimindo…"}
        </h2>
        <p className="mt-1 text-sm text-[#8b5580]/50">
          {submitting
            ? "Preparando sua foto para impressão"
            : `${done} de ${total} folha${total !== 1 ? "s" : ""} pronta${done !== 1 ? "s" : ""}`}
        </p>
      </div>

      {queueState?.pending && !allDone && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs rounded-2xl border border-[#ef8fb0]/30 bg-[#ef8fb0]/10 px-5 py-4 text-center backdrop-blur-sm"
        >
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8b5580]/80">
            <Users className="h-3.5 w-3.5" /> Sua vez na fila
          </p>
          {queueState.ahead > 0 ? (
            <>
              <p className="mt-1 text-4xl font-black text-[#8b5580]">{queueState.ahead + 1}º</p>
              <p className="text-xs text-[#8b5580]/50">
                {queueState.ahead} {queueState.ahead === 1 ? "foto" : "fotos"} na sua frente
              </p>
              <div className="mt-3 border-t border-[#ef8fb0]/20 pt-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5580]/70">
                  Tempo estimado até a sua foto
                </p>
                <p className="mt-0.5 text-2xl font-black text-[#8b5580]">
                  {formatEstimate(estimatedSeconds)}
                </p>
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-lg font-bold text-[#8b5580]">É a sua vez!</p>
          )}
        </motion.div>
      )}

      <div className="w-full max-w-xs">
        <Progress
          value={submitting ? undefined : total ? (done / total) * 100 : 0}
          className={`h-3 bg-white/60 ${submitting ? "animate-pulse" : ""}`}
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
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-sm text-[#8b5580]">
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

      {!submitting && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs space-y-2 rounded-2xl bg-white/70 p-4 text-center"
        >
          <p className="font-[Nunito] text-lg font-black text-[#6a3a64]">
            Agora você faz parte da história 💗
          </p>
          <p className="text-xs font-semibold text-[#8b5580]">
            Leve a sua foto também no celular e deixe um recado para a Izabel.
          </p>
          {photoUrls.map((url, i) => (
            <button
              key={url}
              onClick={() =>
                savePhoto(url, `izabel-1-aninho-${i + 1}.png`).catch(() =>
                  toast.error("Não consegui salvar a foto. Tente de novo."),
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef8fb0] px-4 py-2.5 text-sm font-extrabold text-white shadow-[3px_3px_0_#c9709a]"
            >
              <Download className="h-4 w-4" />
              Salvar no celular{photoUrls.length > 1 ? ` (${i + 1})` : ""}
            </button>
          ))}
          <Link
            to={`/izabel/mural${window.location.search}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8b5580] bg-white px-4 py-2.5 text-sm font-extrabold text-[#6a3a64]"
          >
            <MessageCircleHeart className="h-4 w-4" /> Deixar um recado
          </Link>
        </motion.div>
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
              className="rounded-2xl bg-[#ef8fb0] px-8 py-3.5 font-bold text-white shadow-[4px_4px_0_#c9709a]"
            >
              Nova foto
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
