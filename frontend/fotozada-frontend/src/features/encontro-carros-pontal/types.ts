import type { CropPixels, JobStatus, LayoutId } from "../print/types";

export type Step = "welcome" | "layout" | "frame" | "photos" | "review" | "status";

export interface FrameData {
  crop: CropPixels;
  canvas: HTMLCanvasElement;
  blob: Blob;
  width: number;
  height: number;
}

// O que StatusStep precisa por job — exclui blobs/object URLs de propósito
// para que BatchResult continue serializável em JSON (persistido no
// localStorage para sobreviver a um refresh/fechamento de aba com um lote
// ainda imprimindo).
export interface JobSummary {
  layout: LayoutId;
  copies: number;
}

export interface BatchResult {
  batchId: string;
  jobIds: string[];
  status: JobStatus;
  items: JobSummary[];
}
