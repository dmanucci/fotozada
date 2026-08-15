import type { Cell, LayoutId } from "../../print/types";

// Motor de layout do evento Carros Antigos de Pontal-SP — cópia do motor do
// Arraiá Regalle (mesma DNP RX1, mesma calibração de overscan/costura já
// validada em evento real). Só a arte das molduras muda entre os eventos.

export interface CarrosLayoutDef {
  id: LayoutId;
  label: string;
  photos: number;
  sheet: { width: number; height: number };
  cellAspect: number; // width / height, alimenta o cropper
  cells: Cell[];
  frameNumber: FrameNumber;
  _mirrorX?: number;
  _frameSvg?: string; // fundo (camada 1) — ausente na opção "sem moldura"
  _overlaySvg?: string; // arte sobre a foto (camada 3) — ausente no design 1
  _stripSize?: { w: number; h: number };
  _cropBottom?: number; // px — override da margem de overscan padrão (PRINTER_CROP_BOTTOM)
  // Bordas externas reais da folha (esquerda da tira-1, direita da tira-2).
  _cropRight?: number;
  _cropLeft?: number;
  // Costura no meio da folha — assimétrica na prática, cada lado é
  // independente (cropSeamLeft = lado direito da tira-1; cropSeamRight =
  // lado esquerdo da tira-2). Só usado em layouts espelhados (tirinha).
  _cropSeamLeft?: number;
  _cropSeamRight?: number;
}

const SHEET = { width: 1200, height: 1800 }; // 10×15 retrato @ 300 DPI
const SHEET_H = { width: 1800, height: 1200 }; // 10×15 paisagem @ 300 DPI

// Padding branco entre a foto e a moldura, em unidades do viewBox. Mesmos
// valores calibrados no Arraiá Regalle — a geometria física da folha e da
// impressora não muda entre eventos, só a arte das molduras.
const STRIP_INSET_X = 6;
const STRIP_INSET_Y = 4;
const V_INSET_X = 6;
const V_INSET_Y = 2.5;
const H_INSET_X = 7;
const H_INSET_Y = 2.5;

// --- Tirinha 5×15 (duas tiras espelhadas por folha) ---
const SVG_VB_W = 141.75;
const STRIP_W = SHEET.width / 2;
const STRIP_H = SHEET.height;
const S = STRIP_W / SVG_VB_W;

const SVG_SLOTS_RAW = [
  { x: 14.0, y: 77.5, w: 115.5, h: 97.0 },
  { x: 15.0, y: 183.5, w: 113.5, h: 95.5 },
  { x: 14.0, y: 288.5, w: 114.0, h: 95.5 },
];
const SVG_SLOTS = SVG_SLOTS_RAW.map((s) => ({
  x: s.x + STRIP_INSET_X,
  y: s.y + STRIP_INSET_Y,
  w: s.w - STRIP_INSET_X * 2,
  h: s.h - STRIP_INSET_Y * 2,
}));
const STRIP_CELLS = SVG_SLOTS.map((slot) => ({
  x: Math.round(slot.x * S),
  y: Math.round(slot.y * S),
  w: Math.round(slot.w * S),
  h: Math.round(slot.h * S),
}));

// --- 10×15 Vertical (moldura retrato sobre a folha inteira) ---
const V_VB_W = 283.5;
const V_S = SHEET.width / V_VB_W;
const V_SLOT_RAW = { x: 13.3, y: 83.5, w: 256.3, h: 291.3 };
const V_CELL = {
  x: Math.round((V_SLOT_RAW.x + V_INSET_X) * V_S),
  y: Math.round((V_SLOT_RAW.y + V_INSET_Y) * V_S),
  w: Math.round((V_SLOT_RAW.w - V_INSET_X * 2) * V_S),
  h: Math.round((V_SLOT_RAW.h - V_INSET_Y * 2) * V_S),
};

// --- 10×15 Horizontal (moldura paisagem sobre a folha inteira) ---
const H_VB_W = 425.25;
const H_S = SHEET_H.width / H_VB_W;
const H_SLOT_RAW = { x: 15, y: 59.5, w: 395, h: 187 };
const H_CELL = {
  x: Math.round((H_SLOT_RAW.x + H_INSET_X) * H_S),
  y: Math.round((H_SLOT_RAW.y + H_INSET_Y) * H_S),
  w: Math.round((H_SLOT_RAW.w - H_INSET_X * 2) * H_S),
  h: Math.round((H_SLOT_RAW.h - H_INSET_Y * 2) * H_S),
};

export type FrameFolder = "Tirinha" | "Vertical" | "Horizontal";

export interface BaseLayout {
  id: LayoutId;
  label: string;
  photos: number;
  folder: FrameFolder;
  sheet: { width: number; height: number };
  cellAspect: number;
  cells: Cell[];
  _mirrorX?: number;
  _stripSize?: { w: number; h: number };
  _cropBottom?: number;
  _cropRight?: number;
  _cropLeft?: number;
  _cropSeamLeft?: number;
  _cropSeamRight?: number;
}

export const BASE_LAYOUTS: BaseLayout[] = [
  {
    id: "strip_3",
    label: "Tirinha de 3",
    photos: 3,
    folder: "Tirinha",
    sheet: SHEET,
    cellAspect: STRIP_CELLS[0].w / STRIP_CELLS[0].h,
    cells: STRIP_CELLS,
    _mirrorX: STRIP_W,
    _stripSize: { w: STRIP_W, h: STRIP_H },
    _cropLeft: -14,
    _cropRight: -14,
    _cropSeamLeft: -24,
    _cropSeamRight: -16,
  },
  {
    id: "single_10x15_v",
    label: "10×15 Vertical",
    photos: 1,
    folder: "Vertical",
    sheet: SHEET,
    cellAspect: V_CELL.w / V_CELL.h,
    cells: [V_CELL],
  },
  {
    id: "single_10x15_h",
    label: "10×15 Horizontal",
    photos: 1,
    folder: "Horizontal",
    sheet: SHEET_H,
    cellAspect: H_CELL.w / H_CELL.h,
    cells: [H_CELL],
    _cropBottom: 15,
    _cropRight: -10,
  },
];

// 0 = "sem moldura" (nem fundo nem overlay, só a foto na folha branca).
// Reduzido a [0, 1, 2] pro prazo do evento — dá pra adicionar mais designs
// depois (basta subir os SVGs em /public/carros-pontal/<Pasta>/N-bg.svg e
// incluir o número aqui).
export const FRAME_NUMBERS = [0, 1, 2] as const;
export type FrameNumber = (typeof FRAME_NUMBERS)[number];

export function frameAssetPaths(folder: FrameFolder, n: FrameNumber) {
  if (n === 0) return { bg: undefined, overlay: undefined };
  return {
    bg: `/carros-pontal/${folder}/${n}-bg.svg`,
    overlay: n === 1 ? undefined : `/carros-pontal/${folder}/${n}-overlay.svg`,
  };
}

// "Sem moldura": a foto preenche a folha (ou cada terço da tira) inteira,
// de ponta a ponta — sem a margem que as molduras reservam pra arte do
// fundo. Divide a tira em fatias iguais sem gaps mesmo se `h/photos` não
// for um inteiro exato.
function fullBleedCells(base: BaseLayout): Cell[] {
  if (base._stripSize) {
    const { w, h } = base._stripSize;
    const n = base.photos;
    const bounds = Array.from({ length: n + 1 }, (_, i) => Math.round((i * h) / n));
    return Array.from({ length: n }, (_, i) => ({
      x: 0,
      y: bounds[i],
      w,
      h: bounds[i + 1] - bounds[i],
    }));
  }
  return [{ x: 0, y: 0, w: base.sheet.width, h: base.sheet.height }];
}

export function buildLayout(baseId: LayoutId, frameNumber: FrameNumber): CarrosLayoutDef {
  const base = BASE_LAYOUTS.find((b) => b.id === baseId);
  if (!base) throw new Error(`layout desconhecido: ${baseId}`);
  const { bg, overlay } = frameAssetPaths(base.folder, frameNumber);
  const cells = frameNumber === 0 ? fullBleedCells(base) : base.cells;
  return {
    id: base.id,
    label: base.label,
    photos: base.photos,
    sheet: base.sheet,
    cellAspect: cells[0].w / cells[0].h,
    cells,
    frameNumber,
    _mirrorX: base._mirrorX,
    _frameSvg: bg,
    _overlaySvg: overlay,
    _stripSize: base._stripSize,
    _cropBottom: base._cropBottom,
    _cropRight: base._cropRight,
    _cropLeft: base._cropLeft,
    _cropSeamLeft: base._cropSeamLeft,
    _cropSeamRight: base._cropSeamRight,
  };
}
