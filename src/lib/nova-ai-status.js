// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai-status.js — STATUS LOADING ALA AGENT untuk AI SATUAN
// (request owner 29 Sep 2026: "aku mau ai satuan atau ai lain jga buat
// animasi kyk ai agent biar ketauan dia lg ngapain" + "jd nanti ketauan
// klo dia lg mikir ada animasi: Thinking...").
//
// POLA (sama kayak .novaagent/.aisuperagent — cukup 1 chat di layar):
//   1. reaksi 🧠 di pesan user
//   2. KIRIM 1 pesan status "🧠 Thinking..." (smallcaps)
//   3. status di-EDIT berputar (Thinking → Searching [opsional] → Composing)
//   4. jawaban final di-EDIT ke pesan status yang sama (chunk sisanya
//      dikirim chat terusan biar teks panjang tetep UTUH)
//   5. fallback m.reply kalau edit gagal — JANGAN SENYAP
//   6. reaksi 🐣 sukses / ❌ gagal
//
// Dipakai plugin AI satuan (aichat, aibrowse, aianalyze, dll). Label Inggris
// profesional (owner 29 Sep: 🧠 Thinking... / 🔍 Searching... / 🛠️ Action...).

import { smallcapsText } from "./styler.js";
import { splitChatChunks } from "./aiagent.js";

// fase default — AI chat biasa: mikir → nyusun. AI yang browsing
// bisa nambah "🔍 Searching..." di tengah (opts.phases).
const DEFAULT_PHASES = ["🧠 Thinking...", "✍️ Composing..."];
const PHASE_INTERVAL_MS = 8000;

// 🔹 factory: mulai status loading AI satuan.
// opts: { phases?: string[], intervalMs?: number, react?: boolean }
// return { setStatus, finish, fail, stop }
export async function startAiStatus(sock, m, opts = {}) {
  const phases = (Array.isArray(opts.phases) && opts.phases.length ? opts.phases : DEFAULT_PHASES)
    .map((p) => (/^[^a-zA-Z]/.test(p) ? p : smallcapsText(p))); // pastikan smallcaps kalau belum
  const intervalMs = opts.intervalMs || PHASE_INTERVAL_MS;

  let statusKey = null;
  let stopped = false;
  let idx = 0;
  let timer = null;

  const setStatus = async (text) => {
    try {
      if (!statusKey) {
        const sent = await sock.sendMessage(m.chat, { text });
        statusKey = sent?.key || null;
        return;
      }
      await sock.sendMessage(m.chat, { text, edit: statusKey });
    } catch {}
  };

  // reaksi 🧠 + pesan status pertama + rotasi
  if (opts.react !== false) {
    try { await sock.sendMessage(m.chat, { react: { text: "🧠", key: m.key } }); } catch {}
  }
  await setStatus(phases[0]);
  timer = setInterval(async () => {
    if (stopped) return;
    idx += 1;
    if (idx >= phases.length) { stopTimer(); return; }
    try { await setStatus(phases[idx]); } catch {}
  }, intervalMs);

  const stopTimer = () => { stopped = true; if (timer) { clearInterval(timer); timer = null; } };

  // jawaban final: EDIT pesan status → chunk 1, sisanya chat terusan.
  // fallback: m.reply. return true kalau sampai ke user (bukan senyap).
  const finish = async (text, extraOpts = {}) => {
    stopTimer();
    const t = typeof text === "string" ? text : String(text ?? "");
    if (!t.trim()) return false;
    const parts = splitChatChunks(t);
    if (!parts.length) return false;
    let delivered = false;
    if (statusKey) { try { await sock.sendMessage(m.chat, { text: parts[0], edit: statusKey }); delivered = true; } catch {} }
    if (!delivered) { try { await m.reply(parts[0]); delivered = true; } catch {} }
    for (let i = 1; delivered && i < parts.length; i++) {
      try { await sock.sendMessage(m.chat, { text: parts[i] }, { quoted: m }); } catch { break; }
    }
    if (extraOpts.react !== false) { try { await sock.sendMessage(m.chat, { react: { text: "🐣", key: m.key } }); } catch {} }
    return delivered;
  };

  // gagal: status di-EDIT jadi pesan error jelas (bukan senyap) + reaksi ❌
  const fail = async (msg) => {
    stopTimer();
    const t = "❌ " + smallcapsText(String(msg || "AI gagal merespons — coba lagi ya"));
    let delivered = false;
    if (statusKey) { try { await sock.sendMessage(m.chat, { text: t, edit: statusKey }); delivered = true; } catch {} }
    if (!delivered) { try { await m.reply(t); } catch {} }
    try { await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } }); } catch {}
  };

  return { setStatus, finish, fail, stop: stopTimer };
}
