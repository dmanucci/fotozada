import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { newId } from "@/lib/device";
import { useSubmitBatch } from "../print/hooks/use-submit-batch";
import type { JobStatus, PhotoItem } from "../print/types";
import type { IzabelLayoutDef } from "./lib/layouts";
import type { BatchResult, FrameData, Step } from "./types";
import { saveBatch, loadBatch, clearBatch } from "./lib/persisted-batch";
import { StepIndicator } from "./components/step-indicator";
import { StoryStep } from "./components/story-step";
import { LayoutStep } from "./components/layout-step";
import { PhotoStep } from "./components/photo-step";
import { ReviewStep } from "./components/review-step";
import { StatusStep } from "./components/status-step";

// Sem etapa "Moldura": cada formato tem um único design neste evento.
// "story" é o storytelling de abertura (scroll, mês a mês) antes do fluxo de foto.
const STEPS: Step[] = ["story", "layout", "photos", "review", "status"];
const STEP_NAMES = ["História", "Formato", "Foto", "Revisão", "Status"];

export function IzabelPage() {
  const kioskId = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") ?? "izabel-1-aninho",
    [],
  );
  const submit = useSubmitBatch();

  // A batch that was still printing survives a refresh/tab close — resume
  // straight to the status screen instead of losing track of it.
  const [initialResult] = useState<BatchResult | null>(loadBatch);

  const [step, setStep] = useState<Step>(initialResult ? "status" : "story");
  const [layout, setLayout] = useState<IzabelLayoutDef | null>(null);
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
    setStep("story");
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      className="relative flex h-svh flex-col overflow-hidden bg-[#fff5f7] bg-cover bg-center"
      style={{ backgroundImage: "url(/izabel/aquarela.webp)" }}
    >
      <div className="relative z-20 h-12 pb-2 pt-14">
        {step !== "story" && (
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
          {step === "story" && (
            <StoryStep key="story" onStart={() => setStep("layout")} />
          )}
          {step === "layout" && (
            <LayoutStep
              key="layout"
              onSelect={(l) => {
                setLayout(l);
                setStep("photos");
              }}
              onBack={() => setStep("story")}
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
