#!/usr/bin/env python3
"""
worker.py — Print queue worker para Raspberry Pi
Supabase Realtime → download Storage → CUPS → aguarda impressão real → atualiza status

Diferencial: um job por vez, com polling de lpstat para garantir que o job
saiu da impressora antes de pegar o próximo. Nunca marca "done" enquanto o
papel ainda está no buffer da impressora.
"""

from __future__ import annotations

import os
import re
import asyncio
import logging
import subprocess
import tempfile
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from supabase import create_async_client, AsyncClient

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL    = os.environ["SUPABASE_URL"]
SUPABASE_KEY    = os.environ["SUPABASE_KEY"]
PRINTER_NAME    = os.environ.get("PRINTER_NAME", "DNP_RX1")
STORAGE_BUCKET  = os.environ.get("STORAGE_BUCKET", "prints")
MAX_RETRIES     = int(os.environ.get("MAX_RETRIES", "3"))
RETRY_DELAY     = int(os.environ.get("RETRY_DELAY", "5"))
SIGNED_URL_TTL  = 300   # segundos
CUPS_POLL_INTERVAL    = float(os.environ.get("CUPS_POLL_INTERVAL", "1"))    # s entre polls
CUPS_TIMEOUT          = float(os.environ.get("CUPS_TIMEOUT", "300"))        # 5 min max
# Tempo fixo aguardado após o job sair do CUPS antes de pegar o próximo.
# Cobre o caso em que lpstat -p não retorna "idle" (varia por driver/locale).
# DNP RX1 ~65s por 10x15. Ajuste com PRINT_COMPLETE_DELAY no .env.
PRINT_COMPLETE_DELAY  = float(os.environ.get("PRINT_COMPLETE_DELAY", "30"))  # segundos

# Rede de segurança do Realtime: se o websocket cair sem avisar, é este poll
# que acha o job. Antes era 30s fixos (= até 30s de atraso extra); 5s custa
# uma query leve e limita o pior caso.
POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL", "5"))

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("worker")
# O cliente HTTP loga cada requisição em INFO; com o poll de backup a cada 5s
# isso viraria ~17 mil linhas/dia no cartão SD e esconderia o log útil.
logging.getLogger("httpx").setLevel(logging.WARNING)

# ── Estado global ─────────────────────────────────────────────────────────────

supabase: AsyncClient = None
job_queue: asyncio.Queue = asyncio.Queue()
# ids já na fila (ou em processamento): evita enfileirar o mesmo job de novo
# a cada poll enquanto ele ainda está esperando a vez.
enqueued_ids: set = set()

# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def enqueue(job: dict) -> bool:
    """Põe o job na fila uma única vez. Retorna False se já estava."""
    job_id = job.get("id")
    if not job_id or job_id in enqueued_ids:
        return False
    enqueued_ids.add(job_id)
    job_queue.put_nowait(job)
    return True


def seconds_since(iso: str | None) -> float | None:
    """Segundos desde um timestamp ISO do banco (None se ausente/ilegível)."""
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds()
    except ValueError:
        return None


async def get_signed_url(composed_path: str) -> str:
    res = await supabase.storage.from_(STORAGE_BUCKET).create_signed_url(
        composed_path, SIGNED_URL_TTL
    )
    url = res.get("signedURL") or res.get("signed_url")
    if not url:
        raise RuntimeError(f"Falha ao gerar URL assinada: {composed_path}")
    return url


def download_file(url: str, dest: str) -> None:
    with urllib.request.urlopen(url, timeout=30) as response:
        with open(dest, "wb") as f:
            f.write(response.read())
    size_kb = Path(dest).stat().st_size // 1024
    log.info(f"  Download: {size_kb} KB → {dest}")


LAYOUT_PAGE_SIZE = {
    "single_10x15":   "w288h432",
    "strip_3":         "w288h432-div2",   # já vem como folha 10x15 completa (2 tiras)
    "single_10x15_v":  "w288h432",
    "single_10x15_h":  "w288h432",
}


def submit_to_cups(file_path: str, copies: int, layout: str) -> int:
    """
    Envia o arquivo ao CUPS e retorna o CUPS job ID.
    Não espera a impressão — use wait_for_cups_job() para isso.
    """
    page_size = LAYOUT_PAGE_SIZE.get(layout)
    if not page_size:
        raise RuntimeError(f"Layout desconhecido: '{layout}'")

    cmd = [
        "lp",
        "-d", PRINTER_NAME,
        "-n", str(copies),
        "-o", f"PageSize={page_size}",
        "-o", "fit-to-page",
    ]
    if layout == "single_10x15_h":
        # w288h432 é sempre retrato (4x6"); a imagem enviada é paisagem
        # (1800x1200) — sem avisar o CUPS, ele encaixa a imagem no retângulo
        # retrato sem girar, sobrando margem embaixo/direita em vez de cobrir
        # a folha inteira.
        cmd += ["-o", "landscape", "-o", "orientation-requested=4"]
    cmd.append(file_path)
    log.info(f"  Layout: {layout} → PageSize={page_size}, cópias={copies}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"CUPS erro: {result.stderr.strip()}")

    # lp imprime o job ID no formato "IMPRESSORA-123" — busca pelo padrão
    # diretamente, ignorando o texto ao redor (que varia conforme o locale).
    match = re.search(re.escape(PRINTER_NAME) + r"-(\d+)", result.stdout)
    if not match:
        raise RuntimeError(f"Não foi possível ler CUPS job ID: {result.stdout.strip()!r}")

    cups_job_id = int(match.group(1))
    log.info(f"  CUPS job ID: {cups_job_id}")
    return cups_job_id


def _cups_job_state(cups_job_id: int) -> str:
    """
    Retorna o estado do job no CUPS:
      'done'       — job não está mais na fila ativa (imprimiu ou foi cancelado)
      'processing' — imprimindo normalmente
      'pending'    — na fila, aguardando
      'stopped'    — erro na impressora (papel, tampa, etc.)
    """
    result = subprocess.run(
        ["lpstat", "-l", "-o", PRINTER_NAME],
        capture_output=True, text=True,
    )
    target = f"{PRINTER_NAME}-{cups_job_id}"

    if target not in result.stdout:
        return "done"

    low = result.stdout.lower()
    if "stopped" in low or "parado" in low or "erro" in low or "error" in low:
        return "stopped"
    if "retido" in low or "held" in low:
        return "held"
    if "processing" in low or "processando" in low:
        return "processing"
    return "pending"



async def wait_for_cups_job(cups_job_id: int) -> tuple[float, float]:
    """
    Fase 1 — aguarda o job sumir da fila do CUPS (dados enviados ao hardware).
    Fase 2 — aguarda impressora idle OU PRINT_COMPLETE_DELAY segundos,
              o que vier primeiro. Fallback garante avanço mesmo se lpstat -p
              não retornar palavra reconhecida no locale do sistema.
    """
    phase_start = time.monotonic()
    deadline = phase_start + CUPS_TIMEOUT
    loop = asyncio.get_running_loop()

    # ── Fase 1: job na fila do CUPS ──────────────────────────────────────────
    while time.monotonic() < deadline:
        state = await loop.run_in_executor(None, _cups_job_state, cups_job_id)
        if state == "done":
            log.info(f"  CUPS job {cups_job_id} entregue à impressora.")
            break
        if state == "stopped":
            raise RuntimeError(
                f"CUPS job {cups_job_id} parou com erro. "
                "Verifique papel/impressora: lpstat -l -o " + PRINTER_NAME
            )
        if state == "held":
            raise RuntimeError(
                f"CUPS job {cups_job_id} retido (fila pausada). "
                "Execute: cupsenable " + PRINTER_NAME + " && cupsaccept " + PRINTER_NAME
            )
        log.info(f"  Aguardando CUPS job {cups_job_id} ({state})…")
        await asyncio.sleep(CUPS_POLL_INTERVAL)
    else:
        raise RuntimeError(f"Timeout ({CUPS_TIMEOUT}s) aguardando CUPS job {cups_job_id}")

    cups_seconds = time.monotonic() - phase_start

    # ── Fase 2: aguarda hardware terminar ────────────────────────────────────
    # A DNP aceita os dados no buffer interno e imediatamente reporta "inativa"
    # para o CUPS, mas o papel ainda está sendo processado. Não há como detectar
    # o fim físico via lpstat — usamos delay fixo baseado no tempo da impressora.
    log.info(f"  Aguardando impressão física ({PRINT_COMPLETE_DELAY:.0f}s)…")
    await asyncio.sleep(PRINT_COMPLETE_DELAY)
    log.info("  Impressão concluída.")
    return cups_seconds, PRINT_COMPLETE_DELAY


async def update_job(job_id: str, **fields) -> None:
    fields["updated_at"] = now_iso()
    await supabase.table("print_jobs").update(fields).eq("id", job_id).execute()


# ── Processamento de um job ───────────────────────────────────────────────────

async def process_job(job: dict) -> None:
    job_id        = job.get("id")
    composed_path = job.get("composed_path")
    layout        = job.get("layout", "single_10x15")
    copies        = max(1, job.get("copies") or 1)

    # Re-verifica no banco antes de processar (evita duplicatas entre Realtime e polling)
    check = await supabase.table("print_jobs").select("status").eq("id", job_id).execute()
    current_status = check.data[0].get("status") if check.data else None
    if current_status != "queued":
        log.info(f"  Job {job_id} já está '{current_status}', ignorando.")
        return

    # Atraso entre o job ser criado no banco (o cliente já terminou o upload)
    # e o worker começar a tratá-lo: soma espera na fila + falha do Realtime.
    pickup_lag = seconds_since(job.get("created_at"))
    log.info(f"── Job {job_id}")
    if pickup_lag is not None:
        log.info(f"  pickup_lag    : {pickup_lag:.1f}s (criado no banco → worker)")
    log.info(f"  composed_path : {composed_path}")
    log.info(f"  layout        : {layout}")
    log.info(f"  copies        : {copies}")

    if not composed_path:
        log.error("  Sem composed_path, abortando.")
        await update_job(job_id, status="error", error="composed_path ausente")
        return

    # Atualiza status + gera URL assinada em paralelo
    t_prep = time.monotonic()
    _, url = await asyncio.gather(
        update_job(job_id, status="printing", printing_at=now_iso()),
        get_signed_url(composed_path),
    )
    prep_s = time.monotonic() - t_prep

    tmp_path = None
    start    = time.monotonic()

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            suffix = Path(composed_path).suffix or ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp_path = tmp.name

            log.info(f"  Tentativa {attempt}/{MAX_RETRIES}")

            if attempt > 1:
                url = await get_signed_url(composed_path)

            loop = asyncio.get_running_loop()

            # 1. Download
            t0 = time.monotonic()
            await loop.run_in_executor(None, download_file, url, tmp_path)
            download_s = time.monotonic() - t0

            # 2. Envia ao CUPS — retorna job ID imediatamente
            t0 = time.monotonic()
            cups_job_id = await loop.run_in_executor(
                None, submit_to_cups, tmp_path, copies, layout
            )
            lp_s = time.monotonic() - t0

            # 3. Espera o papel sair — só depois marca como done
            cups_s, hw_delay_s = await wait_for_cups_job(cups_job_id)

            elapsed_ms = int((time.monotonic() - start) * 1000)
            log.info(
                "  ⏱  "
                + (f"lag={pickup_lag:.1f}s " if pickup_lag is not None else "")
                + f"prep={prep_s:.1f}s download={download_s:.1f}s lp={lp_s:.1f}s "
                f"cups_fila={cups_s:.1f}s espera_fixa={hw_delay_s:.0f}s "
                f"total={elapsed_ms / 1000:.1f}s"
            )
            await update_job(
                job_id,
                status="done",
                printed_at=now_iso(),
                print_ms=elapsed_ms,
            )
            log.info(f"  ✓ Concluído em {elapsed_ms}ms\n")
            return

        except Exception as e:
            log.warning(f"  Tentativa {attempt} falhou: {e}")
            if attempt < MAX_RETRIES:
                log.info(f"  Aguardando {RETRY_DELAY}s…")
                await asyncio.sleep(RETRY_DELAY)
            else:
                await update_job(job_id, status="error", error=str(e)[:500])
                log.error(f"  ✗ Falhou após {MAX_RETRIES} tentativas.\n")

        finally:
            if tmp_path and Path(tmp_path).exists():
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
                tmp_path = None


# ── Polling de backup ─────────────────────────────────────────────────────────

async def poll_queued_jobs() -> None:
    """Verifica jobs queued a cada POLL_INTERVAL s como fallback do Realtime."""
    while True:
        await asyncio.sleep(POLL_INTERVAL)
        try:
            res = await (
                supabase.table("print_jobs")
                .select("*")
                .eq("status", "queued")
                .order("created_at")
                .execute()
            )
            # só loga quando o poll achou algo que o Realtime NÃO entregou
            novos = [job for job in (res.data or []) if enqueue(job)]
            if novos:
                log.info(f"Polling: {len(novos)} job(s) novo(s) (Realtime não avisou)")
        except Exception as e:
            log.warning(f"Polling falhou: {e}")


# ── Worker loop ───────────────────────────────────────────────────────────────

async def worker_loop() -> None:
    """Consome um job por vez — garante que a impressora só recebe um job de cada vez."""
    log.info("Worker iniciado.\n")
    while True:
        job = await job_queue.get()
        try:
            await process_job(job)
        except Exception as e:
            log.exception(f"Erro inesperado no job {job.get('id')}: {e}")
        finally:
            enqueued_ids.discard(job.get("id"))
            job_queue.task_done()


# ── Boot: jobs pendentes ──────────────────────────────────────────────────────

async def enqueue_pending_jobs() -> None:
    log.info("Verificando jobs pendentes…")
    res = await (
        supabase.table("print_jobs")
        .select("*")
        .in_("status", ["queued", "printing"])
        .order("created_at")
        .execute()
    )
    if not res.data:
        log.info("Nenhum job pendente.\n")
        return
    log.info(f"{len(res.data)} job(s) pendente(s), enfileirando…\n")
    for job in res.data:
        # Jobs "printing" podem ter ficado presos — retorna para queued para reprocessar
        if job.get("status") == "printing":
            await update_job(job["id"], status="queued")
            job["status"] = "queued"
        enqueue(job)


# ── Realtime callback ─────────────────────────────────────────────────────────

def on_new_job(payload: dict) -> None:
    job = payload.get("record") or payload.get("new") or {}
    if not job.get("id"):
        return
    if enqueue(job):
        log.info(f"Novo job recebido via Realtime: {job['id']}")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    global supabase

    log.info("=" * 48)
    log.info("  Print Worker")
    log.info(f"  Impressora      : {PRINTER_NAME}")
    log.info(f"  Bucket          : {STORAGE_BUCKET}")
    log.info(f"  Retries         : {MAX_RETRIES} (intervalo {RETRY_DELAY}s)")
    log.info(f"  CUPS poll       : {CUPS_POLL_INTERVAL}s  timeout {CUPS_TIMEOUT}s")
    log.info(f"  Poll de backup  : {POLL_INTERVAL}s")
    log.info(f"  Espera fixa     : {PRINT_COMPLETE_DELAY:.0f}s por job")
    log.info("=" * 48 + "\n")

    supabase = await create_async_client(SUPABASE_URL, SUPABASE_KEY)

    asyncio.create_task(worker_loop())
    asyncio.create_task(poll_queued_jobs())
    await enqueue_pending_jobs()

    log.info("Conectando ao Realtime…")
    await supabase.realtime.connect()

    channel = supabase.channel("print-queue")
    channel.on_postgres_changes(
        event="INSERT",
        schema="public",
        table="print_jobs",
        callback=on_new_job,
    )

    def on_subscribe(status, err=None):
        if err:
            log.error(f"Realtime erro: {err}")
        else:
            log.info(f"Realtime: {status}")

    await channel.subscribe(on_subscribe)

    log.info("Pronto! Aguardando novos jobs…\n")
    await asyncio.sleep(float("inf"))


if __name__ == "__main__":
    asyncio.run(main())