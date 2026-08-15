import { cropToCell, canvasToBlob, sha256Hex, PRINTER_CROP_BOTTOM } from "../../print/lib/compose";
import type { RegalleLayoutDef } from "./layouts";

// Reexportadas: utilitários genéricos sem lógica de evento (recorte, blob,
// hash) — não há motivo para duplicá-los.
export { cropToCell, canvasToBlob, sha256Hex };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed: " + src));
    img.src = src;
  });
}

const assetCache = new Map<string, HTMLImageElement>();

async function loadAsset(url: string): Promise<HTMLImageElement> {
  const cached = assetCache.get(url);
  if (cached) return cached;
  const img = await loadImage(url);
  assetCache.set(url, img);
  return img;
}

// Desenha `img` cobrindo a caixa (dx, dy, dw, dh) sem distorcer — escala
// uniformemente pelo maior fator, centraliza e recorta o excedente (mesmo
// comportamento de `object-fit: cover`). Os PNGs de overlay são exportados
// com proporção própria, diferente da tira/folha final, e o transbordo é
// proposital: deve ser cortado, não espremido para caber.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

// Desenha uma tira completa (fundo -> fotos -> overlay) no contexto em (ox, oy).
// cropLeft/cropRight vêm explícitos de quem chama — no layout tirinha, cada
// uma das 4 bordas laterais (externa-esquerda, costura-lado-1, costura-lado-2,
// externa-direita) é independente e pode precisar de valores bem diferentes
// (a costura no meio da folha não é simétrica na prática).
async function drawStrip(
  ctx: CanvasRenderingContext2D,
  layout: RegalleLayoutDef,
  cells: HTMLCanvasElement[],
  ox: number,
  oy: number,
  cropLeft: number,
  cropRight: number,
) {
  const sw = layout._stripSize?.w ?? layout.sheet.width;
  const sh = layout._stripSize?.h ?? layout.sheet.height;
  const cropBottom = layout._cropBottom ?? PRINTER_CROP_BOTTOM;
  const scaleX = (sw - cropLeft - cropRight) / sw;
  const scaleY = (sh - cropBottom) / sh;

  // Mesma compensação de overscan da DNP RX1 usada em print/lib/compose.ts —
  // encolhe (ou sangra, se negativo) fundo, fotos e overlay juntos a partir
  // das bordas configuradas, como uma unidade, para que a margem valha para
  // todas as camadas sem desalinhar nada entre si.
  ctx.save();
  ctx.translate(ox + cropLeft, oy);
  ctx.scale(scaleX, scaleY);

  if (layout._frameSvg) {
    const bg = await loadAsset(layout._frameSvg);
    ctx.drawImage(bg, 0, 0, sw, sh);
  }

  layout.cells.forEach((cell, i) => {
    if (cells[i]) ctx.drawImage(cells[i], cell.x, cell.y, cell.w, cell.h);
  });

  if (layout._overlaySvg) {
    const overlay = await loadAsset(layout._overlaySvg);
    drawCover(ctx, overlay, 0, 0, sw, sh);
  }

  ctx.restore();
}

// Monta a folha de impressão completa (10x15). mirror=true duplica a tira.
export async function composeSheet(
  layout: RegalleLayoutDef,
  cells: HTMLCanvasElement[],
  mirror = true,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = layout.sheet.width;
  canvas.height = layout.sheet.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (layout._mirrorX != null) {
    // Tirinha: 4 bordas laterais independentes — tira 1 usa a borda externa
    // esquerda + seu lado da costura; tira 2 usa o outro lado da costura +
    // a borda externa direita.
    await drawStrip(ctx, layout, cells, 0, 0, layout._cropLeft ?? 0, layout._cropSeamLeft ?? 0);
    if (mirror) {
      await drawStrip(
        ctx,
        layout,
        cells,
        layout._mirrorX,
        0,
        layout._cropSeamRight ?? 0,
        layout._cropRight ?? 0,
      );
    }
  } else {
    await drawStrip(ctx, layout, cells, 0, 0, layout._cropLeft ?? 0, layout._cropRight ?? 0);
  }

  return canvasToBlob(canvas, "image/png");
}

// Renderiza uma única tira para preview (recortada no tamanho da tira).
export async function composeStripPreview(
  layout: RegalleLayoutDef,
  cells: HTMLCanvasElement[],
): Promise<Blob> {
  if (!layout._stripSize) return composeSheet(layout, cells, false);

  const sw = layout._stripSize.w;
  const sh = layout._stripSize.h;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);

  await drawStrip(ctx, layout, cells, 0, 0, layout._cropLeft ?? 0, layout._cropSeamLeft ?? 0);

  return canvasToBlob(canvas, "image/png");
}
