// Salva a foto no celular: no iOS/Android abre a folha de compartilhar
// ("Salvar imagem"); onde não há suporte, baixa o arquivo.
export async function savePhoto(url: string, name = "izabel-1-aninho.png"): Promise<void> {
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], name, { type: blob.type || "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Izabel 1 aninho" });
      return;
    } catch (e) {
      // usuário fechou a folha de compartilhar: não é erro, não baixa de novo
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
