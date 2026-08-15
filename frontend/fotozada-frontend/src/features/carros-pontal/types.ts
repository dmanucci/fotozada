import type { CropPixels, JobStatus, LayoutId } from "../print/types";

export type Step = "welcome" | "layout" | "frame" | "photos" | "review" | "status";

export interface FrameData {
  crop: CropPixels;
  canvas: HTMLCanvasElement;
  blob: Blob;
  width: number;
  height: number;
}

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
