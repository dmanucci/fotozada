import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { newId } from "@/lib/device";
import { useSubmitBatch } from "../print/hooks/use-submit-batch";
import type { JobStatus, PhotoItem } from "../print/types";
import type { UnaerpLayoutDef } from "./lib/layouts";
import type { BatchResult, FrameData, Step } from "./types";
import { saveBatch, loadBatch, clearBatch } from "./lib/persisted-batch";
import { StepIndicator } from "./components/step-indicator";
import { WelcomeStep } from "./components/welcome-step";
import { LayoutStep } from "./components/layout-step";
import { PhotoStep } from "./components/photo-step";
import { ReviewStep } from "./components/review-step";
import { StatusStep } from "./components/status-step";

// Sem etapa "Moldura": cada formato tem um único design neste evento.
const STEPS: Step[] = ["welcome", "layout", "photos", "review", "status"];
const STEP_NAMES = ["Início", "Formato", "Foto", "Revisão", "Status"];

export function UnaerpConceptPage() {
  const kioskId = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") ?? "unaerp-concept",
    [],
  );
  const submit = useSubmitBatch();

  // A batch that was still printing survives a refresh/tab close — resume
  // straight to the status screen instead of losing track of it.
  const [initialResult] = useState<BatchResult | null>(loadBatch);

  const [step, setStep] = useState<Step>(initialResult ? "status" : "welcome");
  const [layout, setLayout] = useState<UnaerpLayoutDef | null>(null);
  const [frames, setFrames] = useState<FrameData[] | null>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [result, setResult] = useState<BatchResult | null>(initialResult);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  function handleConfirm(item: PhotoItem) {
    const allItems = [...items, item];
    setItems(allItems);
    setSubmitting(true);
    setStep("status");

    if (!requestIdRef.current) requestIdRef.current = newId();
    submit
      .mutateAsync({ kioskId, items: allItems, clientRequestId: requestIdRef.current })
      .then((res) => {
        if (res.blocked) {
          toast.warning(`Limite de ${res.max} folhas por envio`);
          setSubmitting(false);
          setStep("review");
          return;
        }
        if (res.error) {
          toast.error("Erro", { description: res.error });
          setSubmitting(false);
          setStep("review");
          return;
        }
        if (res.batch_id && res.job_ids) {
          const newResult: BatchResult = {
            batchId: res.batch_id,
            jobIds: res.job_ids,
            status: (res.status as JobStatus) ?? "queued",
            items: allItems.map((i) => ({ layout: i.layout, copies: i.copies })),
          };
          setResult(newResult);
          saveBatch(newResult);
          setSubmitting(false);
        }
      })
      .catch(() => {
        toast.error("Falha ao enviar");
        setSubmitting(false);
        setStep("review");
      });
  }

  function reset() {
    items.forEach((i) => URL.revokeObjectURL(i.composedUrl));
    setItems([]);
    setResult(null);
    clearBatch();
    requestIdRef.current = null;
    setLayout(null);
    setFrames(null);
    setStep("welcome");
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-linear-to-b from-[#2b3990] via-[#2b3990] to-[#1f2a70]">
      {/* Faixas diagonais azul-claras no canto superior direito — mesmo
          motivo do fundo das molduras. */}
      <div className="pointer-events-none absolute -right-16 -top-10 z-0 flex rotate-[-24deg] gap-4 opacity-50">
        <div className="h-72 w-10 bg-[#4765ad]" />
        <div className="mt-8 h-72 w-16 bg-[#4765ad]" />
        <div className="mt-2 h-72 w-8 bg-[#4765ad]" />
      </div>

      <div className="relative z-20 h-12 pb-2 pt-14">
        {step !== "welcome" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <StepIndicator steps={STEP_NAMES} current={stepIndex} />
          </motion.div>
        )}
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <WelcomeStep key="welcome" onStart={() => setStep("layout")} />
          )}
          {step === "layout" && (
            <LayoutStep
              key="layout"
              onSelect={(l) => {
                setLayout(l);
                setStep("photos");
              }}
              onBack={() => setStep("welcome")}
            />
          )}
          {step === "photos" && layout && (
            <PhotoStep
              key="photos"
              layout={layout}
              onDone={(f) => {
                setFrames(f);
                setStep("review");
              }}
              onBack={() => setStep("layout")}
            />
          )}
          {step === "review" && layout && frames && (
            <ReviewStep
              key="review"
              layout={layout}
              frames={frames}
              onConfirm={handleConfirm}
              onBack={() => setStep("photos")}
            />
          )}
          {step === "status" && (
            <StatusStep key="status" result={result} submitting={submitting} onNew={reset} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
