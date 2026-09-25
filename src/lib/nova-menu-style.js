// === Nova AI Menu Style (v8 — Unified Box) ===
//
// GUARD RATA KIRI (request owner 2026-09-07): body box WAJIB dibungkus
// wrapText dari lib/styler.js (≤30 char/baris + potong paksa kata/URL
// panjang). Dulu wrapLine motong di 60 char — lebih lebar dari layar HP,
// WhatsApp melipat sisanya TANPA prefix "│ " → teks nabrak border kiri.
import { wrapText as guardWrapText } from "./styler.js";
import { getPlugin } from "./nova-plugins.js";

// Aesthetic khas bot WhatsApp dev Indonesia:
// 「 ✦  ✦」 box drawing, │ clean body lines, │ sub-section, ╰────  •  ──── footer
// + modern data: ▰▱ progress bars, ● status dots, system info
// SEMUA text pakai smallcaps font (toSC diterapkan ke header + body)
// Semua fungsi lama tetap export dengan signature sama.
//
// STYLE GUIDE (wajib konsisten di semua plugin):
// ┌─ Header:   「 ✦ Title ✦ 」
// │─ Body:     │ content
// │─ Empty:    │
// │─ Sub:      │ 「 Sub Title 」
// │─ Content:  │ content
// │─ Footer:   ╰────  •  ────
// Small caps map (q & x tidak ada di Unicode smallcaps, tetap as-is)
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};

// toSC: convert a-zA-Z → smallcaps, sisanya tetap
const toSC = (s) => String(s).replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

// scLine: apply smallcaps to text content, tapi preserve:
// - box drawing chars (╭╮╰╯│├─┊┃━)
// - emoji & special symbols (📌💡⚠️🐦 dll)
// - markdown markers (* ` _)
// - URLs (http/https jangan di-convert)
// - numbers
// - leading │ prefix
const scLine = (line) => {
  const str = String(line);
  if (!str || !str.trim()) return str;
  // Jangan convert URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = str.split(urlRegex);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return toSC(part);
  }).join('');
};

// Helper: detect real emoji (bukan "i" atau teks biasa)
const isRealEmoji = (s) => s && /\p{Extended_Pictographic}/u.test(s);

// ═══════════════════════════════════════════════
// CORE BOX BUILDER — semua fungsi pakai ini
// ═══════════════════════════════════════════════

/**
 * Build a complete box with header, body lines, and footer.
 * Sub-sections inside body: pass { subHeader: "Title" } as a line.
 * Separator: pass "---" as a line.
 * Empty: pass "" as a line.
 */
// Wrap konten box per kata supaya WhatsApp gak hard-wrap acak di tengah
// baris — lanjutan baris tetap pakai prefix │ biar box keliatan rapi.
const BOX_WRAP_WIDTH = 30; // GUARD: 60 kelebaran — WA fold di ~30-35, sisanya tembus border kiri

// GUARD (owner 2026-09-07): semua body box lewat wrapText styler.js —
// maks width char/baris, multi-baris dipecah bener, kata/URL super
// panjang dipotong paksa — gak ada lagi baris yang dilipat WhatsApp
// sendiri tanpa prefix (biang "teks nabrak border kiri").
function wrapLine(text, width = BOX_WRAP_WIDTH) {
  return guardWrapText(text, width);
}

function buildBox(headerTitle, lines = []) {
  // Header TIDAK di-stretch mengikuti panjang body — dash panjang tanpa spasi
  // bikin WhatsApp hard-wrap jadi beberapa baris "──────" berantakan di HP.
  // Header dipakai apa adanya, sama seperti style menu/allmenu yang disetujui owner.
  // toSC di-apply di sini biar SEMUA caller otomatis smallcaps, konsisten.
  // REWORK 2026-09-07 (owner: "hapus juga di menu usage semua fitur dan
  // replynya hapus garisnya") — buildBox TANPA garis: header 「 ✦ Title ✦ 」,
  // isi polos tanpa prefix │, tanpa footer ╰────, tanpa wrapLine 30-char
  // (gak ada border yang bisa putus, WhatsApp wrap natural). buildBox dipakai
  // claraWrap/novaReply/novaCaption/bracketBox → SEMUA reply plugin kebagian.
  const header = `「 ✦ ${toSC(String(headerTitle))} ✦ 」`;
  // FIX OWNER 20 Sep 2026 ("kenapa formatnya gak rata kiri, ada spasi di awal
  // nomor — yg rata kiri cuma judul doang"): baris isi yang di-indent spasi
  // (contoh baris lanjutan "   contoh: ..." di tutorial) bikin blok keliatan
  // acak di WA. Sekarang SEMUA baris isi otomatis di-DEDENT (spasi/tab di awal
  // dibuang) biar rata kiri semua. Pengecualian: baris di dalam code fence
  // ``` (kode butuh indentasi) tetap verbatim.
  const body = [];
  let inFence = false;
  for (const line of lines) {
    if (line === "---" || line === "─" || line === "---separator---") {
      body.push("");
      continue;
    }
    if (typeof line === "object" && line.subHeader) {
      body.push(`「 ${toSC(line.subHeader)} 」`);
      continue;
    }
    const rawLine = line === undefined || line === null ? "" : String(line);
    if (/^\s*```/.test(rawLine)) inFence = !inFence;
    if (!rawLine.trim()) {
      body.push("");
      continue;
    }
    let clean = rawLine
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '')
      .replace(/^(?:[•┊╎❏➶╭╰│┃]\s*)+/, '');
    // rata kiri: buang spasi/tab pemandangan di awal baris (kecuali dalam fence)
    if (!inFence) clean = clean.replace(/^[ \t]+/, '');
    body.push(scLine(clean));
  }
  return [header, ...body].join("\n");
}

// novaCaption: caption panduan pakai fitur (no-input guide) — pakai buildBox modern style
function novaCaption({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
  // REWORK 25 Sep — kartu usage → DESAIN V2 kaomoji + emoji muka cute.
  // usage/example VERBATIM; description/note smallcaps; spec dari pluginConfig.
  // Game category tetap render box lama (desain khas game sendiri).
  if (isGameCmd(name)) return novaCaptionClassic({ emoji, name, description, usage, example, note });
  const title = name ? toSC(name) : toSC("Guide");
  let out = `「✧ ${toSC(String(title).toLowerCase())} ✧」\n`;
  out += `${v2Kaomoji(name)} ${toSC(String(title).toLowerCase())}!!\n`;
  if (description && String(description).trim()) out += `\n${scLine(description)}\n`;
  if (usage || example || note) {
    out += `\n📍`;
    if (usage && String(usage).trim()) out += ` ${toSC("Cara")}: ${String(usage).replace(/\`/g, "").trim()}`;
    if (example && String(example).trim()) out += ` ${toSC("Contoh")}: ${String(example).replace(/\`/g, "").trim()}`;
    if (note && String(note).trim()) out += `, ${scLine(note)}~`;
    out += `\n`;
  }
  const cspec = v2Spec(name);
  if (cspec) out += `\n${cspec}\n`;
  return out.replace(/\n+$/, "");
}
// render box lama — fallback game + kompat
function novaCaptionClassic({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
  const title = name ? toSC(name) : toSC("Guide");
  const lines = [];

  if (description) {
    lines.push(description);
    lines.push("");
  }

  if (usage) {
    lines.push(`📌 *${toSC("Cara Pakai")}:*`);
    lines.push(`\`${usage}\``);
    lines.push("");
  }

  if (example) {
    lines.push(`💡 *${toSC("Contoh")}:*`);
    if (example.includes("\n")) {
      for (const line of example.split("\n")) {
        lines.push(`\`${line.trim()}\``);
      }
    } else {
      lines.push(`\`${example}\``);
    }
    lines.push("");
  }

  if (note) {
    lines.push(`📝 _${note}_`);
  }

  // Remove trailing empty line
  while (lines.length && !lines[lines.length - 1]) lines.pop();

  return buildBox(title, lines);
}

// ═══════════════════════════════════════════════
// INDO DEV STYLE FUNCTIONS (untuk menu/allmenu/allmenucategory)
// ═══════════════════════════════════════════════

function botHeader(botName) {
  return `「 ✦ ${toSC(botName)} ✦ 」`;
}

function botSignature(botName) {
  return ;
}

function sectionBox(emoji, title, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  return buildBox(`${emojiStr}${toSC(title)}`, lines);
}

function progressBar(value, max, width = 8) {
  const v = Math.max(0, Math.min(value, max));
  const filled = max > 0 ? Math.round((v / max) * width) : 0;
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

function statusDot(status = "online") {
  const map = { online: "●", offline: "○", active: "●", idle: "◐", error: "✕" };
  return map[status.toLowerCase()] || "●";
}

function kv(key, value, padTo = 10) {
  const k = toSC(String(key));
  const padded = k + " ".repeat(Math.max(0, padTo - k.length));
  return `${padded} : ${scLine(value)}`;
}

function categoryBox(emoji, name, commands, prefix, perLine = 3) {
  const headerCore = `「 ✦ ${toSC(name)} (${commands.length}) ✦ 」`;
  const lines = [];
  let maxW = headerCore.length;
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    const line = `${chunk.map(c => `${prefix}${toSC(c)}`).join("  ")}`;
    if (line.length > maxW) maxW = line.length;
    lines.push(line);
  }
  const W = Math.max(maxW + 3, 24);
  const header = headerCore + "─".repeat(Math.max(0, W - headerCore.length));
  const body = lines;
  const footer = "";
  return [header, ...body, footer].join("\n");
}

// ═══════════════════════════════════════════════
// BACKWARD COMPAT — fungsi lama, signature sama
// Output: Unified Box Style v8 (semua konsisten)
// Dipakai oleh 1280+ file plugin. Update di sini = update semua.
// ═══════════════════════════════════════════════

function sectionHeader(title) {
  return `「 ✦ ${toSC(title)} ✦ 」`;
}

function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│┃]\s*/g, '').replace(/^\s+/g, '');
  return `${scLine(clean)}`;
}

function sectionClose() {
  return ;
}

function sectionSpacer() {
  return ;
}

function buildSection(title, items = []) {
  const header = sectionHeader(title);
  let maxW = header.length;
  const bodyLines = items.map(item => sectionItem(item));
  for (const l of bodyLines) if (l.length > maxW) maxW = l.length;
  const W = Math.max(maxW + 3, 24);
  const closedHeader = header + "─".repeat(Math.max(0, W - header.length));
  const closedBody = bodyLines;
  const closedFooter = "";
  return [closedHeader, ...closedBody, closedFooter].join("\n");
}

function claraHeader(title, emoji = "") {
  if (isRealEmoji(emoji)) return `「 ✦ ${emoji} ${toSC(title)} ✦ 」`;
  return `「 ✦ ${toSC(title)} ✦ 」`;
}

function bracketBox(emoji, label, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  return buildBox(`${emojiStr}${toSC(label)}`, lines);
}

// getAccessSymbols — symbol akses fitur dari config plugin (shared, request owner). Urutan: ʀ ꜰ Ⓟ Ⓛ ᴜ ᴏ (R F P L U O):
// Ⓤ User (semua user), Ⓕ Free (quota gratis), Ⓟ Premium, Ⓞ Owner,
// Ⓛ Limit (akses fitur — BUKAN energi game), ʀ Register (wajib .daftar — RPG), Ⓐ Admin, Ⓖ Grup
function getAccessSymbols(cfg) {
  if (!cfg) return "";
  // Khusus owner → satu symbol saja
  if (cfg.isOwner) return " Ⓞ";
  // Urutan owner (konfirmasi): ʀ ꜰ Ⓟ Ⓛ ᴜ ᴏ → R F P L U O
  const symbols = [];
  const cat = String(cfg.category || "");
  const gameCtx = ["rpg", "game", "rpg couple"].includes(cat);
  // ʀ Register (wajib .daftar — RPG) — PALING DEPAN
  if (cat === "rpg") symbols.push("ʀ");
  if (cfg.isPremium) {
    // Khusus premium — user biasa gak bisa → tanpa Ⓤ
    symbols.push("Ⓟ");
  } else {
    if ((cfg.energi || 0) > 0 && !gameCtx) {
      // Fitur (ai/download/tools/dll): potong LIMIT akses fitur
      // Ⓕ Free (quota gratis) → Ⓟ Premium (unlimited) → Ⓛ Limit (pakai limit)
      symbols.push("Ⓕ", "Ⓟ", "Ⓛ");
    }
    // Game (rpg/game) ber-energi → potongnya ENERGI GAME (bukan limit) → tanpa ⒻⓅⓁ
    // Ⓤ User (semua user bisa)
    symbols.push("Ⓤ");
  }
  // Ⓞ Owner (owner juga bisa pakai semua fitur)
  symbols.push("Ⓞ");
  if (cfg.isAdmin) symbols.push("Ⓐ");
  if (cfg.isGroup && !cfg.isPrivate) symbols.push("Ⓖ");
  return " " + symbols.join(" ");
}

// commandListLine: baris command di list menu (allmenu/allmenucategory)
function commandListLine(prefix, cmdName, usage = "", symbols = "") {
  const paramMatches = usage ? String(usage).match(/<[^>]+>/g) : null;
  const paramPart = paramMatches ? " " + toSC(paramMatches.join(" ")) : "";
  const symbolPart = symbols ? " " + String(symbols).trim() : "";
  return `${prefix}${toSC(String(cmdName))}${paramPart}${symbolPart}`;
}

function separator(char = "─", repeat = 20) {
  return "─".repeat(Math.min(repeat, 28));
}

function tipText(text) {
  return `💡 *${toSC("Tip")}:* ${scLine(text)}`;
}

function claraWrap(title, body, type = "info") {
  const raw = Array.isArray(body) ? body : String(body).split("\n");
  // FIX: dulu .filter(l => l.trim()) buang SEMUA baris kosong, termasuk
  // pemisah paragraf yang disengaja (\n\n atau "" di array) — bikin info
  // yang beda topik nempel jadi satu (contoh: .play pilih bitrate <>
  // contoh, .tojpg not-found <> mungkin maksudmu). Sekarang: baris kosong
  // di TENGAH dipertahankan jadi spasi paragraf (buildBox render │),
  // cuma baris kosong di awal/akhir (sisa split) & blank dobel yang dibuang.
  let lines = raw.map(l => (l === undefined || l === null) ? "" : (typeof l === "object" && l !== null && l.subHeader) ? l : String(l));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const collapsed = [];
  let prevBlank = false;
  for (const l of lines) {
    const isBlank = typeof l === "string" ? !l.trim() : false;
    if (isBlank && prevBlank) continue;
    collapsed.push(l);
    prevBlank = isBlank;
  }
  lines = collapsed;

  // REWORK 25 Sep (owner: "semua plugin diubah usage jadi desain kaomoji") —
  // kind "guide" = kartu USAGE → render V2 kaomoji + emoji muka cute. Body
  // tetap VERBATIM (isi command "Contoh: .xxx" gak boleh ke-smallcaps).
  // Game/rpg/rpg-cinta/rpg-couple tetap box lama (desain khas game sendiri).
  if (type === "guide" && !isGameCmd(title)) {
    const gname = toSC(String(title || "guide").toLowerCase());
    let gout = `「✧ ${gname} ✧」\n`;
    gout += `${v2Kaomoji(title)} ${gname}!!\n`;
    if (lines.length) {
      const bodyTxt = lines.map((l) => (typeof l === "object" && l !== null) ? `◈ ${l.subHeader || l.sub || ""}` : l).join("\n");
      gout += `\n${bodyTxt}\n`;
    }
    const gspec = v2Spec(title);
    if (gspec) gout += `\n${gspec}\n`;
    return gout.replace(/\n+$/, "");
  }

  // Prefix icon di baris pertama untuk status type (error/success/warn)
  if (type === "error" && lines.length) {
    lines[0] = lines[0].startsWith("❌") ? lines[0] : `❌ ${lines[0]}`;
  } else if (type === "success" && lines.length) {
    lines[0] = lines[0].startsWith("✅") ? lines[0] : `✅ ${lines[0]}`;
  } else if (type === "warn" && lines.length) {
    // Aturan owner: peringatan pakai ❗ (cooldown game dsb.) — bukan ⚠
    lines[0] = lines[0].startsWith("❗") ? lines[0] : `❗ ${lines[0]}`;
  }

  // Semua type (info/guide/error/success/warn) pakai box-drawing yang sama
  return buildBox(title, lines);
}

function claraLine(title, text) {
  return String(text || "");
}

const alyaHeader = claraHeader;

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function broadcastFormat({ botName = "Nova AI", senderName = "Owner", message, type = "group" }) {
  const now = new Date();
  const tanggal = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const waktu = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const typeLabel = type === "private" ? "Private Chat" : type === "channel" ? "Channel" : "Grup Broadcast";
  const typeIcon = type === "private" ? "📱" : type === "channel" ? "📺" : "📢";

  const lines = [
    "",
    { subHeader: `*${toSC("Detail")}*` },
    `*${toSC("Bot")}:* ${scLine(botName)}`,
    `*${toSC("Dari")}:* ${scLine(senderName)}`,
    `*${toSC("Tipe")}:* ${typeIcon} ${scLine(typeLabel)}`,
    `*${toSC("Tanggal")}:* ${tanggal}`,
    `*${toSC("Waktu")}:* ${waktu} ${toSC("WIB")}`,
    "---",
    { subHeader: `*${toSC("Pesan")}*` },
    ...String(message || "").split("\n").map(l => l.trim() ? scLine(l) : ""),
    "---",
    `⚠️ _${toSC("Pesan resmi dari owner bot")}_`,
  ];

  return buildBox(`${typeIcon} ${toSC("Broadcast Info")}`, lines);
}

// novaUsage: pesan usage yang menarik dengan emoji labels
function novaUsage(commandName, { steps = [], example = "", note = "", emoji = "" } = {}) {
  const lines = [];
  if (steps.length > 0) {
    lines.push("");
    lines.push(`📌 *${toSC("Cara Pakai")}:*`);
    for (const step of steps) {
      const clean = String(step)
        .replace(/^[•┊╎❏➶╭╰│┃]\s*/g, '')
        .replace(/^\s+/g, '');
      lines.push(scLine(clean));
    }
  }
  if (example) {
    lines.push("");
    lines.push(`💡 *${toSC("Contoh")}:*`);
    lines.push(`\`${example}\``);
  }
  if (note) {
    lines.push("");
    lines.push(`_${scLine(note)}_`);
  }
  lines.push("");
  const title = emoji ? `${emoji} ${commandName}` : commandName;
  return bracketBox('i', title, lines);
}

function infoBox(title, { intro, sections = [] } = {}) {
  const lines = [];
  if (intro) lines.push(scLine(intro));
  for (const sec of sections) {
    lines.push("");
    if (sec.heading) lines.push({ subHeader: `◈ *${toSC(sec.heading)}*` });
    for (const line of sec.lines || []) {
      lines.push(scLine(line));
    }
  }
  return buildBox(toSC(title), lines);
}

function listBox(title, items = []) {
  const lines = items.map(item => scLine(item));
  return buildBox(toSC(title), lines);
}

// closeBoxRight: no-op (open-box style, no right borders)
// Kept for backward compat — just returns text unchanged
function closeBoxRight(text) {
  const lines = text.split("\n");
  const out = [];
  for (const l of lines) {
    const t = l.trim();
    // Strip existing right borders if any
    if (t.endsWith("╮")) {
      out.push(l.replace(/╮$/, ""));
    } else if (t.endsWith("╯")) {
      out.push(l.replace(/╯$/, ""));
    } else if (t.endsWith("┤")) {
      out.push(l.replace(/┤$/, ""));
    } else if (t.endsWith("") && !t.startsWith("") && l.trim() !== "") {
      out.push(l.replace(/│$/, ""));
    } else {
      out.push(l);
    }
  }
  return out.join("\n");
}

// ═══════════════════════════════════════════════
// NAV BUTTONS
// ═══════════════════════════════════════════════

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  couple: "Couple", "confess menfess": "Confess & Menfess",
  canvas: "Canvas", tools: "Tools", rpg: "RPG", "rpg couple": "RPG Couple",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
  anime: "Anime", asupan: "Asupan", clan: "Clan", convert: "Convert",
  downloader: "Downloader", education: "Education", food: "Food",
  future: "Future", islami: "Islami", islamic: "Islamic", menu: "Menu",
  maker: "Maker", news: "News", nsfw: "NSFW", linode: "Linode",
  primbon: "Primbon", cecan: "Cecan", stalker: "Stalker", jkt48: "JKT48", airich: "AI Rich", tts: "TTS",
  vps: "VPS",
};

const CATEGORY_EMOJIS = {
  ai: "🧠", sticker: "🖼️", download: "📥", fun: "🎮", jkt48: "🌸", airich: "✨", couple: "💕", "confess menfess": "💌",
  canvas: "🎨", tools: "🛠️", rpg: "🎯", "rpg couple": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
  anime: "🎌", asupan: "", clan: "⚔️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍜",
  future: "🔮", islami: "🕌", islamic: "🕌", menu: "📋",
  maker: "", news: "📰", nsfw: "🔞", linode: "☁️",
  primbon: "🔮", cecan: "👧", stalker: "🔎", tts: "🔊",
  vps: "🖥️",
};

// ═══════════════════════════════════════════════
// novaInfoBox — Info box simpel (╭│╰ kiri, tanpa cabang ├──)
// Untuk notifikasi, welcome, AI reply, dll
// ═══════════════════════════════════════════════
/**
 * @param {string} title - Header title (auto smallcaps)
 * @param {Array<{label: string, value: string}>|Array<string>} items - Content
 *   - {label, value} → "│ Label     value" (label di-pad ke kanan)
 *   - string → "│ string" (plain line)
 *   - "---" → separator line
 * @param {object} opts - { sc: true }
 * @returns {string}
 */
function novaInfoBox(title, items = [], opts = {}) {
  // REWORK 2026-09-07 (owner): tanpa garis/padding — header 「 ✦ Title ✦ 」,
  // isi polos, kv pakai "• label : value". Padding kolom padEnd lama bikin
  // gap kosong, border ╭╰│ bikin wrap WA keliatan putus — semua dicabut.
  const useSC = opts.sc !== false;
  const hdr = useSC ? toSC(title) : title;
  let out = `「 ✦ ${hdr} ✦ 」\n`;
  for (const item of items) {
    if (item === "---" || item === "─") { out += "\n"; continue; }
    if (typeof item === "string") {
      out += (useSC ? toSC(item) : item) + "\n";
      continue;
    }
    if (item && item.label !== undefined) {
      const label = useSC ? toSC(item.label) : item.label;
      const value = item.value !== undefined ? String(item.value) : "";
      out += `• ${label} : ${value}\n`;
    }
  }
  return out.replace(/\n+$/, "");
}

// ═══════════════════════════════════════════════
// novaMenuLayout — Menu design baru (continuous flow)
// 「 ✦ Info ✦ 」     ← open
// │ • Label : value     ← info bullet
// ╰─「 CategoryName 」   ← close + next section
// │
// ├ .command           ← command item
// └────  •  ────        ← final close
// ═══════════════════════════════════════════════
/**
 * @param {object} opts
 * @param {string} opts.infoTitle - Info section title (default: "Info")
 * @param {Array} opts.info - Info items. String = plain line, {label, value} = bullet
 * @param {Array<{name: string, commands: string[]}>} opts.categories - Category sections
 * @param {string} opts.prefix - Command prefix (default: ".")
 * @param {boolean} opts.sc - Apply smallcaps (default: true)
 * @returns {string}
 */
// ═══════════════════════════════════════════════
// novaInfoSections — render info array jadi BOX TERPISAH per section
// String = judul section (buka box baru), {label,value} = baris info.
// Alignment label dihitung PER SECTION biar rapi.
// ═══════════════════════════════════════════════
function novaInfoSections(info = [], sc = true) {
  // FIX 2026-09-07 (owner: "kok ada space di info section, harusnya rapat
  // gak ada spasi kliatan kosong") — versi lama padEnd label ke lebar
  // label TERPANJANG per section (mis. "Grup Mode" 9 char), jadi label
  // pendek (Nama, Role) dapat 5-6 spasi kosong sebelum ":". Dihapus total:
  // label langsung diikuti " : " tanpa padding, rapat konsisten semua baris.
  const scFn = sc ? toSC : (s) => String(s);
  let out = "";
  let open = false;

  for (let i = 0; i < info.length; i++) {
    const item = info[i];
    if (typeof item === "string") {
      const s = item.trim();
      if (!s) continue;
      if (open) out += `\n`;
      out += `「 ✦ ${scFn(s)} ✦ 」\n`;
      open = true;
    } else if (item && item.label !== undefined && open) {
      const label = scFn(item.label);
      const value = item.value !== undefined && item.value !== null ? String(item.value) : "";
      out += `• ${label} : ${value}\n`;
    }
  }
  return out;
}

function novaMenuLayout({ intro = null, introTitle = "Nova", infoTitle = "Info", info = [], categories = [], prefix = ".", sc = true, readMoreBeforeCategories = false, legend = null, footerName = null } = {}) {
  const scFn = sc ? toSC : (s) => String(s);
  
  let out = "";
  
  // ── Intro section (opsional) ──
  // REWORK 2026-09-07 (owner: hapus garis, pertahankan 「 title 」):
  // tanpa border │/╭─/╰────, WhatsApp wrap sendiri gak ada garis yang
  // bisa putus — teks mengalir natural tanpa wrapLine 30-char.
  if (intro) {
    out += `「 ✦ ${scFn(introTitle)} ✦ 」\n`;
    // intro bisa string (multi-line) atau array of lines
    const introLines = Array.isArray(intro) ? intro : intro.split("\n");
    for (const line of introLines) {
      if (line === "" || line === " ") {
        out += `\n`;
      } else {
        // FIX 2026-09-07 (owner: hapus garis nyangkut/border keputus di
        // pesan intro) — greeting AI bisa sampai ~300 karakter/45 kata
        // dalam SATU baris tanpa \n. Kalau ditulis langsung "│ ${line}",
        // WhatsApp yang wrap sendiri di client TANPA prefix "" di baris
        // lanjutan → border kelihatan putus/nyangkut (corner ╭ doang di
        // atas, teks lanjutan nempel kiri tanpa border). Guard: wrapLine
        // dulu (≤30 char/baris) baru tiap baris hasil wrap dapet "│ ".
        out += `${scFn(line)}\n`;
      }
    }
    out += `\n`;
  }
  
  // ── Info section: BOX TERPISAH per kategori (Info User, Info Waktu, dst) ──
  const infoOut = novaInfoSections(info, sc);
  out += infoOut;
  if (infoOut) out += "\n";

  // ── Legend symbol akses fitur (request owner) ──
  if (legend && legend.length > 0) {
    out += `「 ✦ ${scFn("Keterangan Symbol")} ✦ 」\n`;
    for (const l of legend) {
      if (l && l.sym) out += `• ${l.sym} : ${scFn(l.desc || "")}\n`;
    }
    out += `\n`;
  }

  // ── Readmore trick: sembunyikan daftar command panjang di balik "Baca Selengkapnya" ──
  // biar pas allmenu dibuka gak langsung wall-of-text, cuma info section yang kelihatan.
  if (readMoreBeforeCategories && categories.length > 0) {
    out += String.fromCharCode(8206).repeat(4001);
  }
  out += `\n`;

  // ── Category sections ──
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const catName = scFn(String(cat.name).toUpperCase());
    
    // Proper close prev + open new section
    if (i > 0) out += `\n`;
    out += `「 ✦ ${catName} ✦ 」\n`;
    
    // Commands: .command polos tanpa symbol ✦ (request owner 10 Sep:
    // "hapus symbol ✦ yg disamping cmd list bkn di title" — ✦ tetap di
    // title 「 ✦ Title ✦ 」, list command polos) + symbol akses di kanan
    for (const cmd of cat.commands) {
      if (cmd && typeof cmd === "object") {
        const sym = cmd.symbols ? ` ${String(cmd.symbols).trim()}` : "";
        out += `${prefix}${cmd.name}${sym}\n`;
      } else {
        out += `${prefix}${cmd}\n`;
      }
    }
  }

  // FIX 20 Sep 2026 (owner: "nama bot disini dihapus aja soalnya udh ada
  // nama bot di fotter akhir") — dulu novaMenuLayout nambah baris nama bot
  // sendiri di akhir body (mis. "ɴᴏᴠᴀ ᴀɪ ᴡʜᴀᴛsᴀᴘᴘ ʙᴏᴛ"), padahal sendMenuCard
  // SUDAH nampilin nama bot di footer kartu ("✦ Nova AI Whatsapp Bot" dekat
  // jam) → dobel. footerName param DIBIARKAN (backward-compat call sites)
  // tapi gak dirender lagi di body.
  void footerName;

  return out;
}


// ═══════════════════════════════════════════════
// novaReply — Standard reply format for all plugins
// 「 ✦ Title ✦ 」
// │
// │ • Label  : value
// │ • Label2 : value2
// │
// │ ✅ Status message
// ╰────  •  ────
// ═══════════════════════════════════════════════
/**
 * @param {object} opts
 * @param {string} opts.title - Reply title (e.g. "YTMP4", "Sticker")
 * @param {Array} opts.info - Key-value items: {label, value}
 * @param {string} opts.status - Status line (e.g. "✅ File berhasil dikirim")
 * @param {string} opts.content - Extra content/caption after status
 * @param {boolean} opts.sc - Apply smallcaps (default: true)
 */
function novaReply({ title = "", info = [], status = "", content = "", sc = true } = {}) {
  const lines = [];
  if (status) {
    // Tambah icon default kalau belum ada icon status di depan
    const hasIcon = /^[✅❌⚠]/.test(status.trim());
    lines.push(hasIcon ? status : `✅ ${status}`);
  }
  if (info && info.length > 0) {
    for (const item of info) {
      if (item && item.label !== undefined) {
        const value = item.value !== undefined ? String(item.value) : "";
        lines.push(`${item.label}: ${value}`);
      }
    }
  }
  if (content) {
    // Bersihkan legacy "|" ASCII pipe prefix (pengganti sebelum ada box-drawing standar)
    const contentLines = String(content).split("\n").map(l => l.replace(/^\|\s*/, ""));
    for (const cl of contentLines) lines.push(cl);
  }
  return buildBox(title || "Nova AI", lines);
}


// React khusus cooldown game: 🕒 — BUKAN 🚫 (🚫 khusus akses ditolak).
// Owner request 2026-09-03: semua pesan cooldown fitur game (minigame/RPG/RPG cinta)
// pakai react 🕒 biar beda jelas dari penolakan akses.
// Gagal react → diem aja (gak pernah fatal).
export async function reactCooldown(m) {
  try {
    if (m && typeof m.react === "function") await m.react("🕒");
  } catch {}
}

export {
  toSC, scLine, isRealEmoji,
  novaInfoBox,
  novaMenuLayout,
  novaInfoSections,
  getAccessSymbols,
  novaReply,
  buildBox, novaCaption,
  botHeader, botSignature, sectionBox,
  progressBar, statusDot, kv,
  categoryBox,
  sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  claraHeader, bracketBox,
  commandListLine, separator, tipText,
  claraWrap, claraLine,
  alyaHeader,
  formatNumber, broadcastFormat,
  novaUsage, infoBox, listBox, closeBoxRight,
  CATEGORY_NAMES, CATEGORY_EMOJIS,
  novaSalah,

};


// ═══════════════════════════════════════════════
// NOVA REPLY — Pesan reply natural & menarik
// ═══════════════════════════════════════════════

const NOVA_REPLIES = {
  empty: [
    "Hmm, kosong nih 🗿 Coba pakai keyword lain yuk!",
    "Yah, gak nemu apa-apa 😵 Mind aku ulang?",
    "Duh, hasilnya kosong 🫠 Coba kata kunci yang lebih spesifik?",
    "Waduh, gak ada hasil nih 🥲 Mungkin coba lagi nanti ya",
  ],
  error: [
    "Yah, ada yang error nih 😵 Coba lagi beberapa detik yuk!",
    "Duh, system-nya lagi ngelag kayaknya 🫠 Ulang lagi ya",
    "Hmm, kayaknya API-nya lagi turun 🥲 Coba lagi nanti",
    "Waduh, gagal terus nih 😭 Sabar ya, coba lagi bentar",
  ],
  notFound: [
    "Gak nemu nih 🧐 Coba kata lain?",
    "Hmm, gak ketemu hasilnya 🫠 Mungkin typo?",
    "Yah, gak ada yang cocok 😵 Coba keyword lain yuk!",
  ],
  noInput: [
    "Eh, input-nya mana nih? Isi dulu dong",
    "Kosong banget, kasih teks/link dong",
    "Bentar, teksnya mana? Jangan lupa diisi ya",
  ],
  noQuoted: [
    "Reply pesannya dong 📿 Bukan komen stand-alone",
    "Eh, reply media yang mau diproses ya 🫠",
    "Harus reply image/sticker/video-nya 🗄️ Coba ulang",
  ],
  cooldown: [
    "Sabar ya, lagi cooldown nih 🐣 Tunggu sebentar lagi",
    "Hmm, terlalu cepat nih 🫠 Tunggu cooldown-nya habis",
  ],
  noPermission: [
    "Khusus owner nih 🚫 Jangan sok asik",
    "Maaf ya, fitur ini cuma buat owner 🫠",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pesan error natural dalam box style
 * @param {string} commandName - nama command
 * @param {string} [detail] - detail error opsional
 */
// REWORK 2026-09-07 (owner: hapus garis di semua reply) — tanpa border,
// isi helper kilat polos, WhatsApp wrap natural.
function boxRows(text) {
  return String(text || "");
}

function novaError(commandName, detail) {
  const title = commandName ? toSC(String(commandName).toUpperCase()) : toSC("ERROR");
  let out = `「 ✦ ${title} ✦ 」\n`;
  out += `❌ ${scLine(detail || "Gagal, coba lagi ya")}\n`;
  return out;
}

/**
 * Pesan kosong/not found natural dalam box style
 * @param {string} commandName - nama command
 * @param {string} [detail] - detail opsional
 */
function novaEmpty(commandName, detail) {
  const title = commandName ? toSC(String(commandName).toUpperCase()) : toSC("KOSONG");
  let out = `「 ✦ ${title} ✦ 」\n`;
  out += `❌ ${scLine(detail || "Kosong, tidak ada data")}\n`;
  return out;
}

/**
 * Pesan "butuh input" natural dalam box style
 * @param {string} commandName - nama command
 * @param {string} [hint] - hint cara pakai
 * @param {string} [example] - contoh command
 */
// REWORK 2026-09-10 (owner): layout section — ⚠ sapaan natural tetap di atas,
// 📝 Cara Pakai (hint) + 💡 Contoh (example VERBATIM).
function novaNoInput(commandName, hint, example) {
  // REWORK 25 Sep — DESAIN V2: frase noInput random jadi sapaan, hint jadi
  // ᴄᴀʀᴀ, example jadi ᴄᴏɴᴛᴏʜ, spec otomatis dari pluginConfig. Game → klasik.
  if (isGameCmd(commandName)) {
    let out = `「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
    out += `⚠ ${scLine(pickRandom(NOVA_REPLIES.noInput))}\n`;
    if (hint && String(hint).trim()) out += `\n📝 ${toSC("Cara Pakai")}:\n${scLine(hint)}\n`;
    if (example) out += `\n💡 ${toSC("Contoh")}:\n${example}\n`;
    return out.replace(/\n+$/, "");
  }
  const name = toSC(String(commandName).toLowerCase());
  let out = `「✧ ${name} ✧」\n`;
  out += `${v2Kaomoji(commandName)} ${name}!!\n`;
  out += `\n${scLine(pickRandom(NOVA_REPLIES.noInput))}\n`;
  if ((hint && String(hint).trim()) || example) {
    if (hint && String(hint).trim()) {
      out += `\n📍 ${toSC("Cara")}: ${scLine(hint)}\n`;
      if (example) out += `${toSC("Contoh")}: ${example}\n`;
    } else if (example) {
      out += `\n📍 ${toSC("Contoh")}: ${example}\n`;
    }
  }
  const spec = v2Spec(commandName);
  if (spec) out += `\n${spec}\n`;
  return out.replace(/\n+$/, "");
}

/**
 * Pesan "reply media dulu" natural
 * @param {string} commandName
 * @param {string} [mediaType] - "image" | "sticker" | "video" | "audio"
 */
function novaNoQuoted(commandName, mediaType) {
  let out = `「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `⚠ ${scLine(pickRandom(NOVA_REPLIES.noQuoted))}\n`;
  if (mediaType) out += scLine(`Butuh: ${mediaType}`) + "\n";
  return out.replace(/\n+$/, "");
}

/**
 * Pesan sukses natural dalam box style
 * @param {string} commandName
 * @param {string} message - pesan sukses
 */
function novaSuccess(commandName, message) {
  const title = commandName ? toSC(String(commandName).toUpperCase()) : toSC("SUKSES");
  let out = `「 ✦ ${title} ✦ 」\n`;
  out += `✅ ${scLine(message || "Berhasil!")}\n`;
  return out.replace(/\n+$/, "");
}

/**
 * Pesan info/guide natural dalam box style
 * @param {string} commandName
 * @param {string} intro - kalimat pembuka natural
 * @param {string} [example] - contoh
 * @param {string} [note] - catatan tambahan
 */
// REWORK 2026-09-10 (owner: "pesan usage sama pesan salah pemakaian beda jgn
// sama" + "klo pesan salah pemakaian dia cm singkat sprti 1 kalimat"):
// reply salah pemakaian SINGKAT (1-2 kalimat), TANPA header box & TANPA
// section 📝/💡 — beda total dari layout usage. Cuma:
//   ❗ cara pemakaian salah (+pesan singkat opsional) + arahan ketik .<cmd>.
// ─── DESAIN V2 GLOBAL (owner 25 Sep: "semua plugin diterapin dr ai sampai
// plugin owner diubah usage dan pesan eror cmd") — novaGuide/novaNoInput/
// novaSalah otomatis render kartu kaomoji V2. Isi teks (intro/contoh/note)
// PER-PLUGIN TETAP UTUH — yang generik cuma bingkai. Guard kategori:
// game/minigame/rpg/rpg-cinta JANGAN pake desain ini (owner 25 Sep: "klo
// usage fitur game minigame, rpg, rpg cinta mngkin agak berbeda jgn
// diterapin desain mirip sprti dibuat khusus msing2") — mereka pakai
// novaGameBox/kartu khas sendiri; fallback ke render klasik.
// owner 25 Sep (revisi): "hapus emoji android, aku mau cm emoji cutenya
// doang" — kaomoji TANPA emoji unicode di sebelahnya (emoji standar
// keliatan gaya Android di HP owner). Cuma buat KARTU USAGE (V2 pool ini);
// persona AI/fitur inti JANGAN disentuh. Revisi lanjutan: symbol bunga ✿
// dihapus juga — gak melambangkan apa-apa (owner: "klo g penting dihapus
// aja symbol bunganya"), muka kaomoji cukup kurung + mata + mulut.
const V2_KAOMOJI_POOL = [
  "ヾ(≧▽≦*)o", "(๑•̀ㅂ•́)و✧", "(•̀ᴗ•́)و", "(◕ᴗ◕)", "(๑˃ᴗ˂)ﻭ",
  "(¬‿¬)", "(๑ᵔ⤙ᵔ๑)", "(≧▽≦)", "(◍•ᴗ•◍)", "(≧∇≦)ﾉ",
  "(⌒‿⌒)", "(๑˘ᘿ˂๑)", "(ᵔ◡ᵔ)", "(◕‿◕)", "(≧ω≦)",
  "(๑´ㅂ`๑)", "(˶ᵔ ᵕ ᵔ˶)", "(๑˃̵ᴗ˂̵)و", "(◍'◡'◍)", "(๑>ᴗ<)و",
  "(・∀・)", "(≧◡≦) ♡", "(๑ᵔ⤙ᵔ๑)♡", "(•‿•)", "(¬‿¬)✧",
];
function v2Kaomoji(name) {
  const key = String(name || "x").toLowerCase();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return V2_KAOMOJI_POOL[h % V2_KAOMOJI_POOL.length];
}
// spec dari pluginConfig ASLI (registry nova-plugins) — fakta nyata, bukan karangan
function v2Spec(commandName) {
  try {
    const key = String(commandName || "").toLowerCase().replace(/\s+/g, "");
    const pl = getPlugin(key) || getPlugin(String(commandName || "").toLowerCase());
    if (!pl) return null;
    const items = [];
    const energi = Number(pl.energi);
    if (energi > 0) items.push(`⚡ ${toSC("energi")} ${energi}`);
    const cd = Number(pl.cooldown);
    if (cd > 0) items.push(`⏱ ${cd}${toSC("dtk")}`);
    if (!pl.isPremium) items.push(`💸 ${toSC("gratis")}`);
    return items.length ? items.join(" • ") : null;
  } catch { return null; }
}
const V2_GAME_CATS = new Set(["game", "rpg", "rpgcinta", "rpg-cinta", "rpg-couple"]);
function isGameCmd(commandName) {
  try {
    const pl = getPlugin(String(commandName || "").toLowerCase());
    return !!pl && V2_GAME_CATS.has(String(pl.category || "").toLowerCase());
  } catch { return false; }
}
// render klasik 「 ✦ 」 — fallback game + kompat
function novaGuideClassic(commandName, intro, example, note) {
  let out = `「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  if (intro && String(intro).trim()) out += `📝 ${toSC("Cara Pakai")}:\n${scLine(intro)}\n`;
  if (example) out += `\n💡 ${toSC("Contoh")}:\n${example}\n`;
  if (note) {
    const nl = String(note).split("\n").map((l) => l.trim()).filter(Boolean);
    out += `\n📍 ${scLine(nl[0])}\n`;
    if (nl.length > 1) out += nl.slice(1).map((l) => scLine(l)).join("\n") + "\n";
  }
  return out.replace(/\n+$/, "");
}

function novaSalah(commandName, message) {
  // REWORK 25 Sep (owner: pesan salah cmd versi cute "yah kak kakak ketik
  // cmd yang salah, ulangi ketik ...") — kaomoji + kalimat custom caller
  // + ➤ arahan singkat. Game category tetap format lama (khas game).
  if (isGameCmd(commandName)) {
    let out = `❗ ${toSC("Cara pemakaian salah")}`;
    if (message && String(message).trim()) out += ` — ${scLine(message)}`;
    out += `\n${scLine(`Ketik .${String(commandName).toLowerCase()} buat lihat cara pemakaian`)}`;
    return out.replace(/\n+$/, "");
  }
  let out = `(>_<) ${toSC("yah kak")}...\n`;
  if (message && String(message).trim()) out += `${scLine(message)}\n`;
  out += `➤ ${scLine(`ulangi ketik .${String(commandName).toLowerCase()} ya`)}`;
  return out.replace(/\n+$/, "");
}

// REWORK 2026-09-10 (owner: "terapin ke semua usage" — layout section kayak
// AI/DL usage): 📝 Cara Pakai + 💡 Contoh + ⚠ catatan DETAIL di bawah contoh.
// Example & command VERBATIM; intro/note di-smallcaps (URL aman via scLine).
function novaGuide(commandName, intro, example, note) {
  // REWORK 25 Sep — SEMUA plugin non-game otomatis ke DESAIN V2 kaomoji
  // (owner: "semua plugin diterapin dr ai sampai plugin owner diubah usage
  // dan pesan eror cmd"). Intro per-plugin jadi sapaan; contoh VERBATIM;
  // note di-smallcaps; spec dari pluginConfig asli (fakta nyata).
  // Game/minigame/rpg/rpg-cinta → render klasik (desain khas game sendiri).
  if (isGameCmd(commandName)) return novaGuideClassic(commandName, intro, example, note);
  const name = toSC(String(commandName).toLowerCase());
  let out = `「✧ ${name} ✧」\n`;
  out += `${v2Kaomoji(commandName)} ${name}!!\n`;
  if (intro && String(intro).trim()) out += `\n${scLine(intro)}\n`;
  if (example || note) {
    const exLines = String(example || "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (exLines.length) out += `\n📍 ${toSC("Contoh")}: ${exLines.join(" · ")}\n`;
    if (note) {
      const nl = String(note).split("\n").map((l) => l.trim()).filter(Boolean);
      if (nl.length) out += nl.map((l) => scLine(l)).join("\n") + "~\n";
    }
  }
  const spec = v2Spec(commandName);
  if (spec) out += `\n${spec}\n`;
  return out.replace(/\n+$/, "");
}

export { novaError, novaEmpty, novaNoInput, novaNoQuoted, novaSuccess, novaGuide, pickRandom };

// ═══════════════════════════════════════════════
// Pesan status universal (request owner):
// berhasil → "Berhasil kak 🥳"
// gagal → "Yah gagal kak, coba lagi 😩"
// fitur gangguan → "Yah fiturnya lagi gangguan kak, coba lain waktu ya 😥"
// ═══════════════════════════════════════════════
export function novaBerhasil(fitur = "Berhasil") {
  return "Berhasil kak 🥳";
}

export function novaGagal(fitur = "Gagal") {
  return "Yah gagal kak, coba lagi 😩";
}

export function novaGangguan(fitur = "Error") {
  return "Yah fiturnya lagi gangguan kak, coba lain waktu ya 😥";
}

// ═══════════════════════════════════════════════
// novaBox — Universal box builder dengan right border konsisten
// ═══════════════════════════════════════════════
/**
 * Build box dengan header + body + footer, right border konsisten.
 * @param {string} header - Title (akan di-smallcaps)
 * @param {Array} lines - Body lines. String untuk content, "---" untuk separator, {sub: "Title"} untuk sub-header
 * @param {object} opts - { sc: true (default, smallcaps), padding: 1 }
 * @returns {string} Box text siap dikirim
 */
// novaAiUsage — DESAIN USAGE AI ala owner (10 Sep 2026):
// 「 ✦ Gemini ✦ 」 + 📝 Cara Pakai + 💡 Contoh + ✨ Model aktif +
// 📋 daftar model tersedia (satu model per baris).
// Label di-smallcaps (aturan owner); command + nama model VERBATIM —
// identifier yang harus bisa diketik user persis (prinsik "URL tetap persis").
// novaDlUsage — DESAIN USAGE DOWNLOADER ala owner (10 Sep 2026, revisi
// "setiap fitur beda layout jgn smuanya sama"): layout kategori DOWNLOADER
// beda dari usage AI — 「 ✦ Play ✦ 」 + 📝 Cara Pakai + 💡 Contoh doang,
// tanpa section model. Label smallcaps; command VERBATIM (bisa diketik persis).
export function novaDlUsage(brand, { prefix = ".", command, cara = null, contoh = null } = {}) {
  const cmd = `${prefix}${command || brand}`;
  const caraLines = (Array.isArray(cara) && cara.length ? cara : [`${cmd} [judul]`]).map(String);
  const contohLines = (Array.isArray(contoh) && contoh.length ? contoh : [`${cmd} Faded Alan Walker`]).map(String);
  const lines = [
    `📝 ${toSC("Cara Pakai")}:`,
    ...caraLines,
    "",
    `💡 ${toSC("Contoh")}:`,
    ...contohLines,
  ];
  return novaBox(brand, lines);
}

// novaGuideV2 — DESAIN USAGE BARU ala owner (25 Sep 2026, sesi "desain
// kaomoji lucu"): 「✧ ɴᴀᴍᴀ ✧」 + kaomoji semangat + sapaan ajakan 1 baris +
// 📍 baris ᴄᴀʀᴀ/ᴄᴏɴᴛᴏʜ/ɴᴏᴛᴇ mengalir (note = kalimat panduan natural per
// fitur) + (KHUSUS AI, request owner 25 Sep "usage kyk ai mngkin ada tmbahan
// kyk field model yg dipakai dan yg tersedianya") ✨ model aktif + 📋 model
// tersedia + baris spec ⚡⏱💸 (CUMA fakta nyata plugin — item gak ada dilewati,
// gak ada fakta = baris gak muncul). Kaomoji + sapaan DITULIS MANUAL per
// fitur, dan WAJIB BEDA antar plugin (owner 25 Sep: "tiap plugin
// sapaannya beda beda g sama") — jangan pakai kaomoji/sapaan plugin lain —
// novaGuide/novaDlUsage/novaAiUsage lama TETAP dipakai plugin belum dimigrasi.
// novaSalahV2 — REPLY SALAH PEMAKAIAN versi cute (owner 25 Sep: "hrs kirim
// pesan salah cmd kyk 'yah kak kakak ketik cmd yang salah, ulangi ketik
// .play nama lagu'"): kaomoji lucu + "ʏᴀʜ ᴋᴀᴋ..." + kalimat cute smallcaps
// (WAJIB custom & beda-beda per plugin) + ➤ contoh yang bener VERBATIM.
// SINGKAT 3 baris — beda total dari kartu usage novaGuideV2 (aturan owner
// 10 Sep: salah pemakaian singkat, usage detail).
export function novaSalahV2(commandName, opts = {}) {
  const {
    kaomoji = "(>_<)",
    pesan = "kakak ketik cmd yang salah, ulangi ketik yang bener ya~",
    contoh = "",
  } = opts;
  let out = `${kaomoji} ${toSC("yah kak")}...\n`;
  out += `${scLine(pesan)}\n`;
  if (contoh) out += `➤ ${contoh}\n`;
  return out.replace(/\n+$/, "");
}

export function novaGuideV2(commandName, opts = {}) {
  const {
    kaomoji = "ヾ(≧▽≦*)o 😆", sapaan = "", cara = "", contoh = "", note = "",
    modelAktif = null, models = [], spec = [], extra = [],
  } = opts;
  const name = toSC(String(commandName).toLowerCase());
  let out = `「✧ ${name} ✧」\n`;
  out += `${kaomoji} ${name}!!\n`;
  if (sapaan && String(sapaan).trim()) out += `\n${scLine(sapaan)}\n`;
  if (cara || contoh || note) {
    out += `\n📍 ${toSC("Cara")}: ${scLine(cara)}\n`;
    if (contoh) out += `${toSC("Contoh")}: ${contoh}\n`;
    if (note) {
      const nl = String(note).split("\n").map((l) => l.trim()).filter(Boolean);
      if (nl.length) out += nl.map((l) => scLine(l)).join("\n") + "~\n";
    }
  }
  if (Array.isArray(extra) && extra.length) {
    out += `\n${extra.map(String).join("\n")}\n`;
  }
  if (modelAktif) out += `\n✨ ${toSC("Model aktif")}: ${modelAktif}\n`;
  if (Array.isArray(models) && models.length) {
    out += `📋 ${toSC("Model tersedia")}: ${models.map(String).join(" · ")}\n`;
  }
  if (Array.isArray(spec) && spec.length) out += `\n${spec.map((x) => scLine(x)).join(" • ")}\n`;
  return out.replace(/\n+$/, "");
}

export function novaAiUsage(brand, { prefix = ".", command, modelAktif = null, models = [], extra = [] } = {}) {
  // REWORK 25 Sep — kartu usage AI → DESAIN V2 kaomoji + emoji muka cute
  // (owner: mulai dr AI dulu). Model & extra VERBATIM. Game → novaBox lama.
  if (isGameCmd(brand)) {
    const cmdL = `${prefix}${command || brand}`;
    const linesL = [
      `📝 ${toSC("Cara Pakai")}:`,
      `${cmdL} [pertanyaan]`,
      "",
      `💡 ${toSC("Contoh")}:`,
      `${cmdL} apa itu AI?`,
    ];
    if (modelAktif) linesL.push("", `✨ ${toSC("Model")}:`, modelAktif);
    if (Array.isArray(models) && models.length) {
      linesL.push("", `📋 ${toSC("Model Tersedia")}:`);
      for (const mdl of models) linesL.push(String(mdl));
    }
    for (const l of extra) linesL.push("", l);
    return novaBox(brand, linesL);
  }
  const cmd = `${prefix}${command || brand}`;
  const name = toSC(String(brand).toLowerCase());
  let out = `「✧ ${name} ✧」\n`;
  out += `${v2Kaomoji(brand)} ${name}!!\n`;
  out += `\n📍 ${toSC("Cara")}: ${cmd} [pertanyaan]\n`;
  out += `${toSC("Contoh")}: ${cmd} apa itu AI?\n`;
  if (modelAktif) out += `\n✨ ${toSC("Model aktif")}: ${modelAktif}\n`;
  if (Array.isArray(models) && models.length) {
    out += `\n📋 ${toSC("Model tersedia")}:\n`;
    for (const mdl of models) out += `${mdl}\n`;
  }
  if (Array.isArray(extra) && extra.length) out += `\n${extra.map(String).join("\n")}\n`;
  const spec = v2Spec(command || brand);
  if (spec) out += `\n${spec}\n`;
  return out.replace(/\n+$/, "");
}

export function novaBox(header, lines = [], opts = {}) {
  // REWORK 2026-09-07 (owner: hapus garis di semua reply) — sama seperti
  // buildBox: header 「 ✦ Title ✦ 」, isi polos, sub-header 「 sub 」,
  // tanpa footer, tanpa wrapLine. opts.border jadi moot (semua jalur sama).
  const useSC = opts.sc !== false;
  const hdr = useSC ? toSC(header) : header;
  let out = `「 ✦ ${hdr} ✦ 」\n`;
  for (const l of lines) {
    if (l === "---" || l === "─") { out += "\n"; continue; }
    if (typeof l === "object" && l.sub) {
      out += `「 ${useSC ? toSC(l.sub) : l.sub} 」\n`;
      continue;
    }
    if (!l || !String(l).trim()) { out += "\n"; continue; }
    // rata kiri: buang spasi/tab di awal baris isi (owner 20 Sep 2026)
    out += String(l).replace(/^[ \t]+/, "") + "\n";
  }
  return out.replace(/\n+$/, "");
}
