// === Nova AI Menu Style (v8 — Unified Box) ===
// Aesthetic khas bot WhatsApp dev Indonesia:
// ╭─「 ✦  ✦」 box drawing, │ clean body lines, │ sub-section, ╰────  •  ──── footer
// + modern data: ▰▱ progress bars, ● status dots, system info
// SEMUA text pakai smallcaps font (toSC diterapkan ke header + body)
// Semua fungsi lama tetap export dengan signature sama.
//
// STYLE GUIDE (wajib konsisten di semua plugin):
// ┌─ Header:   ╭─「 ✦ Title ✦ 」
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
function buildBox(headerTitle, lines = []) {
  // Header TIDAK di-stretch mengikuti panjang body — dash panjang tanpa spasi
  // bikin WhatsApp hard-wrap jadi beberapa baris "──────" berantakan di HP.
  // Header dipakai apa adanya, sama seperti style menu/allmenu yang disetujui owner.
  const headerCore = `╭─「 ✦ ${headerTitle} ✦ 」`;
  const header = headerCore;
  const body = [];
  for (const line of lines) {
    if (line === "---" || line === "─" || line === "---separator---") {
      body.push("├────  •  ────");
    } else if (typeof line === "object" && line.subHeader) {
      const sub = `│ 「 ${line.subHeader} 」`;
      body.push(sub);
    } else if (!line || !String(line).trim()) {
      body.push("│");
    } else {
      const clean = String(line)
        .replace(/^╎❏\s*/, '')
        .replace(/^╎\s*$/, '')
        .replace(/^┊\s+➶\s*/, '')
        .replace(/^[•┊╎❏➶╭╰│┃]\s*/g, '');
      const text = scLine(clean);
      body.push(`│ ${text}`);
    }
  }
  const footer = "╰────  •  ────";
  return [header, ...body, footer].join("\n");
}

// novaCaption: caption panduan pakai fitur (no-input guide) — pakai buildBox modern style
function novaCaption({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
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
  return `╭─「 ✦ ${toSC(botName)} ✦ 」`;
}

function botSignature(botName) {
  return `╰────  •  ────`;
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
  const headerCore = `╭─「 ✦ ${toSC(name)} (${commands.length}) ✦ 」`;
  const lines = [];
  let maxW = headerCore.length;
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    const line = `│ ${chunk.map(c => `${prefix}${toSC(c)}`).join("  ")}`;
    if (line.length > maxW) maxW = line.length;
    lines.push(line);
  }
  const W = Math.max(maxW + 3, 24);
  const header = headerCore + "─".repeat(Math.max(0, W - headerCore.length));
  const body = lines;
  const footer = "╰────  •  ────";
  return [header, ...body, footer].join("\n");
}

// ═══════════════════════════════════════════════
// BACKWARD COMPAT — fungsi lama, signature sama
// Output: Unified Box Style v8 (semua konsisten)
// Dipakai oleh 1280+ file plugin. Update di sini = update semua.
// ═══════════════════════════════════════════════

function sectionHeader(title) {
  return `╭─「 ✦ ${toSC(title)} ✦ 」`;
}

function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│┃]\s*/g, '').replace(/^\s+/g, '');
  return `│ ${scLine(clean)}`;
}

function sectionClose() {
  return `╰────  •  ────`;
}

function sectionSpacer() {
  return `│`;
}

function buildSection(title, items = []) {
  const header = sectionHeader(title);
  let maxW = header.length;
  const bodyLines = items.map(item => sectionItem(item));
  for (const l of bodyLines) if (l.length > maxW) maxW = l.length;
  const W = Math.max(maxW + 3, 24);
  const closedHeader = header + "─".repeat(Math.max(0, W - header.length));
  const closedBody = bodyLines;
  const closedFooter = "╰────  •  ────";
  return [closedHeader, ...closedBody, closedFooter].join("\n");
}

function claraHeader(title, emoji = "") {
  if (isRealEmoji(emoji)) return `╭─「 ✦ ${emoji} ${toSC(title)} ✦ 」`;
  return `╭─「 ✦ ${toSC(title)} ✦ 」`;
}

function bracketBox(emoji, label, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  return buildBox(`${emojiStr}${toSC(label)}`, lines);
}

// commandListLine: baris command di list menu (allmenu/allmenucategory)
function commandListLine(prefix, cmdName, usage = "", symbols = "") {
  const paramMatches = usage ? String(usage).match(/<[^>]+>/g) : null;
  const paramPart = paramMatches ? " " + toSC(paramMatches.join(" ")) : "";
  const symbolPart = symbols ? " " + String(symbols).trim() : "";
  return `│ ${prefix}${toSC(String(cmdName))}${paramPart}${symbolPart}`;
}

function separator(char = "─", repeat = 20) {
  return "─".repeat(Math.min(repeat, 28));
}

function tipText(text) {
  return `│ 💡 *${toSC("Tip")}:* ${scLine(text)}`;
}

function claraWrap(title, body, type = "info") {
  const typeLabel = type === "error" ? " — Error" : type === "success" ? " — Success" : type === "warn" ? " — Warning" : "";
  const raw = Array.isArray(body) ? body : String(body).split("\n");
  const lines = raw.filter(l => l.trim());
  return bracketBox(type, title + typeLabel, lines);
}

function claraLine(title, text) {
  return bracketBox("i", title, [text]);
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
    } else if (t.endsWith("│") && !t.startsWith("│") && l.trim() !== "│") {
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
  primbon: "Primbon", cecan: "Cecan", stalker: "Stalker", tts: "TTS",
  vps: "VPS",
};

const CATEGORY_EMOJIS = {
  ai: "🤖", sticker: "🖼️", download: "📥", fun: "🎮",
  canvas: "🎨", tools: "🛠️", rpg: "🎯", "rpg couple": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
  anime: "🎌", asupan: "🌸", clan: "⚔️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍜",
  future: "🔮", islami: "🕌", islamic: "🕌", menu: "📋",
  maker: "✨", news: "📰", nsfw: "🔞", linode: "☁️",
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
  const useSC = opts.sc !== false;
  const hdr = useSC ? toSC(title) : title;
  const headerStr = `╭─「 ✦ ${hdr} ✦ 」`;
  const lines = [];
  let maxW = headerStr.length;
  
  for (const item of items) {
    if (item === "---" || item === "─") {
      lines.push({ type: "sep", text: "" });
      continue;
    }
    if (typeof item === "string") {
      const text = useSC ? toSC(item) : item;
      const line = `│ ${text}`;
      if (line.length > maxW) maxW = line.length;
      lines.push({ type: "text", text: line });
      continue;
    }
    if (item && item.label !== undefined) {
      const label = useSC ? toSC(item.label) : item.label;
      const value = item.value !== undefined ? String(item.value) : "";
      // Pad label ke width yang konsisten (min 10 char)
      const labelW = Math.max(10, label.length + 2);
      const padded = label.padEnd(labelW);
      const line = `│ ${padded}${value}`;
      if (line.length > maxW) maxW = line.length;
      lines.push({ type: "kv", text: line });
      continue;
    }
  }
  
  const W = Math.max(maxW + 3, 24);
  let out = headerStr + "─".repeat(Math.max(0, W - headerStr.length)) + "\n";
  for (const line of lines) {
    if (line.type === "sep") {
      out += "│" + "─".repeat(Math.max(0, W - 1)) + "\n";
    } else {
      out += line.text + " ".repeat(Math.max(0, W - line.text.length)) + "\n";
    }
  }
  out += "╰────  •  ────";
  return out;
}


// ═══════════════════════════════════════════════
// novaMenuLayout — Menu design baru (continuous flow)
// ╭─「 ✦ Info ✦ 」     ← open
// │ • Label : value     ← info bullet
// ╰─「 CategoryName 」   ← close + next section
// │
// ├ ✦ .command          ← command item
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
function novaMenuLayout({ intro = null, introTitle = "Nova", infoTitle = "Info", info = [], categories = [], prefix = ".", sc = true } = {}) {
  const scFn = sc ? toSC : (s) => String(s);
  
  let out = "";
  
  // ── Intro section (opsional) ──
  if (intro) {
    out += `╭─「 ✦ ${scFn(introTitle)} ✦ 」\n`;
    out += `│\n`;
    // intro bisa string (multi-line) atau array of lines
    const introLines = Array.isArray(intro) ? intro : intro.split("\n");
    for (const line of introLines) {
      if (line === "" || line === " ") {
        out += `│\n`;
      } else {
        // Intro tetap normal case (bukan smallcaps) — ini pesan personal
        out += `│ ${line}\n`;
      }
    }
    out += `│\n`;
    out += `╰────  •  ────\n\n`;
  }
  
  // ── Info section ──
  out += `╭─「 ✦ ${scFn(infoTitle)} ✦ 」\n`;
  
  // Hitung max label width untuk alignment
  let maxLabel = 0;
  for (const item of info) {
    if (item && item.label) {
      const labelLen = scFn(item.label).length;
      if (labelLen > maxLabel) maxLabel = labelLen;
    }
  }
  maxLabel = Math.max(maxLabel, 6); // min 6 char
  
  for (const item of info) {
    if (typeof item === "string") {
      out += `│ ${scFn(item)}\n`;
    } else if (item && item.label !== undefined) {
      const label = scFn(item.label).padEnd(maxLabel);
      const value = item.value !== undefined ? String(item.value) : "";
      out += `│ • ${label} : ${value}\n`;
    }
  }
  
  // ── Category sections ──
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const catName = scFn(cat.name).toUpperCase();
    
    // Transition: ╰─「 CategoryName 」
    out += `╰─「 ${catName} 」\n`;
    out += `│\n`;
    
    // Commands: ├ ✦ .command
    for (const cmd of cat.commands) {
      out += `├ ✦ ${prefix}${cmd}\n`;
    }
  }
  
  // ── Final close ──
  out += `└────  •  ────`;
  
  return out;
}


// ═══════════════════════════════════════════════
// novaReply — Standard reply format for all plugins
// ╭─「 ✦ Title ✦ 」
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
  const scFn = sc ? toSC : (s) => String(s);
  let out = `╭─「 ✦ ${scFn(title)} ✦ 」\n`;
  out += `│\n`;
  
  if (info && info.length > 0) {
    let maxLabel = 0;
    for (const item of info) {
      if (item && item.label !== undefined) {
        const labelLen = scFn(item.label).length;
        if (labelLen > maxLabel) maxLabel = labelLen;
      }
    }
    maxLabel = Math.max(maxLabel, 4);
    
    for (const item of info) {
      if (item && item.label !== undefined) {
        const label = scFn(item.label).padEnd(maxLabel);
        const value = item.value !== undefined ? String(item.value) : "";
        out += `│ • ${label} : ${value}\n`;
      }
    }
    out += `│\n`;
  }
  
  if (status) {
    out += `│ ${status}\n`;
  }
  
  if (content) {
    out += `${content}\n`;
  }
  
  out += `╰────  •  ────`;
  return out;
}


export {
  toSC, scLine, isRealEmoji,
  novaInfoBox,
  novaMenuLayout,
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
};

// ═══════════════════════════════════════════════
// MEDIA CAPTION — Rich info untuk media yang dikirim
// Hanya tampilkan field yang ada (truthy)
// ═══════════════════════════════════════════════

/**
 * Build rich caption untuk media download.
 * @param {object} opts
 * @param {string} opts.platformIcon - emoji platform (▶️ 🎵 📸 dll)
 * @param {string} opts.platformName - nama platform (YouTube, TikTok, dll)
 * @param {string} opts.title - judul media
 * @param {string} opts.author - nama author/creator
 * @param {string} opts.authorHandle - @handle author
 * @param {string} opts.duration - durasi (e.g. "3:45")
 * @param {string} opts.uploadDate - tanggal upload
 * @param {string|number} opts.views - jumlah views
 * @param {string|number} opts.likes - jumlah likes
 * @param {string|number} opts.comments - jumlah comments
 * @param {string|number} opts.shares - jumlah shares
 * @param {string|number} opts.subscribers - subscriber count
 * @param {string} opts.description - deskripsi/caption media
 * @param {string} opts.format - format download (MP3, 720p, dll)
 * @param {string} opts.method - metode download (SaveNow, AIO, dll)
 * @param {string} opts.thumbnail - thumbnail URL (untuk contextInfo)
 * @returns {string} Caption box text
 */
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title,
  author,
  authorHandle,
  duration,
  uploadDate,
  views,
  likes,
  comments,
  shares,
  downloads,
  subscribers,
  description,
  format,
  method,
} = {}) {
  const lines = [];

  // Title — selalu ada
  if (title) lines.push(`📌 *${toSC("Judul")}:* ${scLine(title.slice(0, 80))}`);

  // Author
  let authorStr = "";
  if (author && authorHandle) {
    authorStr = `${scLine(author)} (@${scLine(authorHandle)})`;
  } else if (author) {
    authorStr = scLine(author);
  } else if (authorHandle) {
    authorStr = `@${scLine(authorHandle)}`;
  }
  if (authorStr) lines.push(`👤 *${toSC("Author")}:* ${authorStr}`);

  // Duration
  if (duration) lines.push(`⏱️ *${toSC("Durasi")}:* ${scLine(String(duration))}`);

  // Upload date
  if (uploadDate) lines.push(`📅 *${toSC("Upload")}:* ${scLine(String(uploadDate))}`);

  // Stats — views, likes, comments, shares, downloads
  const stats = [];
  if (views) stats.push(`👀 ${scLine(String(views))}`);
  if (likes) stats.push(`❤️ ${scLine(String(likes))}`);
  if (comments) stats.push(`💬 ${scLine(String(comments))}`);
  if (shares) stats.push(`🔁 ${scLine(String(shares))}`);
  if (downloads) stats.push(`📥 ${scLine(String(downloads))}`);
  if (stats.length > 0) {
    lines.push(`📊 *${toSC("Stats")}:* ${stats.join("  ")}`);
  }

  // Subscribers (YouTube channel)
  if (subscribers) lines.push(`🔔 *${toSC("Subs")}:* ${scLine(String(subscribers))}`);

  // Description (max 100 chars)
  if (description && String(description).trim()) {
    const desc = String(description).trim().slice(0, 120);
    lines.push(`📝 *${toSC("Desc")}:* ${scLine(desc)}`);
  }

  // Separator before technical info
  lines.push("---");

  // Format & method
  if (format) lines.push(`🎵 *${toSC("Format")}:* ${scLine(format)}`);
  if (method) lines.push(`📥 *${toSC("Via")}:* ${scLine(method)}`);

  return buildBox(`${platformIcon} ${toSC(platformName)}`, lines);
}

export { mediaCaption };

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
    "Eh, input-nya mana nih 🗄️ Isi dulu dong",
    "Kosong banget 😭 Kasih teks/link dong",
    "Bentar, teksnya mana? 🫠 Jangan lupa diisi ya",
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
function novaError(commandName, detail) {
  let out = `╭─「 ✦ ${toSC("ERROR")} ✦ 」\n`;
  out += `│\n`;
  out += `│ ❌ ${scLine(pickRandom(NOVA_REPLIES.error))}\n`;
  if (detail) out += `│ _${scLine(detail)}_\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

/**
 * Pesan kosong/not found natural dalam box style
 * @param {string} commandName - nama command
 * @param {string} [detail] - detail opsional
 */
function novaEmpty(commandName, detail) {
  let out = `╭─「 ✦ ${toSC("KOSONG")} ✦ 」\n`;
  out += `│\n`;
  out += `│ 🔍 ${scLine(pickRandom(NOVA_REPLIES.empty))}\n`;
  if (detail) out += `│ _${scLine(detail)}_\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

/**
 * Pesan "butuh input" natural dalam box style
 * @param {string} commandName - nama command
 * @param {string} [hint] - hint cara pakai
 * @param {string} [example] - contoh command
 */
function novaNoInput(commandName, hint, example) {
  let out = `╭─「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `│\n`;
  out += `│ ⚠ ${scLine(pickRandom(NOVA_REPLIES.noInput))}\n`;
  if (hint) out += `│ ${scLine(hint)}\n`;
  if (example) out += `│ Contoh: ${example}\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

/**
 * Pesan "reply media dulu" natural
 * @param {string} commandName
 * @param {string} [mediaType] - "image" | "sticker" | "video" | "audio"
 */
function novaNoQuoted(commandName, mediaType) {
  let out = `╭─「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `│\n`;
  out += `│ ⚠ ${scLine(pickRandom(NOVA_REPLIES.noQuoted))}\n`;
  if (mediaType) out += `│ ${scLine(`Butuh: ${mediaType}`)}\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

/**
 * Pesan sukses natural dalam box style
 * @param {string} commandName
 * @param {string} message - pesan sukses
 */
function novaSuccess(commandName, message) {
  let out = `╭─「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `│\n`;
  out += `│ ✅ ${scLine(message)}\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

/**
 * Pesan info/guide natural dalam box style
 * @param {string} commandName
 * @param {string} intro - kalimat pembuka natural
 * @param {string} [example] - contoh
 * @param {string} [note] - catatan tambahan
 */
function novaGuide(commandName, intro, example, note) {
  let out = `╭─「 ✦ ${toSC(commandName.toUpperCase())} ✦ 」\n`;
  out += `│\n`;
  if (intro) out += `│ ${scLine(intro)}\n`;
  if (example) out += `│ Contoh: ${example}\n`;
  if (note) out += `│ ⚠ ${scLine(note)}\n`;
  out += `│\n`;
  out += `╰────  •  ────`;
  return out;
}

export { novaError, novaEmpty, novaNoInput, novaNoQuoted, novaSuccess, novaGuide, pickRandom };

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
export function novaBox(header, lines = [], opts = {}) {
  const useSC = opts.sc !== false;
  const hdr = useSC ? toSC(header) : header;
  const headerStr = `╭─「 ✦ ${hdr} ✦ 」`;
  let maxW = headerStr.length;
  const processed = lines.map(l => {
    if (l === "---" || l === "─") return { type: "sep" };
    if (typeof l === "object" && l.sub) {
      const subStr = `│ 「 ${useSC ? toSC(l.sub) : l.sub} 」`;
      if (subStr.length > maxW) maxW = subStr.length;
      return { type: "sub", raw: subStr };
    }
    if (!l || !String(l).trim()) return { type: "empty" };
    const text = String(l);
    const len = `│ ${text}`.length;
    if (len > maxW) maxW = len;
    return { type: "line", raw: text };
  });
  const W = Math.max(maxW + 4, 24);
  let out = headerStr + "─".repeat(Math.max(0, W - headerStr.length)) + "\n";
  for (const item of processed) {
    if (item.type === "sep") {
      out += "├" + "─".repeat(Math.max(0, W - 1)) + "\n";
    } else if (item.type === "sub") {
      out += item.raw + "\n";
    } else if (item.type === "empty") {
      out += "│\n";
    } else {
      out += `│ ${item.raw}` + "\n";
    }
  }
  out += "╰────  •  ────";
  return out;
}
