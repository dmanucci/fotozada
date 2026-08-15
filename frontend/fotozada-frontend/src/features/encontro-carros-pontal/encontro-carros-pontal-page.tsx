import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { newId } from "@/lib/device";
import { useTotemSettings } from "../print/hooks/use-totem-settings";
import { useSubmitBatch } from "../print/hooks/use-submit-batch";
import type { JobStatus, PhotoItem } from "../print/types";
import type { BaseLayout, RegalleLayoutDef } from "./lib/layouts";
import type { BatchResult, FrameData, Step } from "./types";
import { saveBatch, loadBatch, clearBatch } from "./lib/persisted-batch";
import { StepIndicator } from "./components/step-indicator";
import { WelcomeStep } from "./components/welcome-step";
import { LayoutStep } from "./components/layout-step";
import { FrameStep } from "./components/frame-step";
import { PhotoStep } from "./components/photo-step";
import { ReviewStep } from "./components/review-step";
import { StatusStep } from "./components/status-step";

const STEP_NAMES = ["Início", "Formato", "Moldura", "Foto", "Revisão", "Status"];

export function EncontroCarrosPontalPage() {
  const kioskId = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") ?? "carros-pontal",
    [],
  );
  const settings = useTotemSettings(kioskId);
  const maxSheets = settings.data?.max_sheets_per_batch ?? 5;
  const submit = useSubmitBatch();

  // A batch that was still printing survives a refresh/tab close — resume
  // straight to the status screen instead of losing track of it.
  const [initialResult] = useState<BatchResult | null>(loadBatch);

  const [step, setStep] = useState<Step>(initialResult ? "status" : "welcome");
  const [baseLayout, setBaseLayout] = useState<BaseLayout | null>(null);
  const [layout, setLayout] = useState<RegalleLayoutDef | null>(null);
  const [frames, setFrames] = useState<FrameData[] | null>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [result, setResult] = useState<BatchResult | null>(initialResult);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef<string | null>(null);

  const sheets = items.reduce((s, i) => s + i.copies, 0);
  const remaining = maxSheets - sheets;
  void remaining; void sheets;

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
    setBaseLayout(null);
    setLayout(null);
    setFrames(null);
    setStep("welcome");
  }

  const stepIndex = STEP_NAMES.indexOf(
    step === "welcome"
      ? "Início"
      : step === "layout"
        ? "Formato"
        : step === "frame"
          ? "Moldura"
          : step === "photos"
            ? "Foto"
            : step === "review"
              ? "Revisão"
              : "Status",
  );

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-linear-to-b from-[#3b0f15] via-[#521720] to-[#3b0f15]">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 85%, rgba(216,68,43,0.28) 0%, rgba(59,15,21,0.6) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-20 pb-2 pt-14 h-12">
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
                setBaseLayout(l);
                setStep("frame");
              }}
              onBack={() => setStep("welcome")}
            />
          )}
          {step === "frame" && baseLayout && (
            <FrameStep
              key="frame"
              base={baseLayout}
              onSelect={(l) => {
                setLayout(l);
                setStep("photos");
              }}
              onBack={() => setStep("layout")}
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
              onBack={() => setStep("frame")}
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
