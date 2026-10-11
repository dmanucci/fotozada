import { cropToCell, canvasToBlob, sha256Hex, PRINTER_CROP_BOTTOM } from "../../print/lib/compose";
import type { IzabelLayoutDef } from "./layouts";

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

export { loadImage as loadImageElement };

// Fundo desfocado da própria foto. Não usa ctx.filter (o Safari/iOS não tem):
// reduz para uma miniatura e amplia em etapas com suavização — desfoque barato
// e igual em todos os navegadores.
function paintBlurFill(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const step = (src: CanvasImageSource, sw: number, sh: number, w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d")!;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
    return c;
  };
  // miniatura "cover" de 20px de largura com a proporção da célula
  const tw = 20;
  const th = Math.max(1, Math.round((tw * H) / W));
  const k = Math.max(tw / img.naturalWidth, th / img.naturalHeight);
  const cw = tw / k;
  const ch = th / k;
  const thumb = document.createElement("canvas");
  thumb.width = tw;
  thumb.height = th;
  const tctx = thumb.getContext("2d")!;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(img, (img.naturalWidth - cw) / 2, (img.naturalHeight - ch) / 2, cw, ch, 0, 0, tw, th);
  const mid = step(thumb, tw, th, tw * 6, th * 6);
  const big = step(mid, mid.width, mid.height, Math.round(W / 4), Math.round(H / 4));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, 0, 0, big.width, big.height, 0, 0, W, H);
  // clareia: o fundo acompanha as cores da foto sem competir com ela
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.fillRect(0, 0, W, H);
}

// Desenha a foto numa célula (outW x outH) sobre fundo branco.
//  - crop === null  -> foto INTEIRA: encaixada sem cortar nada (bordas brancas
//    nas sobras, como "contain");
//  - crop definido  -> recorte escolhido pela pessoa (preenche a célula).
export function drawCell(
  img: HTMLImageElement,
  outW: number,
  outH: number,
  crop: { x: number; y: number; width: number; height: number } | null,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outW);
  canvas.height = Math.round(outH);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (crop) {
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  } else {
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    // Sobras (foto mais estreita/larga que a janela): em vez de branco, a
    // própria foto ampliada e desfocada.
    if (w < canvas.width - 1 || h < canvas.height - 1) paintBlurFill(ctx, img, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  return canvas;
}

const assetCache = new Map<string, HTMLImageElement>();

async function loadAsset(url: string): Promise<HTMLImageElement> {
  const cached = assetCache.get(url);
  if (cached) return cached;
  const img = await loadImage(url);
  assetCache.set(url, img);
  return img;
}

// Desenha uma tira completa (fundo -> fotos) no contexto em (ox, oy).
// cropLeft/cropRight vêm explícitos de quem chama — no layout tirinha, cada
// uma das 4 bordas laterais (externa-esquerda, costura-lado-1, costura-lado-2,
// externa-direita) é independente e pode precisar de valores bem diferentes
// (a costura no meio da folha não é simétrica na prática).
// Realce dos tons CLAROS do fundo, só para a impressão.
// A DNP (sublimação) imprime como papel branco os tons com menos de ~5% de tinta:
// a aquarela rosa-clara da arte some no papel, embora apareça na tela. Aqui a
// "tinta" (1 - luminância) dos tons claros é multiplicada por até `k`, com o
// efeito sumindo suavemente acima de LIFT_SPAN. Branco puro e tons mais fortes
// (bordas rosa, logo, textos) ficam exatamente como estão.
const LIFT_SPAN = 0.3;
export function liftLightTones(canvas: HTMLCanvasElement, k: number): void {
  if (k <= 1) return;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const ink = 1 - (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    if (ink <= 0.002 || ink >= LIFT_SPAN) continue;
    const f = 1 + (k - 1) * Math.pow(1 - ink / LIFT_SPAN, 0.8);
    d[i] = 255 - (255 - d[i]) * f;
    d[i + 1] = 255 - (255 - d[i + 1]) * f;
    d[i + 2] = 255 - (255 - d[i + 2]) * f;
  }
  ctx.putImageData(img, 0, 0);
}

async function drawStrip(
  ctx: CanvasRenderingContext2D,
  layout: IzabelLayoutDef,
  cells: HTMLCanvasElement[],
  ox: number,
  oy: number,
  cropLeft: number,
  cropRight: number,
  boost = 1,
) {
  const sw = layout._stripSize?.w ?? layout.sheet.width;
  const sh = layout._stripSize?.h ?? layout.sheet.height;
  const cropBottom = layout._cropBottom ?? PRINTER_CROP_BOTTOM;
  const scaleX = (sw - cropLeft - cropRight) / sw;
  const scaleY = (sh - cropBottom) / sh;

  // Mesma compensação de overscan da DNP RX1 usada em print/lib/compose.ts —
  // encolhe (ou sangra, se negativo) fundo e fotos juntos a partir das bordas
  // configuradas, como uma unidade, para que a margem valha para as duas
  // camadas sem desalinhar nada entre si.
  ctx.save();
  ctx.translate(ox + cropLeft, oy);
  ctx.scale(scaleX, scaleY);

  const bg = await loadAsset(layout._frameSvg);
  if (boost > 1) {
    // fundo reforçado numa tela à parte: só o fundo, nunca as fotos nem a sobreposição
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(sw);
    tmp.height = Math.round(sh);
    tmp.getContext("2d")!.drawImage(bg, 0, 0, tmp.width, tmp.height);
    liftLightTones(tmp, boost);
    ctx.drawImage(tmp, 0, 0, sw, sh);
  } else {
    ctx.drawImage(bg, 0, 0, sw, sh);
  }

  layout.cells.forEach((cell, i) => {
    if (cells[i]) ctx.drawImage(cells[i], cell.x, cell.y, cell.w, cell.h);
  });

  // Camada 3: sobreposição (flores/borboletas) por cima das fotos.
  if (layout._overlay) {
    const overlay = await loadAsset(layout._overlay);
    ctx.drawImage(overlay, 0, 0, sw, sh);
  }

  ctx.restore();
}

// Monta a folha de impressão completa (10x15). mirror=true duplica a tira.
export async function composeSheet(
  layout: IzabelLayoutDef,
  cells: HTMLCanvasElement[],
  mirror = true,
  // [tira esquerda, tira direita] — usado na folha de calibração; o padrão é o
  // reforço de impressão do layout. O preview/arquivo salvo NÃO usam reforço.
  boosts?: [number, number],
): Promise<Blob> {
  const boost = layout._printBoost ?? 1;
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
    await drawStrip(ctx, layout, cells, 0, 0, layout._cropLeft ?? 0, layout._cropSeamLeft ?? 0, boosts?.[0] ?? boost);
    if (mirror) {
      await drawStrip(
        ctx,
        layout,
        cells,
        layout._mirrorX,
        0,
        layout._cropSeamRight ?? 0,
        layout._cropRight ?? 0,
        boosts?.[1] ?? boost,
      );
    }
  } else {
    await drawStrip(ctx, layout, cells, 0, 0, layout._cropLeft ?? 0, layout._cropRight ?? 0, boost);
  }

  return canvasToBlob(canvas, "image/png");
}

// Renderiza uma única tira para preview (recortada no tamanho da tira).
export async function composeStripPreview(
  layout: IzabelLayoutDef,
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
