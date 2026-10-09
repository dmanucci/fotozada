import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useGuestMessages, usePostGuestMessage } from "./use-guest-messages";

const MAX = 200;
const NAME_KEY = "fotozada_izabel_author";
// pós-its em tons da paleta da festa
const NOTE_COLORS = ["#ffe3ee", "#efe3ff", "#fff3d6", "#e2f3ea", "#e3edff"];

// inclinação/cor estáveis por recado (derivadas do id, não de Math.random)
function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function MuralPage() {
  const kioskId = useMemo(
    () => new URLSearchParams(window.location.search).get("kiosk") ?? "izabel-1-aninho",
    [],
  );
  const { data: messages, isLoading, isError } = useGuestMessages(kioskId);
  const post = usePostGuestMessage(kioskId);
  const [author, setAuthor] = useState(loadName);
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    post.mutate(
      { author: author.trim(), message },
      {
        onSuccess: () => {
          setText("");
          try {
            localStorage.setItem(NAME_KEY, author.trim());
          } catch {
            // ignore
          }
          toast.success("Recado enviado! 💗");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div
      className="min-h-svh bg-[#fff5f7] bg-cover bg-fixed bg-center pb-16"
      style={{ backgroundImage: "url(/izabel/aquarela.webp)" }}
    >
      <div className="mx-auto w-full max-w-md px-5 pt-5">
        <Link
          to={`/izabel${window.location.search}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-[#6a3a64]"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar para a história
        </Link>

        <header className="mt-4 text-center">
          <img src="/izabel/borboleta-2.webp" alt="" className="mx-auto h-10" />
          <h1 className="font-[Nunito] text-3xl font-black text-[#6a3a64]">
            Mural da <span className="text-[#d63f86]">Izabel</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#8b5580]">
            Deixe um recadinho de carinho para o primeiro aninho.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="mt-5 space-y-3 rounded-3xl bg-white p-4 shadow-[0_6px_16px_-4px_rgba(139,85,128,0.35)]"
        >
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={40}
            placeholder="Seu nome (opcional)"
            className="w-full rounded-xl border-2 border-[#ef8fb0]/40 bg-[#fff9fb] px-3 py-2.5 text-sm font-semibold text-[#4a2545] outline-none placeholder:text-[#8b5580]/50 focus:border-[#d63f86]"
          />
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX}
              rows={3}
              placeholder="Escreva seu recado…"
              className="w-full resize-none rounded-xl border-2 border-[#ef8fb0]/40 bg-[#fff9fb] px-3 py-2.5 text-sm font-semibold text-[#4a2545] outline-none placeholder:text-[#8b5580]/50 focus:border-[#d63f86]"
            />
            <span className="absolute bottom-2 right-3 text-[11px] font-bold text-[#8b5580]/60">
              {text.length}/{MAX}
            </span>
          </div>
          <button
            type="submit"
            disabled={post.isPending || !text.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ef8fb0] px-6 py-3 font-extrabold text-white shadow-[3px_3px_0_#c9709a] disabled:opacity-50"
          >
            {post.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar recado
          </button>
        </form>

        <section className="mt-6" aria-live="polite">
          {isLoading && (
            <div className="flex justify-center py-8 text-[#8b5580]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {isError && (
            <p className="py-6 text-center text-sm font-semibold text-[#8b5580]">
              Não consegui carregar os recados agora. Tente atualizar a página.
            </p>
          )}
          {messages && messages.length === 0 && (
            <p className="py-6 text-center text-sm font-semibold text-[#8b5580]">
              Ainda não há recados. Seja a primeira pessoa a deixar um! 💗
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {messages?.map((m) => {
                const h = hash(m.id);
                const tilt = (h % 7) - 3;
                return (
                  <motion.article
                    key={m.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: -12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    style={{ background: NOTE_COLORS[h % NOTE_COLORS.length], rotate: tilt }}
                    className="break-words rounded-2xl p-3 shadow-[0_4px_10px_-3px_rgba(139,85,128,0.35)]"
                  >
                    <p className="text-sm font-semibold leading-snug text-[#4a2545]">{m.message}</p>
                    <p className="mt-2 text-xs font-extrabold text-[#d63f86]">
                      — {m.author || "Alguém especial"}
                    </p>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
