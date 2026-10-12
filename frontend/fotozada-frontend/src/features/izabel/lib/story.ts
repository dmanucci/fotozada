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
  ["Recém-nascida", ["Chegou a nossa fadinha.", "Primeiros instantes.", "No colo, bem quentinho.", "Laço rosa e olhar atento."]],
  ["1 mês", ["Dormindo gostoso.", "Já cheia de charme.", "Soninho de anjo.", "Carinha de quem sonha.", "Olhar curioso."]],
  ["2 meses", ["Sorriso de derreter.", "De olho em tudo.", "Carinha de soninho.", "Pronta para o jogo.", "Meu 1º Natal."]],
  ["3 meses", ["Abelhinha de 3 meses.", "Rindo à toa.", "Deitadinha, sorrindo.", "Mãozinha na boca.", "Feliz com o brinquedinho."]],
  ["4 meses", ["Gargalhada de lado.", "Pandinha de 4 meses.", "De olho grande na câmera.", "Firme de barriguinha para baixo.", "Abraçada com a pelúcia.", "Olhão e chupeta."]],
  ["5 meses", ["Luzinhas e muito colo.", "Charme de laço vermelho.", "Nariz com nariz.", "Raio de sol no rosto.", "Boquinha aberta de surpresa."]],
  ["6 meses", ["Sol, colo e sorriso.", "Hora do mordedor.", "Rodeada de carinho.", "No colo, no banco do motorista.", "Sentadinha e sorrindo."]],
  ["7 meses", ["Sentadinha, olhando tudo.", "Brincando sozinha.", "Colo é sempre o melhor lugar."]],
  ["8 meses", ["Sorriso de laço e muito colo.", "Colo de vó, sorriso largo.", "Mamadeira e soninho.", "Primeira voltinha de bicicleta.", "Sorriso com chupeta.", "Passeio com o vovô.", "Carrinho e olhos de quem observa.", "Banho de piscininha."]],
  ["9 meses", ["Passeio e sorriso de dois dentinhos.", "Primeiro churrasquinho.", "Careta de língua para fora.", "De pé, de olho nos bichinhos.", "Olhão e naninha na boca.", "Torcendo de camisa 10.", "Sentadinha, de olho em tudo."]],
  ["10 meses", ["Aplaudindo as próprias conquistas.", "Língua para fora e muito charme.", "Tchauzinho de vestido vermelho.", "De pé no berço, sorrisão.", "Espiando por cima do berço.", "Olhar sério de quem observa tudo."]],
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
