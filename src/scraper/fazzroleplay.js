// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// fazzroleplay.js — fazzcode.eu.cc chatbot-role wrapper
// API roleplay AI: list karakter + create (mulai sesi, persona custom)
// + chat (lanjut obrolan). API STATELESS (gak inget konteks antar request)
// → konteks disimpan lokal per-user di plugin & di-inject ringkas ke query.
// Live verified 14 Sep 2026: 17 karakter (Sakura, Gojo Satoru, Anya, dll).
// UPDATE 14 Sep 2026 (sore): fazzcode ganti format auth — GET + ?api_key= udah
// GAK BERLAKU (401 misleading "MISSING_API_KEY" padahal key terkirim), sekarang
// WAJIB POST + header "Authorization: Bearer <key>" + body JSON + path tanpa
// prefix /api (/ai/chatbot-role). Key lama TETEP VALID (bukan expired).
// ═════════════════════════════════════════════

import axios from "axios";
import { getFazzcodeKey } from "../lib/config/env-loader.js";

const BASE = "https://api.fazzcode.eu.cc/ai/chatbot-role";

// ── seam untuk e2e (injek http mock tanpa nembak API live)
let _http = axios;
export function _setFazzRoleHttpForTest(fake) { _http = fake; }
export function _resetFazzRoleHttpForTest() { _http = axios; }

// cache daftar karakter 1 jam
let _charCache = { at: 0, data: null };

/**
 * Ambil daftar karakter roleplay.
 * @returns {Promise<{ok:boolean, characters?:Array<{name:string,preview:string}>, error?:string}>}
 */
export async function listRoleplayCharacters() {
  const now = Date.now();
  if (_charCache.data && now - _charCache.at < 60 * 60 * 1000) {
    return { ok: true, characters: _charCache.data };
  }
  const key = getFazzcodeKey();
  if (!key) return { ok: false, error: "API_KEY" };
  try {
    const res = await _http.post(BASE, { action: "list" }, {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 20000,
    });
    const d = res.data;
    if (d?.status !== true || !Array.isArray(d.characters)) {
      return { ok: false, error: d?.message || "RESPON_INVALID" };
    }
    _charCache = { at: now, data: d.characters };
    return { ok: true, characters: d.characters };
  } catch (e) {
    return { ok: false, error: e.response?.data?.message || e.message || "NETWORK" };
  }
}

/**
 * Kirim pesan ke chatbot-role.
 * @param {"create"|"chat"} action
 * @param {object} params { character, query, name?, prompt? }
 * @returns {Promise<{ok:boolean, reply?:string, error?:string}>}
 */
export async function callRoleplay(action, params) {
  const key = getFazzcodeKey();
  if (!key) return { ok: false, error: "API_KEY" };
  try {
    const res = await _http.post(BASE, { action, ...params }, {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 60000,
    });
    const d = res.data;
    if (d?.status !== true || typeof d.reply !== "string") {
      return { ok: false, error: d?.message || "RESPON_INVALID" };
    }
    return { ok: true, reply: d.reply };
  } catch (e) {
    return { ok: false, error: e.response?.data?.message || e.message || "NETWORK" };
  }
}
