// Salvar a foto no celular. No iOS/Android abre a folha de compartilhar
// (Salvar imagem); onde não há suporte (desktop), baixa o arquivo.
//
// O File é montado ANTES do clique (makePhotoFile) para o share() rodar
// direto no toque: o iPhone exige que seja chamado dentro do gesto do usuário,
// sem nenhum await no meio.
export function makePhotoFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type || "image/png" });
}

export async function savePhoto(file: File): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Izabel 1 aninho" });
      return;
    } catch (e) {
      // usuário fechou a folha de compartilhar: não é erro, não baixa de novo
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
