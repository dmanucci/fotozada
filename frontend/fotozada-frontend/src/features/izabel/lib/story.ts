// Linha do tempo da Izabel — um item por mês, de recém-nascida até 11 meses.
// O 12º mês (1 aninho) é a cena final, que usa a foto da fadinha.
//
// Para trocar as fotos de teste pelas reais: substitua os arquivos em
// public/izabel/meses/mes-XX.webp (mesmo nome) — não precisa mexer em código.
// Os textos abaixo também são editáveis aqui.

export interface StoryMonth {
  month: number;
  label: string; // título grande da cena
  caption: string; // frase curta embaixo da foto
  photo: string;
}

const CAPTIONS: Array<[string, string]> = [
  ["Recém-nascida", "Chegou a nossa fadinha."],
  ["1 mês", "Um mundo novo de colo e cheirinho."],
  ["2 meses", "Os primeiros sorrisos."],
  ["3 meses", "Descobrindo as mãozinhas."],
  ["4 meses", "Cada dia mais curiosa."],
  ["5 meses", "Gargalhadas de encher a casa."],
  ["6 meses", "Meio ano de pura alegria."],
  ["7 meses", "Sentadinha, olhando tudo."],
  ["8 meses", "Explorando cada cantinho."],
  ["9 meses", "Já quer ir mais longe."],
  ["10 meses", "Os primeiros passinhos de coragem."],
  ["11 meses", "Quase lá…"],
];

export const STORY_MONTHS: StoryMonth[] = CAPTIONS.map(([label, caption], month) => ({
  month,
  label,
  caption,
  photo: `/izabel/meses/mes-${String(month).padStart(2, "0")}.webp`,
}));

export const FINAL_LABEL = "1 aninho";
