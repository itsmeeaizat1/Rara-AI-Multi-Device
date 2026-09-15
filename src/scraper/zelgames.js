// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zelgames.js — scraper ZelAPI kategori /games (live verified 15 Sep 2026):
//   /games/maths — soal matematika random (mode extreme!) + correct_answer
//   /games/tebakpresiden — soal tebak presiden Indonesia + answer
//   /games/honesty?q=&answer= — honesty score (answer WAJIB: jujur|tidak jujur|ragu)
// 🔹 MATI/dup bot (gak dipasang): khodam/tekateki/trivia/tebaklirik/tebaksurah/ulartangga —
//   bot udah punya game-nya masing-masing.
// 🔹 Shape return game factory: { soal, jawaban, deskripsi? }
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 45000;

let _http = null;
export function _setZelGamesHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelGamesKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

export const ZEL_HONESTY_ANSWERS = ["jujur", "tidak jujur", "ragu"];

async function gameGet(path, params = {}) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  const p = new URLSearchParams({ ...params, apikey: key });
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try { return await fetch(u, { signal: ctrl.signal }); } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(`${BASE}/games/${path}?${p.toString()}`); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT — server game lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* bukan json */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status})` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) return { ok: false, error: `HTTP ${status}${data?.error ? " — " + data.error : ""}` };
  if (data?.status === false) return { ok: false, error: String(data?.error || data?.message || "endpoint game balik status false").slice(0, 250) };
  return { ok: true, data };
}

/** Soal matematika extreme — { soal, jawaban, deskripsi: mode } */
export async function zelMaths() {
  const r = await gameGet("maths");
  if (!r.ok) throw new Error(r.error);
  const res = r.data?.result || {};
  const soal = String(res.question || "").trim();
  const jawab = String(res.correct_answer ?? res.answer ?? "").trim();
  if (!soal || !jawab) throw new Error("soal kosong");
  const q = { soal, jawaban: jawab };
  if (res.mode) q.deskripsi = `Mode: ${res.mode} — jawab angka hasilnya`;
  return q;
}

/** Soal tebak presiden — { soal, jawaban } */
export async function zelPresiden() {
  const r = await gameGet("tebakpresiden");
  if (!r.ok) throw new Error(r.error);
  const soal = String(r.data?.question || "").trim();
  const jawaban = String(r.data?.answer || "").trim();
  if (!soal || !jawaban) throw new Error("soal kosong");
  return { soal, jawaban, deskripsi: "Tebak presiden Indonesia" };
}

/** Honesty score — q + answer (jujur|tidak jujur|ragu) → {question, user_answer, honesty_score, honesty_level, feedback} */
export async function zelHonesty(q, answer) {
  const question = String(q || "").trim();
  const ans = String(answer || "").toLowerCase().trim();
  if (!question) return { ok: false, error: "QUESTION_EMPTY — kirim pertanyaannya: .zhonesty <pertanyaan> | <jujur/tidak jujur/ragu>" };
  if (!ZEL_HONESTY_ANSWERS.includes(ans)) return { ok: false, error: `ANSWER_INVALID — jawaban cuma boleh: ${ZEL_HONESTY_ANSWERS.join(" / ")}` };
  const r = await gameGet("honesty", { q: question, answer: ans });
  if (!r.ok) return r;
  if (r.data?.honesty_score === undefined || r.data?.honesty_score === null) {
    return { ok: false, error: "Skor gak kehitung — coba lagi" };
  }
  return { ok: true, result: r.data };
}
