// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * .whois — "Siapa nomor ini?" dossier AI dari histori persisten.
 * Saran fitur #2 owner (21 Sep 2026): reply pesan / mention / nomor /
 * kartu kontak → bot rangkum dari chathistory.json: siapa orang ini,
 * sering ngomongin apa, di grup mana dia aktif, interaksi terakhir,
 * plus catatan buat owner. Kaya CRM pribadi.
 *
 * Sumber data: HANYA jejak histori persisten (rara-chat-log) —
 * AI dilarang mengarang identitas. Kalau histori kosong → jujur bilang.
 *
 * Commands:
 *   .whois <nomor>          — dossier nomor itu
 *   .whois (reply pesan)    — dossier pengirim pesan yang di-reply
 *   .whois (reply kontak)   — dossier nomor dari kartu kontak vCard
 *   .whois @mention          — dossier yang di-mention
 *   .whois <nomor> raw      — jejak mentah (tanpa AI)
 */

import { getDatabase } from "../../src/lib/rara-database.js";
import { searchSenderMessages } from "../../src/lib/rara-chat-log.js";
import { raraBox } from "../../src/lib/rara-menu-style.js";
import { callAI } from "../../src/lib/rara-ai-service.js";
import * as timeHelper from "../../src/lib/rara-time.js";

const pluginConfig = {
  name: "whois",
  alias: ["whois", "siapa", "siapanomor", "siapanomorini"],
  category: "owner",
  description: "Siapa nomor ini? Dossier AI dari jejak histori chat",
  usage: ".whois <nomor/reply/mention/kontak>",
  example: ".whois 62812xxxxxxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ────────────────────────────────────────────────────────────────────────────
// RESOLVE TARGET
// ────────────────────────────────────────────────────────────────────────────

function normalizeNumber(raw) {
  let digits = String(raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = "62" + digits.slice(1); // 08xx → 628xx
  return digits;
}

// nomor dari kartu kontak vCard (reply kontak WhatsApp)
function numberFromVcard(m) {
  try {
    const q = m.quoted;
    const msg = q?.message || q;
    const cm = msg?.contactMessage || msg?.contactsArrayMessage?.contacts?.[0];
    const vcard = cm?.vcard || "";
    const tels = [...vcard.matchAll(/TEL[^\n]*/g)].map((x) => {
      const line = x[0];
      const waid = /waid=([0-9]+)/.exec(line);
      if (waid) return waid[1]; // waid WA = nomor lengkap paling andal
      return (line.split(":").pop() || "").replace(/[^0-9]/g, "");
    });
    for (const t of tels) {
      const n = normalizeNumber(t);
      if (n.length >= 8) return n;
    }
  } catch {}
  return "";
}

function resolveTargetNumber(m) {
  // 1. reply kartu kontak
  const vcardNum = numberFromVcard(m);
  if (vcardNum) return vcardNum;
  // 2. reply pesan — pengirim pesan yang di-reply
  if (m.quoted?.sender) return normalizeNumber(m.quoted.sender);
  // 3. mention
  const mentioned = m.mentionedJid?.[0] || m.msg?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return normalizeNumber(mentioned);
  // 4. argumen nomor polos
  const arg = (m.text || "").trim().split(/\s+/)[0] || "";
  if (/^[+]?[0-9@.\s-]{8,}$/.test(arg)) return normalizeNumber(arg);
  return "";
}

// ────────────────────────────────────────────────────────────────────────────
// KUMPULKAN JEJAK
// ────────────────────────────────────────────────────────────────────────────

const KIND_LABEL = {
  teks: "teks",
  foto: "foto",
  video: "video",
  sticker: "stiker",
  suara: "vn",
  dokumen: "dokumen",
  media: "media",
};

function chatLabel(jid) {
  if (typeof jid !== "string") return "chat";
  if (jid.endsWith("@g.us")) return "Grup " + jid.split("@")[0].slice(-6);
  if (jid.endsWith("@s.whatsapp.net")) return "DM";
  return jid.slice(0, 18);
}

function fmtTime(ts) {
  try {
    return timeHelper.formatTime?.(ts) ||
      new Date(ts).toLocaleString("id-ID", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        timeZone: "Asia/Jakarta",
      });
  } catch {
    return "?";
  }
}

/**
 * Bangun data dossier dari jejak histori. Return:
 * { number, rows, chats, kinds, first, last, total, rawRequested }
 */
function buildDossierData(number, opts = {}) {
  const limit = opts.limit || 60;
  const rows = searchSenderMessages(number, 500);
  const chats = {};
  const kinds = {};
  for (const r of rows) {
    chats[r.chat] = (chats[r.chat] || 0) + 1;
    const k = KIND_LABEL[r.k] || "media";
    kinds[k] = (kinds[k] || 0) + 1;
  }
  const sorted = [...rows].sort((a, b) => (a.t || 0) - (b.t || 0));
  return {
    number,
    rows,
    total: rows.length,
    chats,
    kinds,
    first: sorted[0]?.t || null,
    last: sorted[sorted.length - 1]?.t || null,
    rawRequested: !!opts.raw,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// FALLBACK (AI gagal / mati) — statistik polos dari jejak
// ────────────────────────────────────────────────────────────────────────────

function buildFallbackBox(data) {
  const chatLines = Object.entries(data.chats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([jid, n]) => `| ${chatLabel(jid)}: ${n} pesan`);
  const kindLines = Object.entries(data.kinds)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(" · ");
  const lines = [
    `Nomor: +${data.number}`,
    `Jejak: ${data.total} pesan tercatat`,
    `Pertama: ${data.first ? fmtTime(data.first) : "-"}`,
    `Terakhir: ${data.last ? fmtTime(data.last) : "-"}`,
    `Jenis: ${kindLines || "teks"}`,
    "---",
    `Aktif di:`,
    ...(chatLines.length ? chatLines : ["| (belum ada)"]),
    "---",
    `Catatan: AI sedang gak merespons —`,
    `ini statistik mentah dari histori.`,
  ];
  return raraBox("WHOIS — " + data.number, lines);
}

// ────────────────────────────────────────────────────────────────────────────
// AI DOSSIER
// ────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(data) {
  const sample = data.rows.slice(0, 40).reverse(); // urut lama → baru
  const log = sample.map((r) =>
    `[${fmtTime(r.t)}] (${chatLabel(r.chat)}${r.k !== "teks" ? ", " + (KIND_LABEL[r.k] || "media") : ""}) "${r.b || "(" + (KIND_LABEL[r.k] || "media") + ")"}"`
  ).join("\n");
  const chats = Object.entries(data.chats)
    .sort((a, b) => b[1] - a[1])
    .map(([jid, n]) => `${chatLabel(jid)} (${n} pesan)`)
    .join(", ");
  return (
    `Analisis orang dengan nomor +${data.number} dari jejak chat berikut.\n\n` +
    `[STATISTIK]\n` +
    `Total pesan tercatat: ${data.total}\n` +
    `Pertama tercatat: ${data.first ? fmtTime(data.first) : "-"}\n` +
    `Terakhir aktif: ${data.last ? fmtTime(data.last) : "-"}\n` +
    `Aktif di: ${chats}\n\n` +
    `[CONTOH PERCAKAPAN (maks 40 pesan terakhir)]\n${log}\n\n` +
    `Buat dossier singkat buat owner bot: siapa kemungkinan orang ini ` +
    `(pelanggan? teman? calon sewa?), apa yang biasa dia bahas/minta, ` +
    `seberapa sering dan di mana dia aktif, dan 1-2 catatan/saran buat owner.`
  );
}

const SYSTEM_PROMPT =
  `Kamu adalah analis "personal CRM" untuk pemilik bot WhatsApp Indonesia. ` +
  `Tugasmu: menebak SIAPA seseorang dari JEJAK pesannya saja. ` +
  `Jawab Bahasa Indonesia santai tapi profesional.\n` +
  `Format WAJIB persis:\n` +
  `Peran: <tebakan peran/konteksnya, 1 baris>\n` +
  `Topik: <yang biasa dia bahas/minta, 2-3 baris>\n` +
  `Aktivitas: <seberapa sering, di grup apa / DM, 1-2 baris>\n` +
  `Catatan buat owner: <1-2 saran praktis>\n` +
  `ATURAN KERAS: dasarkan HANYA pada data yang dikasih. JANGAN mengarang ` +
  `nama, pekerjaan, kota, atau identitas yang gak ada di jejak. Kalau data ` +
  `kurang, bilang jujur. Tanpa markdown bold/italic, tanpa box-drawing, ` +
  `maksimal 12 baris, emoji maksimal 2.`;

async function generateAIDossier(data) {
  try {
    const result = await callAI(buildUserPrompt(data), {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 600,
    });
    if (typeof result === "string" && result.trim().length > 30) {
      return result.trim();
    }
  } catch {}
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// HANDLER
// ────────────────────────────────────────────────────────────────────────────

async function handler(m, { sock, db: _db, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/).filter(Boolean);
  const raw = args.includes("raw");

  const number = resolveTargetNumber(m);
  if (!number) {
    await m.reply(raraBox("WHOIS — SIAPA NOMOR INI?", [
      `Cara pakai:`,
      `${prefix}whois <nomor> — dossier nomor itu`,
      `${prefix}whois — reply pesan orangnya`,
      `${prefix}whois — reply kartu kontak`,
      `${prefix}whois @mention — dossier yang di-mention`,
      `${prefix}whois <nomor> raw — jejak mentah tanpa AI`,
      "---",
      `Data: jejak histori chat persisten.`,
      `Belum ada histori = belum terjawab.`,
    ]));
    return { handled: true };
  }

  const data = buildDossierData(number, { raw });
  if (!data.total) {
    await m.reply(raraBox("WHOIS — +" + number, [
      `Belum ada jejak orang ini di histori.`,
      `Bot cuma mencatat pesan sejak fitur histori aktif —`,
      `orang yang belum pernah ngobrol di chat yang bot ikuti`,
      `belum punya data.`,
    ]));
    return { handled: true };
  }

  // RAW: jejak mentah tanpa AI
  if (raw) {
    const lines = data.rows.slice(0, 15).map((r) =>
      `| ${fmtTime(r.t)} ${chatLabel(r.chat)}: ${String(r.b || "(" + (KIND_LABEL[r.k] || "media") + ")").slice(0, 60)}`
    );
    await m.reply(raraBox("WHOIS RAW — +" + number, [
      `Total: ${data.total} pesan (15 terakhir)`,
      "---",
      ...lines,
    ]));
    return { handled: true };
  }

  // AI dossier, fallback statistik
  const ai = await generateAIDossier(data);
  if (ai) {
    await m.reply(raraBox("WHOIS — +" + number, [
      `Jejak: ${data.total} pesan · ${Object.keys(data.chats).length} chat`,
      `Terakhir aktif: ${data.last ? fmtTime(data.last) : "-"}`,
      "---",
      ai,
    ]));
  } else {
    await m.reply(buildFallbackBox(data));
  }
  return { handled: true };
}

// seam khusus e2e
export function _whoisInternalsForTest() {
  return {
    normalizeNumber,
    resolveTargetNumber,
    numberFromVcard,
    buildDossierData,
    buildFallbackBox,
    chatLabel,
    fmtTime,
    SYSTEM_PROMPT,
  };
}

export { pluginConfig as config, handler };
