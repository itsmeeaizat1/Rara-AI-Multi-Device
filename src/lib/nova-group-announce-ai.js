// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-group-announce-ai.js — Pesan notifikasi grup ditutup/dibuka kembali
// yang digenerate AI (IkyyXD /ai/gemini — free, no apikey) supaya berubah
// tiap kali grup ditutup/dibuka. Fallback ke template lokal kalau API
// mati/timeout/gagal validasi — jadi fitur gak pernah macet.
//
// AI disuruh nyelipin placeholder literal @{user} di tengah kalimat
// (diganti jadi @nomor + mentions pas dikirim). Kalau hasil AI gak
// lolos validasi (placeholder hilang/lebih dari satu), pakai template.
//
// FALLBACK ENGINE: kalau AI mati/timeout, pesan GAK kaku sebaris —
// pakai format engine khas welcome/goodbye (novaGameBox): sapaan acak,
// info lengkap (grup, admin mention, tanggal, waktu WIB, member, status),
// CTA tematik per jenis.

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
  const reason = String(ctx.reason || "").trim();
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
    (reason ? `Alasan dari admin: "${reason}" — WAJIB sertakan alasan ini di pengumuman. ` : ``) +
    `Gaya: pengumuman langsung dan jelas, contoh pembuka ${isClose ? `"Grup ditutup oleh admin..."` : `"Grup dibuka kembali oleh admin..."`} — TANPA kiasan (jangan pakai kata "gembok", "kunci", "pintu", atau metafora lain). ` +
    `\n\n` +
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

import { novaGameBox, gameCTA } from "./nova-games.js";

// ─── FALLBACK ENGINE (format khas welcome/goodbye) ───

// Sapaan acak biar fallback pun gak monoton
const FLAVOR_CLOSE = [
  (n) => `*Grup ditutup oleh admin @${n}*`,
  (n) => `*Admin @${n} baru saja menutup grup ini*`,
  (n) => `*Pengumuman: grup ditutup oleh @${n}*`,
  (n) => `*Grup resmi ditutup oleh admin @${n}*`,
];
// Sapaan close & open = pengumuman langsung TANPA kiasan (gak ada "gembok"/"pintu")
const FLAVOR_OPEN = [
  (n) => `*Grup dibuka kembali oleh admin @${n}*`,
  (n) => `*Admin @${n} baru saja membuka grup ini*`,
  (n) => `*Pengumuman: grup dibuka kembali oleh @${n}*`,
  (n) => `*Grup resmi dibuka kembali oleh admin @${n}*`,
];

function nowDateTimeWib() {
  const now = new Date();
  const tanggal = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const waktu = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
  return { tanggal, waktu };
}

/**
 * Fallback engine grup ditutup/dibuka kembali — dipakai kalau AI mati.
 * Format khas welcome/goodbye: sapaan acak + box info lengkap + CTA.
 * @param {"close"|"open"} type
 * @param {{groupName?:string, senderNum?:string, memberCount?:number, reason?:string}} ctx
 * @returns {string} teks engine (mention @nomor ada di flavor & baris Admin)
 */
export function buildFallbackAnnounce(type, ctx = {}) {
  const { groupName = "Grup", senderNum = "", memberCount = 0, reason = "" } = ctx;
  const { tanggal, waktu } = nowDateTimeWib();
  const flavors = type === "close" ? FLAVOR_CLOSE : FLAVOR_OPEN;
  const flavor = flavors[Math.floor(Math.random() * flavors.length)](senderNum);

  const rows = [
    `│ • 🏠 Grup : ${groupName}`,
    `│ • 👤 Admin : @${senderNum}`,
    `│ • 📅 Tanggal : ${tanggal}`,
    `│ • 🕐 Waktu : ${waktu}`,
  ];
  if (memberCount > 0) rows.push(`│ • 👥 Total Member : ${memberCount}`);
  if (reason) rows.push(`│ • 📝 Alasan : ${reason}`);
  if (type === "close") {
    rows.push(`│ • 🔒 Status : Hanya admin yang bisa mengirim pesan`);
    rows.push(`│ • ℹ️ Info : Grup dibuka kembali oleh admin ketika sudah waktunya`);
  } else {
    rows.push(`│ • 🔓 Status : Semua member sudah bisa mengirim pesan kembali`);
    rows.push(`│ • ℹ️ Info : Yuk ramein lagi obrolannya, jangan cuma baca doang`);
  }

  return novaGameBox({
    title: type === "close" ? "GROUP CLOSED" : "GROUP OPENED",
    icon: type === "close" ? "🔒" : "🔓",
    flavor,
    body: rows.join("\n"),
    cta: gameCTA(type === "close" ? "groupclosed" : "groupopened"),
  });
}

/**
 * Pesan AI untuk grup ditutup/dibuka kembali.
 * @param {"close"|"open"} type — close = grup ditutup, open = dibuka kembali
 * @param {{groupName?:string, actorName?:string, reason?:string}} ctx — konteks untuk prompt
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
