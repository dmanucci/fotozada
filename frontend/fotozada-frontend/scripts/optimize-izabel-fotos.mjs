// Converte as fotos originais da Izabel para o tamanho/formato ideal do site:
// 800x1000 (proporção 4:5 do carrossel), WebP, ~60-120 KB cada.
//
// Uso:  node scripts/optimize-izabel-fotos.mjs <pasta-com-originais>
// Nomes de entrada: mes-MM-N.jpg|jpeg|png|webp  (MM = mês 00..11, N = 1,2,3…)
//   ex.: mes-03-2.jpg  -> public/izabel/meses/mes-03-2.webp
// Depois ajuste as legendas em src/features/izabel/lib/story.ts (uma frase por foto).
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input) {
  console.error("Uso: node scripts/optimize-izabel-fotos.mjs <pasta-com-originais>");
  process.exit(1);
}

const out = path.resolve("public/izabel/meses");
await mkdir(out, { recursive: true });

const re = /^mes-(\d{2})-(\d+)\.(jpe?g|png|webp)$/i;
const counts = {};
let total = 0;

for (const file of (await readdir(input)).sort()) {
  const m = file.match(re);
  if (!m) {
    console.warn(`ignorado (nome fora do padrão mes-MM-N.ext): ${file}`);
    continue;
  }
  const dest = path.join(out, `mes-${m[1]}-${m[2]}.webp`);
  await sharp(path.join(input, file))
    .rotate() // respeita a orientação EXIF do celular
    .resize(800, 1000, { fit: "cover", position: "attention" })
    .webp({ quality: 72 })
    .toFile(dest);
  const kb = Math.round((await stat(dest)).size / 1024);
  total += kb;
  counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  console.log(`${file} -> ${path.basename(dest)} (${kb} KB)`);
}

console.log(`\nTotal: ${total} KB. Fotos por mês:`);
for (const [mes, n] of Object.entries(counts)) console.log(`  mês ${mes}: ${n}`);
