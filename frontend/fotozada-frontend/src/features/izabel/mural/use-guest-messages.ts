import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

export interface GuestMessage {
  id: string;
  author: string;
  message: string;
  created_at: string;
}

const ERRORS: Record<string, string> = {
  too_fast: "Calma! Espere alguns segundos para mandar outro recado.",
  limit_reached: "Você já deixou muitos recados por aqui. Obrigada! 💗",
  links_not_allowed: "Não dá para enviar links no mural.",
  empty_message: "Escreva um recadinho antes de enviar.",
};

// O supabase-js devolve o corpo do erro HTTP em error.context (um Response).
async function friendlyError(err: unknown): Promise<string> {
  try {
    const res = (err as { context?: Response }).context;
    const body = res ? await res.json() : null;
    if (body?.error && ERRORS[body.error]) return ERRORS[body.error];
  } catch {
    // corpo ilegível: cai na mensagem genérica
  }
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

export function useGuestMessages(kioskId: string) {
  return useQuery({
    queryKey: ["guest-messages", kioskId],
    // Consulta a VIEW pública (sem device_id). Atualiza sozinho a cada 10s,
    // só com a aba visível.
    queryFn: async (): Promise<GuestMessage[]> => {
      const { data, error } = await supabase
        .from("guest_messages_public")
        .select("id, author, message, created_at")
        .eq("kiosk_id", kioskId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });
}

export function usePostGuestMessage(kioskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { author: string; message: string }): Promise<GuestMessage> => {
      const { data, error } = await supabase.functions.invoke("create-guest-message", {
        body: { kiosk_id: kioskId, device_id: getDeviceId(), ...input },
      });
      if (error) throw new Error(await friendlyError(error));
      if (data?.error) throw new Error(ERRORS[data.error] ?? "Não foi possível enviar.");
      return data.message as GuestMessage;
    },
    // aparece na hora para quem enviou, sem esperar o próximo refresh
    onSuccess: (msg) => {
      qc.setQueryData<GuestMessage[]>(["guest-messages", kioskId], (old) => [msg, ...(old ?? [])]);
    },
  });
}
