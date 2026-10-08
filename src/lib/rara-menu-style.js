// === Rara AI Menu Style (v8 — Unified Box) ===
//
// GUARD RATA KIRI (request owner 2026-09-07): body box WAJIB dibungkus
// wrapText dari lib/styler.js (≤30 char/baris + potong paksa kata/URL
// panjang). Dulu wrapLine motong di 60 char — lebih lebar dari layar HP,
// WhatsApp melipat sisanya TANPA prefix "│ " → teks nabrak border kiri.
import { wrapText as guardWrapText } from "./styler.js";
import { getPlugin } from "./rara-plugins.js";

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
const SC_MAP = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};

// toSC: convert a-zA-Z → smallcaps, sisanya tetap
// UPDATE OWNER 1 Okt 2026: toSC passthrough — teks keluar bot jadi teks biasa.
const toSC = (s) => String(s);

// scLine: apply smallcaps to text content, tapi preserve:
// - box drawing chars (╭╮╰╯│├─┊┃━)
// - emoji & special symbols (📌💡⚠️🐦 dll)
// - markdown markers (* ` _)
// - URLs (http/https jangan di-convert)
// - numbers
// - leading │ prefix
// Wrap konten box per kata supaya WhatsApp gak hard-wrap acak di tengah
// baris — lanjutan baris tetap pakai prefix │ biar box keliatan rapi.
const BOX_WRAP_WIDTH = 30; // GUARD: 60 kelebaran — WA fold di ~30-35, sisanya tembus border kiri

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

// LEBAR SERAGAM KARTU USAGE (owner 1 Okt 2026: "aku mau semua pesan menu
// gelembung ukuran lebarnya standarnya kyk menu allmenu" — kartu usage V2
// (.aicard, .voipcall, dst) gelembungnya LEBIH LEBAR dari allmenu karena
// kalimat sapaan/cara/note dikirim sebagai SATU baris fisik panjang tanpa
// \n — WhatsApp yang hard-wrap sendiri gak konsisten lebarnya antar pesan.
// FIX: potong manual ≤ BOX_WRAP_WIDTH char/baris SEBELUM dikirim (persis
// lebar yang dipakai box lain), biar lebar gelembung SERAGAM/standar kayak
// allmenu — tanpa gantung ke wrap natural WhatsApp. URL dibiarkan utuh satu
// baris sendiri (gak dipotong paksa) biar tetap bisa diklik. KECUALI fitur
// game (request owner "kecuali game gpp") — caller WAJIB skip lewat
// isGameCmd sebelum pakai ini (sudah digabung di raraGuide/raraGuideV2/
// raraAiUsage non-game branch).
function wrapParagraph(text, width = BOX_WRAP_WIDTH) {
  const str = String(text ?? "");
  if (!str.trim()) return str;
  const out = [];
  for (const raw of str.split("\n")) {
    let line = "";
    for (const word of raw.split(/\s+/).filter(Boolean)) {
      if (/^https?:\/\//i.test(word)) {
        if (line) { out.push(line); line = ""; }
        out.push(word); // URL utuh, gak dipotong paksa
        continue;
      }
      if ((line + " " + word).trim().length > width) {
        if (line) out.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) out.push(line);
  }
  return out.join("\n");
}

// scWrap: wrapParagraph + smallcaps dalam satu panggilan. Baris pendek
// (≤ width) gak berubah tampilannya sama sekali — cuma baris panjang yang
// kepotong jadi beberapa baris. Aman dipakai gantiin scLine di mana pun
// konten berupa kalimat prosa (sapaan/cara/note), BUKAN command verbatim.
const scWrap = (text, width = BOX_WRAP_WIDTH) => scLine(wrapParagraph(text, width));

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
  // raraWrap/raraReply/raraCaption/bracketBox → SEMUA reply plugin kebagian.
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

// raraCaption: caption panduan pakai fitur (no-input guide) — pakai buildBox modern style
function raraCaption({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
  // REVISI OWNER 3 Okt 2026: balik desain lama — selalu layout klasik (tanpa kaomoji). Non-game tetap
  // dapat blok info registry di bawah supaya field lengkap.
  let out = raraCaptionClassic({ emoji, name, description, usage, example, note });
  if (!isGameCmd(name)) {
    const info = v2InfoBlock(name);
    if (info) out += `\n\n${info}`;
  }
  return out.replace(/\n+$/, "");
}
// render box lama — fallback game + kompat
function raraCaptionClassic({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
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

function raraHeader(title, emoji = "") {
  if (isRealEmoji(emoji)) return `「 ✦ ${emoji} ${toSC(title)} ✦ 」`;
  return `「 ✦ ${toSC(title)} ✦ 」`;
}

function bracketBox(emoji, label, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  return buildBox(`${emojiStr}${toSC(label)}`, lines);
}

// getAccessSymbols — symbol akses fitur dari config plugin (shared, request owner). Urutan: r f Ⓟ Ⓛ u o (R F P L U O):
// Ⓤ User (semua user), Ⓕ Free (quota gratis), Ⓟ Premium, Ⓞ Owner,
// Ⓛ Limit (akses fitur — BUKAN energi game), r Register (wajib .daftar — RPG), Ⓐ Admin, Ⓖ Grup
function getAccessSymbols(cfg) {
  if (!cfg) return "";
  // Khusus owner → satu symbol saja
  if (cfg.isOwner) return " Ⓞ";
  // Urutan owner (konfirmasi): r f Ⓟ Ⓛ u o → R F P L U O
  const symbols = [];
  const cat = String(cfg.category || "");
  const gameCtx = ["rpg", "game", "rpg couple"].includes(cat);
  // r Register (wajib .daftar — RPG) — PALING DEPAN
  if (cat === "rpg") symbols.push("r");
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

function raraWrap(title, body, type = "info") {
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

  // REVISI OWNER 3 Okt 2026: kartu guide balik desain lama — 「 ✦ JUDUL ✦ 」 + isi apa adanya (tanpa kaomoji).
  // Non-game tetap dapat blok info registry (kategori/akses/tempat/cooldown/alias) di bawah supaya field lengkap.
  if (type === "guide" && !isGameCmd(title)) {
    let gout = buildBox(title, lines);
    const ginfo = v2InfoBlock(title);
    if (ginfo) gout = `${String(gout).replace(/\n+$/, "")}\n\n${ginfo}`;
    return gout;
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

function raraLine(title, text) {
  return String(text || "");
}

const alyaHeader = raraHeader;

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function broadcastFormat({ botName = "Rara AI", senderName = "Owner", message, type = "group" }) {
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

// raraUsage: pesan usage yang menarik dengan emoji labels
function raraUsage(commandName, { steps = [], example = "", note = "", emoji = "" } = {}) {
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
  tools: "Tools", rpg: "RPG", "rpg couple": "RPG Couple",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info",
  berita: "Berita", cuaca: "Cuaca & Bencana", loker: "Lowongan Kerja",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", promotion: "Promotion",
  panel: "Panel", owner: "Owner", store: "Store", "sewa premium": "Sewa & Premium", bot: "Bot",
  anime: "Anime", asupan: "Asupan", clan: "Clan", convert: "Convert",
  downloader: "Downloader", education: "Education", food: "Food",
  future: "Future", islami: "Islami", islamic: "Islamic", menu: "Menu",
  maker: "Maker", news: "News", nsfw: "NSFW", linode: "Linode",
  primbon: "Primbon", cecan: "Cecan", stalker: "Stalker", jkt48: "JKT48", tts: "TTS",
  vps: "VPS",
};

const CATEGORY_EMOJIS = {
  ai: "🧠", sticker: "🖼️", download: "📥", fun: "🎮", jkt48: "🌸", couple: "💕", "confess menfess": "💌",
  tools: "🛠️", rpg: "🎯", "rpg couple": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", promotion: "📣",
  panel: "🖥️", owner: "👑", store: "🛒", "sewa premium": "💳", bot: "🚀",
  anime: "🎌", asupan: "", clan: "⚔️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍜",
  future: "🔮", islami: "🕌", islamic: "🕌", menu: "📋",
  maker: "", news: "📰", nsfw: "🔞", linode: "☁️",
  primbon: "🔮", cecan: "👧", stalker: "🔎", tts: "🔊",
  berita: "📰", cuaca: "🌦️", loker: "💼",
  vps: "🖥️",
};

// ═══════════════════════════════════════════════
// raraInfoBox — Info box simpel (╭│╰ kiri, tanpa cabang ├──)
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
function raraInfoBox(title, items = [], opts = {}) {
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
// raraMenuLayout — Menu design baru (continuous flow)
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
// raraInfoSections — render info array jadi BOX TERPISAH per section
// String = judul section (buka box baru), {label,value} = baris info.
// Alignment label dihitung PER SECTION biar rapi.
// ═══════════════════════════════════════════════
function raraInfoSections(info = [], sc = true, opts = {}) {
  // CUTE REWORK 2 Okt 2026 (owner: "diberi jarak tdk berdempet") — opsi
  // headerGap: baris kosong setelah judul 「 ✦ X ✦ 」 biar isi gak nempel
  // judul (dipakai menu; kartu reply kecil default rapat tetap).
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
      out += `「 ✦ ${scFn(s)} ✦ 」\n${opts.headerGap ? "\n" : ""}`;
      open = true;
    } else if (item && item.label !== undefined && open) {
      const label = scFn(item.label);
      const value = item.value !== undefined && item.value !== null ? String(item.value) : "";
      out += `${opts.bullet === false ? "" : "• "}${label} : ${value}\n`;
    }
  }
  return out;
}

function raraMenuLayout({ intro = null, introTitle = "Rara", infoTitle = "Info", info = [], categories = [], prefix = ".", sc = true, readMoreBeforeCategories = false, legend = null, footerName = null, infoBullet = false, categoryBoxStyle = false } = {}) { // infoBullet default OFF (owner 2 Okt) — titik bullet info section dihapus di semua menu; categoryBoxStyle (owner 8 Okt) — kotak ╭『 』ᯓ╰ khusus allmenu
  const scFn = sc ? toSC : (s) => String(s);
  
  let out = "";
  
  // ── Intro section (opsional) ──
  // REWORK 2026-09-07 (owner: hapus garis, pertahankan 「 title 」):
  // tanpa border │/╭─/╰────, WhatsApp wrap sendiri gak ada garis yang
  // bisa putus — teks mengalir natural tanpa wrapLine 30-char.
  if (intro) {
    // REVISI OWNER 3 Okt 2026: balik desain lama — header 「 ✦ Judul ✦ 」, tanpa kaomoji intro.
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
  // REVISI OWNER 3 Okt 2026: balik desain lama — judul 「 ✦ X ✦ 」 sebagai pembatas field, tanpa divider ♡
  // dan tanpa jarak ekstra setelah judul.
  const infoOut = raraInfoSections(info, sc, { bullet: infoBullet });
  out += infoOut;
  if (infoOut) out += "\n";

  // ── Legend symbol akses fitur (request owner) ──
  if (legend && legend.length > 0) {
    out += `「 ✦ ${scFn("Keterangan Symbol")} ✦ 」\n`;
    for (const l of legend) {
      if (l && l.sym) out += `${l.sym} : ${scFn(l.desc || "")}\n`;
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
  // GAYA BOX (owner 8 Okt 2026 — request "ubah gaya allmenu"): tiap kategori
  // jadi kotak terpisah ala template klasik — header ╭─『 Nama 』, command
  // bullet ᯓ, footer ╰. Khusus allmenu (categoryBoxStyle: true); .menu &
  // index kategori tetap gaya 「 ✦ 」 lama.
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const catName = scFn(String(cat.name).toUpperCase());

    // Proper close prev + open new section
    if (i > 0) out += `\n`;

    if (categoryBoxStyle) {
      out += `╭─────『 ${catName} 』\n`;
      for (const cmd of cat.commands) {
        if (cmd && typeof cmd === "object") {
          const sym = cmd.symbols ? ` ${String(cmd.symbols).trim()}` : "";
          out += `    ᯓ ${prefix}${cmd.name}${sym}\n`;
        } else {
          out += `    ᯓ ${prefix}${cmd}\n`;
        }
      }
      out += `╰────────────√\n`;
      continue;
    }

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
  // nama bot di fotter akhir") — dulu raraMenuLayout nambah baris nama bot
  // sendiri di akhir body (mis. "rara ai whatsapp bot"), padahal sendMenuCard
  // SUDAH nampilin nama bot di footer kartu ("✦ Rara AI - Multi Device" dekat
  // jam) → dobel. footerName param DIBIARKAN (backward-compat call sites)
  // tapi gak dirender lagi di body.
  void footerName;

  return out;
}


// ═══════════════════════════════════════════════
// raraReply — Standard reply format for all plugins
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
function raraReply({ title = "", info = [], status = "", content = "", sc = true } = {}) {
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
  return buildBox(title || "Rara AI", lines);
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
  raraInfoBox,
  raraMenuLayout,
  raraInfoSections,
  getAccessSymbols,
  raraReply,
  buildBox, raraCaption,
  botHeader, botSignature, sectionBox,
  progressBar, statusDot, kv,
  categoryBox,
  sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  raraHeader, bracketBox,
  commandListLine, separator, tipText,
  raraWrap, raraLine,
  alyaHeader,
  formatNumber, broadcastFormat,
  raraUsage, infoBox, listBox, closeBoxRight,
  CATEGORY_NAMES, CATEGORY_EMOJIS,

};


// ═══════════════════════════════════════════════
// RARA REPLY — Pesan reply natural & menarik
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

function raraError(commandName, detail) {
  // REVISI OWNER 3 Okt 2026: balik desain lama (tanpa kaomoji) — 「 ✦ NAMA ✦ 」 + ❌
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
function raraEmpty(commandName, detail) {
  // REVISI OWNER 3 Okt 2026: balik desain lama (tanpa kaomoji)
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
function raraNoInput(commandName, hint, example) {
  // REVISI OWNER 3 Okt 2026: balik desain lama — 「 ✦ NAMA ✦ 」 + ⚠ + Cara Pakai + Contoh (tanpa kaomoji).
  // Blok info registry (kategori/akses/tempat/cooldown/alias) tetap ditempel untuk non-game.
  let out = `「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `⚠ ${scLine(pickRandom(NOVA_REPLIES.noInput))}\n`;
  if (hint && String(hint).trim()) out += `\n📝 ${toSC("Cara Pakai")}:\n${scLine(hint)}\n`;
  if (example) out += `\n💡 ${toSC("Contoh")}:\n${example}\n`;
  if (!isGameCmd(commandName)) {
    const info = v2InfoBlock(commandName);
    if (info) out += `\n${info}\n`;
  }
  return out.replace(/\n+$/, "");
}

/**
 * Pesan "reply media dulu" natural
 * @param {string} commandName
 * @param {string} [mediaType] - "image" | "sticker" | "video" | "audio"
 */
function raraNoQuoted(commandName, mediaType) {
  // REVISI OWNER 3 Okt 2026: balik desain lama (tanpa kaomoji)
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
function raraSuccess(commandName, message) {
  // REVISI OWNER 3 Okt 2026: balik desain lama (tanpa kaomoji)
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
// plugin owner diubah usage dan pesan eror cmd") — raraGuide/raraNoInput/
// raraSalah otomatis render kartu kaomoji V2. Isi teks (intro/contoh/note)
// PER-PLUGIN TETAP UTUH — yang generik cuma bingkai. Guard kategori:
// game/minigame/rpg/rpg-cinta JANGAN pake desain ini (owner 25 Sep: "klo
// usage fitur game minigame, rpg, rpg cinta mngkin agak berbeda jgn
// diterapin desain mirip sprti dibuat khusus msing2") — mereka pakai
// raraGameBox/kartu khas sendiri; fallback ke render klasik.
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
// ── DESAIN CUTE (2 Okt 2026, owner: "desain cute dibagian usage semua
// fitur serta replynya dihandler, kyk pesan eror atau yg lain" — kecuali
// sistem loading emoji react yang TIDAK disentuh): header ribbon ୨୧ ✧ nama
// ✧ ୨୧ + kaomoji sesuai suasana (error/sukses/kosong) + divider bintang
// sebelum baris spec. Game category TETAP desain khas sendiri.
const CUTE_ERR_POOL = ["(>_<)", "(;ω;)", "(´•̥ ω •̥`)", "(｡•́︿•̀｡)", "(╥_╥)", "(>.<)"];
const CUTE_OK_POOL = ["(≧▽≦)", "(๑˃ᴗ˂)ﻭ", "(◍•ᴗ•◍)", "(≧▽≦) ♡", "(๑>ᴗ<)و", "(⌒‿⌒)"];
const CUTE_EMPTY_POOL = ["(._.)", "(´･_･`)", "(︶︹︶)", "(´-ω-`)", "(;-;)"];
function cuteHeader(name) {
  // REVISI OWNER 3 Okt 2026: balik ke desain lama (tanpa ୨୧ / kaomoji) — header klasik 「 ✦ nama ✦ 」.
  // Nama fungsi dipertahankan supaya 20+ pemanggil tidak perlu diubah.
  return `「 ✦ ${toSC(String(name || "").toLowerCase())} ✦ 」`;
}
const CUTE_DIVIDER = ""; // REVISI 3 Okt 2026: divider cute dibuang (blok info cukup dipisah baris kosong)
// ── TEMA KHAS CEWEK MENU (2 Okt 2026, owner: "jd bair bot ini menu tema
// khas cewek gt") — khusus MENU (.menu/.allmenu/.allmenucategory): pita
// bow 🎀 mengapit header ribbon + divider hati-bintang. Kartu usage/reply
// fitur TETAP desain cute biasa (bukan tema ini).
const GIRLY_MENU_DIVIDER = "\u2500\u2500\u2500 \u2661 \u2500\u2500\u2500";
function girlyHeader(name) {
  // revisi owner 2 Okt (final): bow 🎀 DIBUANG (emoji android, kelamaan
  // ramai di tiap section) — cukup ୨୧ framing nama
  return `୨୧ ${toSC(String(name || "").toLowerCase())} ୨୧`;
}
function v2Kaomoji(name) {
  const key = String(name || "x").toLowerCase();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return V2_KAOMOJI_POOL[h % V2_KAOMOJI_POOL.length];
}
// spec dari pluginConfig ASLI (registry rara-plugins) — fakta nyata, bukan karangan
// BLOK INFO TERPOSISI (2 Okt 2026, owner: "template seminimal mungkin gak
// ramai, tapi tiap fitur field info lengkap klo tersedia, format posisi
// teks terposisikan dengan rapih") — tabel rapi label:value dari
// pluginConfig ASLI registry, field cuma muncul kalau datanya ada.
// FIX LATEN: v2Spec lama baca field FLAT (pl.energi) padahal plugin di
// registry bentuknya {config, handler} → energi/cooldown/kategori gak
// PERNAH muncul di kartu produksi (cuma "💸 gratis" yang kebaca) —
// sekarang baca cfg = pl.config dengan fallback flat.
const INFO_LABEL_WIDTH = 9; // "cooldown"/"kategori" terpanjang → rata ":"
// baris spec KOMPAK (1 baris inline) — khusus kartu status/caption yang
// gak muat tabel (error/sukses/kosong/caption); baca cfg bener (fix flat)
function v2SpecCompact(commandName) {
  try {
    const key = String(commandName || "").toLowerCase().replace(/\s+/g, "");
    const pl = getPlugin(key) || getPlugin(String(commandName || "").toLowerCase());
    if (!pl) return null;
    const cfg = pl.config || pl || {};
    const items = [];
    const energi = Number(cfg.energi);
    if (energi > 0) items.push(`⚡ ${toSC("energi")} ${energi}`);
    const cd = Number(cfg.cooldown);
    if (cd > 0) items.push(`⏱ ${cd}${toSC("dtk")}`);
    if (cfg.isOwner !== true && cfg.isPremium !== true) items.push(`💸 ${toSC("gratis")}`);
    return items.length ? items.join(" • ") : null;
  } catch { return null; }
}

function v2InfoBlock(commandName, manualSpec = []) {
  try {
    const key = String(commandName || "").toLowerCase().replace(/\s+/g, "");
    const pl = getPlugin(key) || getPlugin(String(commandName || "").toLowerCase());
    const specArr = Array.isArray(manualSpec) ? manualSpec : [];
    if (!pl) {
      // tanpa registry: spec manual caller tetap tampil (baris apa adanya)
      const ms = specArr.map(String).map((s) => s.trim()).filter(Boolean);
      return ms.length ? ms.join(" • ") : null;
    }
    const cfg = pl.config || pl || {};
    const rows = [];
    const has = {};
    const row = (label, value) => {
      const v = value === null || value === undefined ? "" : String(value).trim();
      if (!v) return;
      rows.push(`${String(label).padEnd(INFO_LABEL_WIDTH)}: ${v}`);
    };
    const cat = String(cfg.category || "").trim().toLowerCase();
    if (cat && cat !== "main") { row("kategori", cat); }
    if (cfg.isOwner === true) row("akses", "owner");
    else if (cfg.isPremium === true) row("akses", "premium");
    else { row("akses", "semua user · gratis"); has.gratis = true; }
    if (cfg.isGroup === true && cfg.isPrivate !== true) row("tempat", "grup");
    else if (cfg.isPrivate === true && cfg.isGroup !== true) row("tempat", "dm");
    else row("tempat", "dm & grup");
    const energi = Number(cfg.energi);
    if (energi > 0) { row("energi", String(energi)); has.energi = true; }
    const cd = Number(cfg.cooldown);
    if (cd > 0) { row("cooldown", `${cd} dtk`); has.cd = true; }
    // limit default registry = 1 (semua plugin) → cuma tampil kalau
    // pluginnya eksplisit set nilai beda (bukan noise tiap kartu)
    const lim = Number(cfg.limit);
    if (lim > 0 && lim !== 1) row("limit", String(lim));
    const reqs = [];
    if (cfg.isAdmin === true) reqs.push("admin grup");
    if (cfg.isBotAdmin === true) reqs.push("bot admin");
    if (reqs.length) row("syarat", reqs.join(" + "));
    const aliases = (Array.isArray(cfg.alias) ? cfg.alias : Array.isArray(cfg.aliases) ? cfg.aliases : [])
      .map(String).map((s) => s.trim().toLowerCase()).filter(Boolean)
      .filter((a) => a !== String(cfg.name || key).toLowerCase());
    if (aliases.length) row("alias", aliases.map((a) => `.${a}`).join(" · "));
    // spec manual caller (param spec raraGuideV2) — merge TANPA dobel fakta
    // yang udah otomatis dari config (energi/cooldown/gratis), sisanya jadi
    // baris "info" rapi (mis. "⚡ layanan lokal 9router").
    for (const raw of specArr) {
      const s = String(raw).replace(/^[⚡⏱💸✨📋]\s*/u, "").trim();
      if (!s) continue;
      if (/^energi\b/i.test(s)) {
        if (!has.energi) { row("energi", s.replace(/^energi\s*/i, "")); has.energi = true; }
        continue;
      }
      if (/^cooldown\b/i.test(s) || /^\d+\s*dtk/i.test(s)) {
        if (!has.cd) { row("cooldown", s.replace(/^cooldown\s*/i, "")); has.cd = true; }
        continue;
      }
      if (/^gratis$/i.test(s)) {
        if (!has.gratis) { row("akses", "semua user · gratis"); has.gratis = true; }
        continue;
      }
      row("info", s);
    }
    return rows.length ? rows.join("\n") : null;
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
function raraGuideClassic(commandName, intro, example, note) {
  // GUARD LEBAR (1 Okt, dijaga lagi 3 Okt): intro & note = prosa -> scWrap (<=30 char/baris, standar allmenu).
  // example = command VERBATIM -> TIDAK dipotong (harus bisa di-copas utuh).
  let out = `「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  if (intro && String(intro).trim()) out += `📝 ${toSC("Cara Pakai")}:\n${scWrap(intro)}\n`;
  if (example) out += `\n💡 ${toSC("Contoh")}:\n${example}\n`;
  if (note) {
    const nl = String(note).split("\n").map((l) => l.trim()).filter(Boolean);
    out += `\n📍 ${scWrap(nl[0], BOX_WRAP_WIDTH - 2)}\n`; // "📍 " = 2 karakter, ikut jatah lebar
    if (nl.length > 1) out += nl.slice(1).map((l) => scWrap(l)).join("\n") + "\n";
  }
  return out.replace(/\n+$/, "");
}

// raraSalah — SATU-SATUNYA reply salah pemakaian (owner 4 Okt 2026: "jgn
// tambah v2, hapus aja, cm raraSalah aja"). Desain modern 3 Okt: ❗ Cara
// pemakaian salah + pesan + contoh (tanpa kaomoji / "yah kak"). Dukung 2
// signature: (name, "pesan string") lama, atau (name, { pesan, contoh })
// bekas pintu V2 — opsi kaomoji diabaikan demi kompatibilitas pemanggil lama.
export function raraSalah(commandName, messageOrOpts) {
  const isObj = messageOrOpts && typeof messageOrOpts === "object" && !Array.isArray(messageOrOpts);
  const pesan = isObj ? (messageOrOpts.pesan || "") : (messageOrOpts || "");
  const contoh = isObj ? (messageOrOpts.contoh || "") : "";
  let out = `❗ ${toSC("Cara pemakaian salah")}`;
  if (pesan && String(pesan).trim()) out += ` — ${scLine(pesan)}`;
  out += "\n";
  if (contoh) out += `${toSC("Contoh")}: ${contoh}\n`;
  else if (commandName) out += `${scLine(`Ketik .${String(commandName).toLowerCase()} buat lihat cara pemakaian`)}\n`;
  return out.replace(/\n+$/, "");
}

// REWORK 2026-09-10 (owner: "terapin ke semua usage" — layout section kayak
// AI/DL usage): 📝 Cara Pakai + 💡 Contoh + ⚠ catatan DETAIL di bawah contoh.
// Example & command VERBATIM; intro/note di-smallcaps (URL aman via scLine).
function raraGuide(commandName, a = {}, b = null, c = null) {
  // UNIFIED (owner 2 Okt 2026): raraGuideV2 DIHAPUS — raraGuide SATU-SATUNYA
  // pintu, dukung 2 signature: (name, optsObject) = kartu V2 eksplisit
  // (kaomoji/sapaan/cara/contoh/note/spec/model — caller non-game yang mau
  // kartu custom), ATAU (name, intro, example, note) positional legacy.
  if (a && typeof a === "object" && !Array.isArray(a)) {
    return renderGuideV2Body(commandName, a).replace(/\n+$/, "");
  }
  const intro = a;
  const example = b;
  const note = c;
  // REVISI OWNER 3 Okt 2026: balik ke desain lama — layout klasik 「 ✦ nama ✦ 」 + Cara Pakai + Contoh + catatan
  // (field terpisah & lengkap, TANPA kaomoji / ୨୧). Blok info registry (kategori, akses, tempat, cooldown, alias)
  // tetap ditempel di bawah supaya field tetap lengkap.
  let out = raraGuideClassic(commandName, intro, example, note);
  if (!isGameCmd(commandName)) {
    const info = v2InfoBlock(commandName);
    if (info) out += `\n\n${info}`;
  }
  return out.replace(/\n+$/, "");
}

export { raraError, raraEmpty, raraNoInput, raraNoQuoted, raraSuccess, raraGuide, pickRandom };

// ═══════════════════════════════════════════════
// Pesan status universal (request owner):
// berhasil → "Berhasil kak 🥳"
// gagal → "Yah gagal kak, coba lagi 😩"
// fitur gangguan → "Yah fiturnya lagi gangguan kak, coba lain waktu ya 😥"
// ═══════════════════════════════════════════════
export function raraBerhasil(fitur = "Berhasil") {
  return "Berhasil kak 🥳";
}

export function raraGagal(fitur = "Gagal") {
  return "Yah gagal kak, coba lagi 😩";
}

export function raraGangguan(fitur = "Error") {
  return "Yah fiturnya lagi gangguan kak, coba lain waktu ya 😥";
}

// ═══════════════════════════════════════════════
// raraBox — Universal box builder dengan right border konsisten
// ═══════════════════════════════════════════════
/**
 * Build box dengan header + body + footer, right border konsisten.
 * @param {string} header - Title (akan di-smallcaps)
 * @param {Array} lines - Body lines. String untuk content, "---" untuk separator, {sub: "Title"} untuk sub-header
 * @param {object} opts - { sc: true (default, smallcaps), padding: 1 }
 * @returns {string} Box text siap dikirim
 */
// raraAiUsage — DESAIN USAGE AI ala owner (10 Sep 2026):
// 「 ✦ Gemini ✦ 」 + 📝 Cara Pakai + 💡 Contoh + ✨ Model aktif +
// 📋 daftar model tersedia (satu model per baris).
// Label di-smallcaps (aturan owner); command + nama model VERBATIM —
// identifier yang harus bisa diketik user persis (prinsik "URL tetap persis").
// raraDlUsage — DESAIN USAGE DOWNLOADER ala owner (10 Sep 2026, revisi
// "setiap fitur beda layout jgn smuanya sama"): layout kategori DOWNLOADER
// beda dari usage AI — 「 ✦ Play ✦ 」 + 📝 Cara Pakai + 💡 Contoh doang,
// tanpa section model. Label smallcaps; command VERBATIM (bisa diketik persis).
export function raraDlUsage(brand, { prefix = ".", command, cara = null, contoh = null } = {}) {
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
  return raraBox(brand, lines);
}

// raraGuideV2 — DESAIN USAGE BARU ala owner (25 Sep 2026, sesi "desain
// kaomoji lucu"): 「✧ nama ✧」 + kaomoji semangat + sapaan ajakan 1 baris +
// 📍 baris cara/contoh/note mengalir (note = kalimat panduan natural per
// fitur) + (KHUSUS AI, request owner 25 Sep "usage kyk ai mngkin ada tmbahan
// kyk field model yg dipakai dan yg tersedianya") ✨ model aktif + 📋 model
// tersedia + baris spec ⚡⏱💸 (CUMA fakta nyata plugin — item gak ada dilewati,
// gak ada fakta = baris gak muncul). Kaomoji + sapaan DITULIS MANUAL per
// fitur, dan WAJIB BEDA antar plugin (owner 25 Sep: "tiap plugin
// sapaannya beda beda g sama") — jangan pakai kaomoji/sapaan plugin lain —
// raraGuide/raraDlUsage/raraAiUsage lama TETAP dipakai plugin belum dimigrasi.
// renderGuideV2Body — badan kartu V2 (kaomoji + info blok) — dipakai
// raraGuide SATU-SATUNYA (owner 2 Okt: "v2 dihapus aja jadi raraGuide,
// jangan raraGuideV2 — dua nama buat desain sama cuma bikin ribet").
function renderGuideV2Body(commandName, opts = {}) {
  // REVISI OWNER 3 Okt 2026: balik desain lama — opsi kaomoji/sapaan tetap diterima (kompat caller) tapi
  // TIDAK ditampilkan. Layout: 「 ✦ NAMA ✦ 」 + Cara Pakai + Contoh + catatan + model + blok info registry.
  const {
    sapaan = "", cara = "", contoh = "", note = "",
    modelAktif = null, models = [], spec = [], extra = [],
  } = opts;
  let out = `「 ✦ ${toSC(String(commandName).toUpperCase())} ✦ 」\n`;
  if (sapaan && String(sapaan).trim() && !(cara && String(cara).trim())) out += `${scWrap(sapaan)}\n`;
  if (cara && String(cara).trim()) out += `📝 ${toSC("Cara Pakai")}:\n${scWrap(cara)}\n`;
  if (contoh) out += `\n💡 ${toSC("Contoh")}:\n${contoh}\n`;
  if (note) {
    const nl = String(note).split("\n").map((l) => l.trim()).filter(Boolean);
    if (nl.length) {
      out += `\n📍 ${scWrap(nl[0], BOX_WRAP_WIDTH - 2)}\n`; // "📍 " = 2 karakter, ikut jatah lebar
      if (nl.length > 1) out += nl.slice(1).map((l) => scWrap(l)).join("\n") + "\n";
    }
  }
  if (Array.isArray(extra) && extra.length) out += `\n${extra.map(String).join("\n")}\n`;
  if (modelAktif) out += `\n✨ ${toSC("Model aktif")}: ${modelAktif}\n`;
  if (Array.isArray(models) && models.length) {
    out += `📋 ${toSC("Model tersedia")}: ${models.map(String).join(" · ")}\n`;
  }
  const info = v2InfoBlock(commandName, spec);
  if (info) out += `\n${info}\n`;
  return out;
}

export function raraAiUsage(brand, { prefix = ".", command, modelAktif = null, models = [], extra = [] } = {}) {
  // REWORK 25 Sep — kartu usage AI → DESAIN V2 kaomoji + emoji muka cute
  // (owner: mulai dr AI dulu). Model & extra VERBATIM. Game → raraBox lama.
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
    return raraBox(brand, linesL);
  }
  // REVISI OWNER 3 Okt 2026: balik desain lama — 「 ✦ BRAND ✦ 」 + Cara Pakai + Contoh + Model (tanpa kaomoji).
  // Blok info registry tetap ditempel supaya field lengkap.
  const cmd = `${prefix}${command || brand}`;
  let out = `「 ✦ ${toSC(String(brand).toUpperCase())} ✦ 」\n`;
  out += `📝 ${toSC("Cara Pakai")}:\n${cmd} [pertanyaan]\n`;
  out += `\n💡 ${toSC("Contoh")}:\n${cmd} apa itu AI?\n`;
  if (modelAktif) out += `\n✨ ${toSC("Model aktif")}: ${modelAktif}\n`;
  if (Array.isArray(models) && models.length) {
    out += `\n📋 ${toSC("Model tersedia")}:\n`;
    for (const mdl of models) out += `${mdl}\n`;
  }
  if (Array.isArray(extra) && extra.length) out += `\n${extra.map(String).join("\n")}\n`;
  const info = v2InfoBlock(command || brand);
  if (info) out += `\n${info}\n`;
  return out.replace(/\n+$/, "");
}

export function raraBox(header, lines = [], opts = {}) {
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
