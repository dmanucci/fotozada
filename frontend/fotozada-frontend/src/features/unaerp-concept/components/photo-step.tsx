import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, ChevronLeft, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { canvasToBlob, cropToCell } from "../lib/compose";
import type { UnaerpLayoutDef } from "../lib/layouts";
import type { FrameData } from "../types";

export function PhotoStep({
  layout,
  onDone,
  onBack,
}: {
  layout: UnaerpLayoutDef;
  onDone: (frames: FrameData[]) => void;
  onBack: () => void;
}) {
  const [frames, setFrames] = useState<FrameData[]>([]);
  const current = frames.length;
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);

  const onCropComplete = useCallback((_a: Area, px: Area) => setAreaPixels(px), []);

  function tryLoad(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = url;
    });
  }

  function applyPicked(url: string) {
    if (pickedSrc) URL.revokeObjectURL(pickedSrc);
    setPickedSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file after an error
    if (!file) return;

    const originalUrl = URL.createObjectURL(file);
    if (await tryLoad(originalUrl)) {
      applyPicked(originalUrl);
      return;
    }

    // Browser couldn't decode it directly — most common cause is HEIC/HEIF
    // (Android has no native decoder for it, unlike iOS). Convert via WASM
    // and retry before giving up.
    URL.revokeObjectURL(originalUrl);
    setConverting(true);
    try {
      const heic2any = (await import("heic2any")).default;
      const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
      const jpegBlob = Array.isArray(result) ? result[0] : result;
      const convertedUrl = URL.createObjectURL(jpegBlob);
      if (!(await tryLoad(convertedUrl))) {
        URL.revokeObjectURL(convertedUrl);
        throw new Error("converted image still unreadable");
      }
      applyPicked(convertedUrl);
    } catch {
      toast.error("Não foi possível abrir essa foto", {
        description: "Tente escolher outra foto ou tirar uma nova.",
      });
    } finally {
      setConverting(false);
    }
  }

  async function confirmCrop() {
    if (!pickedSrc || !areaPixels) return;
    setBusy(true);
    const cell = layout.cells[current];
    const canvas = await cropToCell(pickedSrc, areaPixels, cell.w, cell.h);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const next = [
      ...frames,
      { crop: areaPixels, canvas, blob, width: canvas.width, height: canvas.height },
    ];
    URL.revokeObjectURL(pickedSrc);
    setPickedSrc(null);
    setAreaPixels(null);
    setBusy(false);
    setFrames(next);
    if (next.length === layout.photos) onDone(next);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-6"
    >
      <button onClick={onBack} className="flex items-center gap-1 self-start text-sm text-white/60">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="text-center">
        <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-white">
          <Camera className="h-5 w-5 text-white" />
          Suas fotos
          {layout.photos > 1 && (
            <span className="rounded-full bg-[#eedd13] px-2.5 py-0.5 text-sm font-bold text-[#2b3990]">
              {current + 1}/{layout.photos}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          {converting
            ? "Convertendo foto…"
            : !pickedSrc
              ? "Escolha uma foto da galeria"
              : "Ajuste o enquadramento"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {converting ? (
          <motion.div
            key="converting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 bg-white/5"
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="text-sm text-white/40">Só um instante…</span>
          </motion.div>
        ) : !pickedSrc ? (
          <motion.label
            key="upload"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 bg-white/5"
          >
            <div className="animate-float flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eedd13] shadow-[3px_3px_0_#000]">
              <Upload className="h-8 w-8 text-[#2b3990]" />
            </div>
            <span className="text-base font-semibold text-white">Escolher foto</span>
            <span className="text-xs text-white/40">Toque para abrir a galeria</span>
            <input type="file" accept="image/*" hidden onChange={pickFile} />
          </motion.label>
        ) : (
          <motion.div
            key="crop"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col gap-4"
          >
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-black/40">
              <Cropper
                image={pickedSrc}
                crop={crop}
                zoom={zoom}
                aspect={layout.cellAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={([z]) => setZoom(z)}
              className="[&_[role=slider]]:bg-[#eedd13]"
            />
            <div className="flex flex-col gap-3">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full rounded-xl bg-[#eedd13] font-bold text-[#2b3990] shadow-[3px_3px_0_#000] hover:bg-[#d9c80f]"
                  disabled={busy || !areaPixels}
                  onClick={confirmCrop}
                >
                  {current + 1 < layout.photos ? "Próxima" : "Concluir"}
                </Button>
              </motion.div>
              <Button asChild variant="outline" className="w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <label>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Trocar foto
                  <input type="file" accept="image/*" hidden onChange={pickFile} />
                </label>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
