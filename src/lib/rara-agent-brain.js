// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// rara-agent-brain — OTAK AI AGENT: 9ROUTER LOKAL DULU (3 Okt 2026)
// Request owner: "biar seperti ai agent beneran, ganti dari qwen di
// endpoint min1ai, migrasi ke 9router lokal beneran".
//
// MASALAH: rantai aiChainChat menaruh Min1AI qwen3-8b (model 8B gratisan)
// di posisi PERTAMA sejak permintaan 11 Sep. Untuk agent yang harus
// merencanakan, memilih tool, menulis kode, dan menyusun argumen JSON,
// model sekecil itu adalah leher botol kecerdasan.
//
// SEKARANG: brainChat() dipakai sebagai otak agent.
//   1. 9Router LOKAL (127.0.0.1 saja — aturan owner 25 Sep: DILARANG
//      nyambung ke 9RouterV2/endpoint orang lain) — ratusan model.
//   2. Kalau 9router tidak tersedia → rantai lama aiChainChat (Min1AI dst.)
//      sebagai CADANGAN, supaya agent tidak mati total kalau 9router down.
//
// PENGAMAN:
//   • CIRCUIT BREAKER: 3 gagal beruntun → 9router dilewati 5 menit (tanpa ini
//     tiap pesan menunggu spawn/timeout hingga 30 detik saat 9router mati).
//   • Health-check CEPAT (router9IsUp, cache 3 dtk) SEBELUM memanggil; agent
//     tidak memicu spawn 30 detik di jalur pesan.
//   • Saklar: env AGENT_BRAIN = "9router" (default) | "chain" (perilaku lama)
//             | "9router-only" (tanpa cadangan, error jujur).
//   • Model: env AGENT_BRAIN_MODEL, atau setBrainModel() runtime, default
//     ROUTER9_DEFAULT_MODEL.
//   • Status JUJUR: getBrainStatus() melaporkan otak terakhir yang menjawab.
// ============================================================

import { aiChainChat } from "./rara-ai-fallback.js";
import { router9Chat, router9IsUp, ROUTER9_DEFAULT_MODEL } from "./rara-9router-local.js";

const FAIL_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;
const ROUTER_TIMEOUT_MS = 90000;

const _st = {
  fails: 0,
  openUntil: 0,          // circuit breaker terbuka sampai timestamp ini
  model: null,           // override runtime
  last: { brain: null, model: null, at: 0, ms: null, error: null },
  counts: { router9: 0, chain: 0, skipped: 0 },
};

// ── seam e2e ──
let _routerChatForTest, _chainChatForTest, _isUpForTest, _nowForTest;
export function _setBrainDepsForTest({ routerChat, chainChat, isUp, now } = {}) {
  if (routerChat) _routerChatForTest = routerChat;
  if (chainChat) _chainChatForTest = chainChat;
  if (isUp) _isUpForTest = isUp;
  if (now) _nowForTest = now;
}
export function _resetBrainForTest() {
  _routerChatForTest = _chainChatForTest = _isUpForTest = _nowForTest = undefined;
  _st.fails = 0; _st.openUntil = 0; _st.model = null;
  _st.last = { brain: null, model: null, at: 0, ms: null, error: null };
  _st.counts = { router9: 0, chain: 0, skipped: 0 };
}
const now = () => (_nowForTest ? _nowForTest() : Date.now());

export function getBrainMode() {
  const v = String(process.env.AGENT_BRAIN || "9router").toLowerCase().trim();
  return ["chain", "9router-only"].includes(v) ? v : "9router";
}
export function getBrainModel() {
  return _st.model || process.env.AGENT_BRAIN_MODEL || ROUTER9_DEFAULT_MODEL;
}
export function setBrainModel(id) { _st.model = id ? String(id).trim() : null; }

export function getBrainStatus() {
  const t = now();
  return {
    mode: getBrainMode(),
    model: getBrainModel(),
    breakerOpen: _st.openUntil > t,
    breakerRemainingSec: Math.max(0, Math.ceil((_st.openUntil - t) / 1000)),
    consecutiveFails: _st.fails,
    last: { ..._st.last },
    counts: { ..._st.counts },
  };
}

function recordFail(err) {
  _st.fails++;
  _st.last.error = String(err?.message || err).slice(0, 200);
  if (_st.fails >= FAIL_THRESHOLD) _st.openUntil = now() + COOLDOWN_MS;
}
function recordOk() { _st.fails = 0; _st.openUntil = 0; }

async function viaRouter9(prompt, opts) {
  const up = _isUpForTest ? await _isUpForTest() : await router9IsUp();
  if (!up) throw new Error("9router lokal belum jalan");
  const model = opts.model9 || getBrainModel();
  const call = _routerChatForTest || router9Chat;
  const t0 = now();
  const r = await call({
    model,
    user: prompt,
    system: opts.systemPrompt || undefined,
    maxTokens: opts.maxTokens || 4096,
    temperature: opts.temperature ?? 0.4, // agent butuh JSON/tool call konsisten, bukan kreatif
    timeoutMs: opts.timeoutMs || ROUTER_TIMEOUT_MS,
  });
  const text = String(r?.text || "").trim();
  if (!text) throw new Error("9router balas kosong");
  _st.last = { brain: "9router", model: r.model || model, at: now(), ms: now() - t0, error: null };
  _st.counts.router9++;
  return text;
}

/**
 * Otak agent. Signature kompatibel dengan aiChainChat (prompt, opts) sehingga
 * bisa dipasang di mana pun aiChainChat dipakai sebagai `aiChat`.
 * opts: systemPrompt, timeoutMs, maxTokens, temperature, model9 (override model),
 *       plus semua opsi aiChainChat (diteruskan ke cadangan).
 */
export async function brainChat(prompt, opts = {}) {
  const mode = getBrainMode();
  const chain = _chainChatForTest || aiChainChat;

  if (mode === "chain") {
    const t0 = now();
    const out = await chain(prompt, opts);
    _st.last = { brain: "chain", model: "aiChainChat", at: now(), ms: now() - t0, error: null };
    _st.counts.chain++;
    return out;
  }

  const breakerOpen = _st.openUntil > now();
  if (!breakerOpen) {
    try {
      const out = await viaRouter9(prompt, opts);
      recordOk();
      return out;
    } catch (e) {
      recordFail(e);
      if (mode === "9router-only") throw new Error(`9router gagal: ${e.message}`);
      // lanjut ke cadangan di bawah
    }
  } else {
    _st.counts.skipped++;
    if (mode === "9router-only") {
      throw new Error(`9router sedang dilewati (gagal beruntun) — coba lagi dalam ${Math.ceil((_st.openUntil - now()) / 1000)} detik`);
    }
  }

  const t0 = now();
  const out = await chain(prompt, opts);
  _st.last = { ..._st.last, brain: "chain", model: "aiChainChat (cadangan)", at: now(), ms: now() - t0 };
  _st.counts.chain++;
  return out;
}
