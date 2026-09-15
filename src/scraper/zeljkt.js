// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 zeljkt.js — scraper ZelAPI kategori jktai + jkt48
// 🔹 STRICT SATUAN: key kosong / 401 / 429 / status:false → error ASLI,
//   gak nyolong fallback rantai AI lain (aturan owner).
// ═════════════════════════════════════════════

import { getZelKey } from "../lib/config/env-loader.js";

const BASE = "https://zelapi.eu.cc";
const TIMEOUT_MS = 60000;

// ── seams http/key buat e2e offline ──
let _http = null;
export function _setZelJktHttpForTest(fn) { _http = fn; }
let _keyForTest;
export function _setZelJktKeyForTest(k) { _keyForTest = k; }
function getKey() { return _keyForTest !== undefined ? _keyForTest : getZelKey(); }

// ── REGISTRY ──
// 18 member AI persona JKT48 (docs zelapi.eu.cc/docs/jktai — /jktai/<slug>?text=&apikey=)
export const ZEL_JKTAI_MEMBERS = [
  { slug: "anindya", name: "Anin" },
  { slug: "aralie", name: "Aralie" },
  { slug: "cathy", name: "Cathy" },
  { slug: "christy", name: "Christy" },
  { slug: "delynn", name: "Delynn" },
  { slug: "ella", name: "Ella" },
  { slug: "erine", name: "Erine" },
  { slug: "freya", name: "Freya" },
  { slug: "fritzy", name: "Fritzy" },
  { slug: "greesel", name: "Greesel" },
  { slug: "kimmy", name: "Kimmy" },
  { slug: "lily", name: "Lily" },
  { slug: "maira", name: "Maira" },
  { slug: "marsha", name: "Marsha" },
  { slug: "michie", name: "Michie" },
  { slug: "oline", name: "Oline" },
  { slug: "ribka", name: "Ribka" },
  { slug: "trisha", name: "Trisha" },
];

// 5 endpoint JKT48 Showroom (docs zelapi.eu.cc/docs/jkt48 — /jkt48/<kind>?roomId=&cookies=&apikey=)
export const ZEL_JKT48_KINDS = ["info", "comments", "gift", "rank", "stream"];

export function findJktaiMember(q) {
  const s = String(q || "").toLowerCase().trim();
  if (!s) return null;
  return ZEL_JKTAI_MEMBERS.find((m) => m.slug === s || m.name.toLowerCase() === s) || null;
}

// ── fetch helper (satu pintu biar seam gampang) ──
async function zelGet(url) {
  const doFetch = _http || (async (u) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(u, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    } finally { clearTimeout(t); }
  });
  let res;
  try { res = await doFetch(url); }
  catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "TIMEOUT (60 dtk) — server lama jawab" : (e?.message || "gagal koneksi") };
  }
  const status = res?.status || 0;
  let data = null;
  try { data = await res.json(); } catch { /* body bukan json → baca teks */ }
  if (status === 401 || status === 403) return { ok: false, error: `API_KEY_INVALID (${status}) — key zelapi kosong/expired, isi apikeys.json` };
  if (status === 429) return { ok: false, error: "RATE_LIMIT (429) — coba bentar lagi" };
  if (status !== 200) {
    const errText = data?.error || (data ? null : (await res.text?.().catch(() => "") || "").slice(0, 120));
    return { ok: false, error: `HTTP ${status}${errText ? " — " + errText : ""}` };
  }
  if (data?.status === false) return { ok: false, error: String(data?.error || "endpoint balik status false").slice(0, 200) };
  return { ok: true, data };
}

// ── JKT48 AI — chat persona member (/jktai/<slug>?text=&apikey=) ──
export async function jktAiChat(member, text) {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!text || !text.trim()) return { ok: false, error: "TEXT_KOSONG" };
  const p = new URLSearchParams({ apikey: key, text: text.trim() });
  const r = await zelGet(`${BASE}/jktai/${member.slug}?${p.toString()}`);
  if (!r.ok) return r;
  // bentuk respon defensif: data bisa string/objek, field macem-macem
  const d = r.data;
  let reply = "";
  const cands = [
    d?.data, d?.result, d?.message, d?.answer, d?.text, d?.response, d?.content,
    d?.data?.text, d?.data?.result, d?.data?.message, d?.data?.answer, d?.data?.response,
  ];
  for (const c of cands) if (typeof c === "string" && c.trim()) { reply = c.trim(); break; }
  if (!reply && d?.data && typeof d.data === "object") {
    // cari string terpanjang di kedalaman 2
    let best = "";
    const walk = (o, depth) => {
      if (depth > 2 || !o || typeof o !== "object") return;
      for (const v of Object.values(o)) {
        if (typeof v === "string" && v.trim().length > best.length) best = v.trim();
        else if (v && typeof v === "object") walk(v, depth + 1);
      }
    };
    walk(d.data, 0);
    reply = best;
  }
  if (!reply) return { ok: false, error: "Respon AI kosong — endpoint mungkin lagi goyang, coba lagi" };
  return { ok: true, reply };
}

// ── JKT48 Showroom — info/comments/gift/rank/stream (/jkt48/<kind>?roomId=&cookies=&apikey=) ──
export async function jktShowroom(kind, roomId, cookies = "") {
  const key = getKey();
  if (!key) return { ok: false, error: "API_KEY" };
  if (!ZEL_JKT48_KINDS.includes(kind)) return { ok: false, error: `KIND_INVALID — pilihan: ${ZEL_JKT48_KINDS.join("/")}` };
  const rid = String(roomId || "").trim();
  if (!rid || !/^[0-9]+$/.test(rid)) return { ok: false, error: "ROOM_ID_KOSONG — butuh roomId Showroom (angka)" };
  const p = new URLSearchParams({ roomId: rid, apikey: key });
  if (cookies && cookies.trim()) p.set("cookies", cookies.trim());
  const r = await zelGet(`${BASE}/jkt48/${kind}?${p.toString()}`);
  if (!r.ok) return r;
  return { ok: true, kind, roomId: rid, data: r.data };
}
