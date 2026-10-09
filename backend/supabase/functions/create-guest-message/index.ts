// create-guest-message: única porta de entrada do mural de recados.
// Valida e grava com a service role (anon não tem INSERT na tabela).
// Anti-abuso: tamanho, sem links, 1 recado a cada 20s por aparelho e no
// máximo 5 por aparelho por kiosk.
import { corsHeaders, json } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const MIN_INTERVAL_MS = 20_000;
const MAX_PER_DEVICE = 5;
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|me|ly|xyz)\b)/i;

// remove caracteres de controle e normaliza espaços
function clean(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const kioskId = String(body.kiosk_id ?? "");
  const deviceId = String(body.device_id ?? "");
  const author = clean(body.author, 40);
  const message = clean(body.message, 200);
  if (!kioskId || !deviceId || deviceId.length > 80) return json({ error: "bad_request" }, 400);
  if (message.length < 1) return json({ error: "empty_message" }, 400);
  if (LINK_RE.test(message) || LINK_RE.test(author)) return json({ error: "links_not_allowed" }, 400);

  const admin = supabaseAdmin();

  const { data: kiosk } = await admin
    .from("kiosk_settings")
    .select("kiosk_id")
    .eq("kiosk_id", kioskId)
    .maybeSingle();
  if (!kiosk) return json({ error: "unknown_kiosk" }, 400);

  const { data: mine, error: qErr } = await admin
    .from("guest_messages")
    .select("created_at")
    .eq("kiosk_id", kioskId)
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(MAX_PER_DEVICE);
  if (qErr) return json({ error: "query_failed", detail: qErr.message }, 500);

  if (mine && mine.length >= MAX_PER_DEVICE) return json({ error: "limit_reached" }, 429);
  if (mine && mine[0] && Date.now() - new Date(mine[0].created_at).getTime() < MIN_INTERVAL_MS) {
    return json({ error: "too_fast" }, 429);
  }

  const { data, error } = await admin
    .from("guest_messages")
    .insert({ kiosk_id: kioskId, device_id: deviceId, author, message })
    .select("id, kiosk_id, author, message, created_at")
    .single();
  if (error) return json({ error: "insert_failed", detail: error.message }, 500);

  return json({ message: data });
});
