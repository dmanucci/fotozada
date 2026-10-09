import type { Cell, LayoutId } from "../../print/types";

// Motor de layout do evento Izabel 1 aninho — cópia independente do motor
// do outros eventos, simplificada: cada formato tem um único
// design de moldura, só com fundo (sem overlay sobre a foto) e sem a opção
// "sem moldura". Composição em 2 camadas: fundo -> foto.
//
// As artes usam o mesmo template dos outros eventos de 3-modelos
// (tirinha/vertical/horizontal) — os retângulos brancos das fotos caem nas
// mesmas coordenadas do viewBox, então a geometria das células e as margens
// de overscan da impressora são as mesmas já calibradas lá.

export interface IzabelLayoutDef {
  id: LayoutId;
  label: string;
  photos: number;
  sheet: { width: number; height: number };
  cellAspect: number; // width / height, alimenta o cropper
  cells: Cell[];
  _mirrorX?: number;
  _frameSvg: string; // fundo (camada 1)
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

// Padding branco entre a foto e a moldura, em unidades do viewBox. Separado
// por eixo E por tipo de moldura — cada design/orientação tem sua própria
// proporção de slot, então o mesmo valor não serve pros três.
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

export const LAYOUTS: IzabelLayoutDef[] = [
  {
    id: "strip_3",
    label: "Tirinha de 3",
    photos: 3,
    sheet: SHEET,
    cellAspect: STRIP_CELLS[0].w / STRIP_CELLS[0].h,
    cells: STRIP_CELLS,
    _mirrorX: STRIP_W,
    _frameSvg: "/izabel/Tirinha/1-bg.svg",
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
    sheet: SHEET,
    cellAspect: V_CELL.w / V_CELL.h,
    cells: [V_CELL],
    _frameSvg: "/izabel/Vertical/1-bg.svg",
  },
  {
    id: "single_10x15_h",
    label: "10×15 Horizontal",
    photos: 1,
    sheet: SHEET_H,
    cellAspect: H_CELL.w / H_CELL.h,
    cells: [H_CELL],
    _frameSvg: "/izabel/Horizontal/1-bg.svg",
    // Overscan da DNP nesse layout aparece embaixo (compensado encolhendo
    // pra dentro); na direita a impressora não imprime até a borda física —
    // valor negativo faz o conteúdo sangrar levemente pra fora nesse lado.
    _cropBottom: 15,
    _cropRight: -10,
  },
];
