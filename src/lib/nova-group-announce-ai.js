// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-group-announce-ai.js — Pesan notifikasi grup ditutup/dibuka kembali
// yang digenerate AI (IkyyXD /ai/gemini — free, no apikey) supaya berubah
// tiap kali grup ditutup/dibuka. Fallback ke template lokal kalau API
// mati/timeout/gagal validasi — jadi fitur gak pernah macet.
//
// AI disuruh nyelipin placeholder literal @{user} di tengah kalimat
// (diganti jadi @nomor + mentions pas dikirim). Kalau hasil AI gak
// lolos validasi (placeholder hilang/lebih dari satu), pakai template.

const IKY_AI_URL = "https://api.ikyyxd.my.id/ai/gemini";
const TIMEOUT_MS = 7000; // jangan bikin .close/.open nunggu kelamaan

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return "pagi";
  if (h >= 10 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam";
}

function buildPrompt(type, ctx) {
  const groupName = ctx.groupName || "grup ini";
  const actorName = ctx.actorName || "admin";
  const isClose = type === "close";

  return (
    `[TUGAS]\n` +
    `Tulis pengumuman singkat bahwa grup WhatsApp "${groupName}" baru saja ` +
    `di${isClose ? "tutup" : "buka kembali"} oleh admin bernama ${actorName}, ` +
    `saat waktu ${timeOfDay()}. ` +
    (isClose
      ? `Artinya: sementara ini HANYA admin yang bisa kirim pesan, member lain harus menunggu sampai grup dibuka lagi. `
      : `Artinya: SEMUA member sudah bebas kirim pesan kembali seperti biasa. `) +
    `Sampaikan dengan hangat dan santai, boleh sedikit lucu atau menyapa member.\n\n` +
    `[ATURAN]\n` +
    `- Wajib sertakan teks placeholder @{user} TEPAT SATU KALI di tengah kalimat ` +
    `untuk mewakili admin yang melakukan aksi (akan diganti mention otomatis).\n` +
    `- Maksimal 30 kata, 1-2 kalimat.\n` +
    `- Bahasa Indonesia santai, tanpa emoji, tanpa tanda kutip, tanpa markdown, tanpa simbol aneh.\n` +
    `- PENTING: setiap jawaban WAJIB berbeda pola kalimat — jangan mulai dari ` +
    `"@{user} telah menutup grup" terus. Balas dengan pengumumannya saja.`
  );
}

function cleanResult(raw, type) {
  if (typeof raw !== "string") return null;
  let t = raw.trim()
    .replace(/^["'`\u201c\u2018]+|["'`\u201d\u2019]+$/g, "") // kutip di ujung
    .replace(/\s+/g, " ")
    .trim();
  // buang kalimat pengantar model ("Berikut pengumuman: ...")
  t = t.replace(/^(berikut|ini|pengumuman|pesan)[^:]{0,20}:\s*/i, "");
  // buang markdown (*bold* / _italic_) — kecuali placeholder @{user}
  t = t.replace(/[*_~`]+/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  // max ±200 karakter
  if (t.length > 200) t = t.slice(0, 200).trim();
  // wajib ada placeholder @{user} TEPAT sekali — kalau gak, gak layak dipakai
  const count = (t.match(/@\{user\}/g) || []).length;
  if (count !== 1) return null;
  if (t.length < 15 || !/[a-zA-Z]/.test(t)) return null;
  return t;
}

async function fetchFromIky(type, ctx) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${IKY_AI_URL}?text=${encodeURIComponent(buildPrompt(type, ctx))}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "NovaBot/1.0" } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== true) return null;
    return cleanResult(json.result, type);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pesan AI untuk grup ditutup/dibuka kembali.
 * @param {"close"|"open"} type — close = grup ditutup, open = dibuka kembali
 * @param {{groupName?:string, actorName?:string}} ctx — konteks untuk prompt
 * @returns {Promise<string|null>} teks ber-placeholder @{user}, atau null
 *          kalau AI mati/timeout/gagal validasi (pemanggil pakai template).
 */
export async function getAiGroupAnnounce(type, ctx = {}) {
  try {
    return await fetchFromIky(type, ctx);
  } catch {
    return null;
  }
}
