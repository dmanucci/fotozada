import type { Cell, LayoutId } from "../../print/types";

// Motor de layout do evento Izabel 1 aninho — cópia independente do motor
// do outros eventos, simplificada: cada formato tem um único
// design de moldura, só com fundo (sem overlay sobre a foto) e sem a opção
// "sem moldura". Composição: fundo -> foto (-> sobreposição, quando o layout tem uma).
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
  _frameSvg: string; // fundo (camada 1) — SVG ou imagem raster
  _overlay?: string; // sobreposição por cima das fotos (camada 3), PNG/WebP com transparência
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
  // Reforço dos tons claros do fundo só na impressão (ver liftLightTones em compose.ts).
  _printBoost?: number;
}

const SHEET = { width: 1200, height: 1800 }; // 10×15 retrato @ 300 DPI
const SHEET_H = { width: 1800, height: 1200 }; // 10×15 paisagem @ 300 DPI

// Padding branco entre a foto e a moldura, em unidades do viewBox. Separado
// por eixo E por tipo de moldura — cada design/orientação tem sua própria
// proporção de slot, então o mesmo valor não serve pros três.

// --- Tirinha 5×15 (duas tiras espelhadas por folha) ---
// Arte raster 667×2000 (proporção exata 5×15 cm). Camadas: fundo -> fotos ->
// sobreposição (flores/borboletas por cima das bordas das fotos).
const STRIP_W = SHEET.width / 2; // 600
const STRIP_H = SHEET.height; // 1800
const ART_W = 667;
const ART_H = 2000;
const SX = STRIP_W / ART_W;
const SY = STRIP_H / ART_H;

// Área interna (branca) de cada moldura, medida na arte em px: x0,y0 → x1,y1.
// As molduras têm tamanhos ligeiramente diferentes no desenho original.
const ART_SLOTS = [
  { x0: 68, y0: 368, x1: 608, y1: 819 },
  { x0: 67, y0: 868, x1: 600, y1: 1312 },
  { x0: 68, y0: 1362, x1: 601, y1: 1807 },
];
// Respiro entre a foto e a borda rosa da moldura (px da arte).
const ART_INSET = 4;
const STRIP_CELLS = ART_SLOTS.map((r) => ({
  x: Math.round((r.x0 + ART_INSET) * SX),
  y: Math.round((r.y0 + ART_INSET) * SY),
  w: Math.round((r.x1 - r.x0 + 1 - ART_INSET * 2) * SX),
  h: Math.round((r.y1 - r.y0 + 1 - ART_INSET * 2) * SY),
}));

// --- 10×15 Vertical (moldura retrato sobre a folha inteira) ---
// Arte raster 1333×2000 (2:3). Camadas: fundo -> foto -> sobreposição.
// A moldura rosa mede x 62–1270, y 393–1764 na arte (borda de ~3px).
const V_ART_W = 1333;
const V_ART_H = 2000;
const V_SX = SHEET.width / V_ART_W;
const V_SY = SHEET.height / V_ART_H;
const V_FRAME = { x0: 65, y0: 397, x1: 1267, y1: 1760 }; // interior, sem a borda
const V_CELL = {
  x: Math.round((V_FRAME.x0 + ART_INSET) * V_SX),
  y: Math.round((V_FRAME.y0 + ART_INSET) * V_SY),
  w: Math.round((V_FRAME.x1 - V_FRAME.x0 + 1 - ART_INSET * 2) * V_SX),
  h: Math.round((V_FRAME.y1 - V_FRAME.y0 + 1 - ART_INSET * 2) * V_SY),
};

// --- 10×15 Horizontal (moldura paisagem sobre a folha inteira) ---
// Arte raster 2000×1333 (3:2). Camadas: fundo -> foto -> sobreposição.
// A janela branca da foto mede x 71–1932, y 280–1161 na arte (px).
const H_ART_W = 2000;
const H_ART_H = 1333;
const H_SX = SHEET_H.width / H_ART_W;
const H_SY = SHEET_H.height / H_ART_H;
const H_WINDOW = { x0: 71, y0: 280, x1: 1932, y1: 1161 };
const H_CELL = {
  x: Math.round(H_WINDOW.x0 * H_SX),
  y: Math.round(H_WINDOW.y0 * H_SY),
  w: Math.round((H_WINDOW.x1 - H_WINDOW.x0 + 1) * H_SX),
  h: Math.round((H_WINDOW.y1 - H_WINDOW.y0 + 1) * H_SY),
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
    _frameSvg: "/izabel/Tirinha/fundo.webp",
    _overlay: "/izabel/Tirinha/sobreposicao.webp",
    _printBoost: 2.0,
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
    _frameSvg: "/izabel/Vertical/fundo.webp",
    _overlay: "/izabel/Vertical/sobreposicao.webp",
    _printBoost: 2.0,
  },
  {
    id: "single_10x15_h",
    label: "10×15 Horizontal",
    photos: 1,
    sheet: SHEET_H,
    cellAspect: H_CELL.w / H_CELL.h,
    cells: [H_CELL],
    _frameSvg: "/izabel/Horizontal/fundo.webp",
    _overlay: "/izabel/Horizontal/sobreposicao.webp",
    _printBoost: 2.0,
    // Overscan da DNP nesse layout aparece embaixo (compensado encolhendo
    // pra dentro); na direita a impressora não imprime até a borda física —
    // valor negativo faz o conteúdo sangrar levemente pra fora nesse lado.
    _cropBottom: 15,
    _cropRight: -10,
  },
];
