// Linha do tempo da Izabel — um item por mês, de recém-nascida até 11 meses.
// O 12º mês (1 aninho) é a cena final, que usa a foto da fadinha.
//
// Cada mês é um carrossel horizontal: uma frase por foto, e a frase muda
// quando a foto muda. Para editar, mexa só nas listas abaixo:
//   - quantidade de fotos do mês = quantidade de frases da lista;
//   - arquivos em public/izabel/meses/mes-MM-N.webp (MM = mês com 2 dígitos,
//     N = 1..quantidade). Troque as fotos de teste mantendo o nome.

export interface StoryPhoto {
  src: string;
  caption: string;
}

export interface StoryMonth {
  month: number;
  label: string; // título grande da cena
  photos: StoryPhoto[];
}

const MONTHS: Array<[string, string[]]> = [
  ["Recém-nascida", ["Chegou a nossa fadinha.", "Primeiro colinho."]],
  ["1 mês", ["Um mundo novo de colo e cheirinho.", "Dormindo gostoso.", "Olhinhos curiosos."]],
  ["2 meses", ["Os primeiros sorrisos.", "Conversando com a gente.", "Dengo o dia todo."]],
  ["3 meses", ["Descobrindo as mãozinhas.", "Bochechas de encher as mãos."]],
  ["4 meses", ["Cada dia mais curiosa.", "De barriguinha pra baixo.", "Olhar de quem entende tudo."]],
  ["5 meses", ["Gargalhadas de encher a casa.", "Primeiras papinhas.", "Hora do banho, hora da festa."]],
  ["6 meses", ["Meio ano de pura alegria.", "Seis meses e muito amor."]],
  ["7 meses", ["Sentadinha, olhando tudo.", "Brincando sozinha.", "Colo é sempre o melhor lugar."]],
  ["8 meses", ["Explorando cada cantinho.", "Engatinhando por aí.", "Sempre de sorriso aberto."]],
  ["9 meses", ["Já quer ir mais longe.", "Em pé, com apoio."]],
  ["10 meses", ["Os primeiros passinhos de coragem.", "Aplaudindo as próprias conquistas.", "Cheia de energia."]],
  ["11 meses", ["Quase lá…", "Preparando a festa.", "Faltando pouquinho pra um aninho."]],
];

export const STORY_MONTHS: StoryMonth[] = MONTHS.map(([label, captions], month) => ({
  month,
  label,
  photos: captions.map((caption, i) => ({
    src: `/izabel/meses/mes-${String(month).padStart(2, "0")}-${i + 1}.webp`,
    caption,
  })),
}));

export const FINAL_LABEL = "1 aninho";
