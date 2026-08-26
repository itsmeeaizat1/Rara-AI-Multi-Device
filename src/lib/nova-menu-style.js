// === Nova AI Menu Style (v4 — Futuristic Dashboard) ===
// Modern futuristic design: ▎ sections, ┊ details, ▰▱ progress bars, ● status
// Semua fungsi lama (claraWrap, bracketBox, dll) tetap export untuk backward compat.

// Small caps map
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

// ═══════════════════════════════════════════════
// FUTURISTIC v4 FUNCTIONS (untuk menu/allmenu/allmenucategory)
// ═══════════════════════════════════════════════

/**
 * Futuristic header — ◆ ◇ ◆ Title ◆ ◇ ◆
 */
function futuristicHeader(title) {
  return `◆ ◇ ◆ ${toSC(title)} ◆ ◇ ◆`;
}

/**
 * Futuristic section — ▎ heading + ┊ lines
 *   ▎ᴜsᴇʀ ᴘʀᴏғɪʟᴇ
 *   ┊ Key : Value
 *   ┊ Key : Value
 */
function futuristicSection(heading, lines = []) {
  const out = [`▎${toSC(heading)}`];
  for (const line of lines) {
    out.push(`┊ ${line}`);
  }
  return out.join("\n");
}

/**
 * Progress bar — ▰▰▰▱▱▱
 * @param {number} value - current value
 * @param {number} max - max value
 * @param {number} width - bar width (default 8)
 */
function progressBar(value, max, width = 8) {
  const v = Math.max(0, Math.min(value, max));
  const filled = max > 0 ? Math.round((v / max) * width) : 0;
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

/**
 * Status dot — ● with emoji context
 */
function statusDot(status = "online") {
  const map = {
    online: "●",
    offline: "○",
    active: "●",
    idle: "◐",
    error: "✕",
  };
  return map[status.toLowerCase()] || "●";
}

/**
 * Clean divider — ┈┈┈┈┈┈┈┈┈┈┈┈
 */
function futuristicDivider(len = 28) {
  return "┈" + "┈".repeat(Math.min(len, 36));
}

/**
 * Futuristic footer
 *   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
 *   320 fitur · 25 kategori
 *   ɴᴏᴠᴀ ᴀɪ ᴡʜᴀᴛsᴀᴘᴘ ʙᴏᴛ
 */
function futuristicFooter(stats, botName) {
  return `${futuristicDivider()}\n${stats}\n${toSC(botName)}`;
}

/**
 * Align key-value with padding for clean look
 *   Nama      : Aizat
 *   Status    : Owner
 */
function kv(key, value, padTo = 10) {
  const k = String(key);
  const padded = k + " ".repeat(Math.max(0, padTo - k.length));
  return `${padded}: ${value}`;
}

/**
 * Futuristic command catalog section
 * Multi-column command listing per category:
 *   ▎🤖 ᴀɪ (32)
 *   ┊ .nova-ai  .aichat  .gpt5
 *   ┊ .deepseek  .qwen3  .gemini
 */
function futuristicCategory(emoji, name, commands, prefix, perLine = 3) {
  const header = `▎${emoji} ${toSC(name)} (${commands.length})`;
  const lines = [];
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    lines.push(`┊ ${chunk.map(c => `${prefix}${c}`).join("  ")}`);
  }
  return [header, ...lines].join("\n");
}

/**
 * Complete futuristic dashboard layout
 * @param {string} title - Main title
 * @param {string} intro - Greeting line under header
 * @param {Array} sections - [{ heading, lines }]
 * @param {string} footerStats - stats line
 * @param {string} botName - bot name for footer
 */
function futuristicDashboard(title, intro, sections = [], footerStats, botName) {
  const parts = [futuristicHeader(title)];
  if (intro) parts.push(`\n${intro}`);
  for (const sec of sections) {
    parts.push("\n" + futuristicSection(sec.heading, sec.lines));
  }
  parts.push("\n" + futuristicFooter(footerStats, botName));
  return parts.join("\n");
}

// ═══════════════════════════════════════════════
// BACKWARD COMPAT — fungsi lama (JANGAN diubah, 250+ plugin pakai ini)
// ═══════════════════════════════════════════════

// Section header: ╭─「 *Title* 」
function sectionHeader(title) {
  return `╭─「 *${toSC(title)}* 」`;
}

// Section item: │  ➥ text
function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│]\s*/g, '').replace(/^\s+/g, '');
  return `│  ➥ ${clean}`;
}

// Section close: ╰─
function sectionClose() {
  return `╰─`;
}

// Spacer line: │
function sectionSpacer() {
  return `│`;
}

// Build a complete section
function buildSection(title, items = []) {
  const lines = [sectionHeader(title)];
  for (const item of items) {
    lines.push(sectionItem(item));
  }
  lines.push(sectionClose());
  return lines.join("\n");
}

function claraHeader(title, emoji = "") {
  return `╭─「 *${toSC(title)}* 」`;
}

function bracketBox(emoji, label, lines = []) {
  const header = `╭─「 *${toSC(label)}* 」`;
  const body = lines.map((line) => {
    const clean = String(line)
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '')
      .replace(/^[•┊╎❏➶╭╰│]\s*/g, '');
    return `│  ➥ ${clean}`;
  });
  const footer = `╰─`;
  return [header, ...body, footer].join("\n");
}

function separator(char = "─", repeat = 20) {
  return `┊${"─".repeat(Math.min(repeat, 28))}┊`;
}

function tipText(text) {
  return `│  💡 *Tip:* ${text}`;
}

function claraWrap(title, body, type = "info") {
  const typeLabel = type === "error" ? " Error" : type === "success" ? " Success" : type === "warn" ? " Warning" : "";
  const lines = String(body).split("\n").filter(l => l.trim());
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
  const typeLabel = type === "private" ? "Private Chat" : type === "channel" ? "Channel" : "Grup";
  const lines = [
    `Bot: ${botName}`,
    `Pengirim: ${senderName}`,
    `Tipe: ${typeLabel}`,
    `Tanggal: ${tanggal}`,
    `Waktu: ${waktu}`,
    "",
    "Pesan:",
    message,
  ].filter(l => l !== undefined);
  return bracketBox("i", "Broadcast Info", lines.filter(l => l !== undefined));
}

function novaUsage(commandName, { steps = [], example = "", note = "", emoji = "" } = {}) {
  let lines = [];
  if (steps.length > 0) {
    lines.push("*Cara Pakai:*");
    for (const step of steps) {
      const clean = String(step)
        .replace(/^[•┊╎❏➶╭╰│]\s*/g, '')
        .replace(/^\s+/g, '');
      lines.push(clean);
    }
  }
  if (example) {
    lines.push('');
    lines.push(`*Contoh:* ${example}`);
  }
  if (note) {
    lines.push('');
    lines.push(`_${note}_`);
  }
  const title = emoji ? `${emoji} ${commandName}` : commandName;
  return bracketBox('i', title, lines);
}

// === Legacy info/list boxes (tetap dipakai beberapa plugin lama) ===
function infoBox(title, { intro, sections = [] } = {}) {
  const out = [`╭─「 ${toSC(title)} 」`];
  if (intro) out.push(`│ ${intro}`);
  for (const sec of sections) {
    out.push(`│`);
    if (sec.heading) out.push(`│  ◈ *${toSC(sec.heading)}*`);
    for (const line of sec.lines || []) {
      out.push(`│  ┊ ${line}`);
    }
  }
  out.push(`╰──────────────`);
  return out.join("\n");
}

function listBox(title, items = []) {
  const out = [`╭─「 ${toSC(title)} 」`];
  for (const item of items) out.push(`│  ◈ ${item}`);
  out.push(`╰──────────────`);
  return out.join("\n");
}

// ═══════════════════════════════════════════════
// NAV BUTTONS (untuk menu interaktif)
// ═══════════════════════════════════════════════

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Games", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

const CATEGORY_EMOJIS = {
  ai: "🤖", sticker: "🖼️", download: "📥", fun: "🎮",
  canvas: "🎨", tools: "🛠️", game: "🎯", rpg: "🗡️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
};

const CATEGORY_ORDER = [
  "main", "ai", "download", "sticker", "tools", "game", "rpg",
  "fun", "canvas", "media", "search", "group", "utility",
  "info", "cek", "religi", "economy", "user", "random",
  "premium", "ephoto", "jpm", "pushkontak", "panel",
  "store", "owner",
];

function buildNavButtons(prefix, isAllMenuCtx, allCatKeys, commandsByCategory, caseCats, isOwner) {
  const rows = [];
  for (const cat of allCatKeys.sort()) {
    if (cat === "owner" && !isOwner) continue;
    const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
    if (total === 0) continue;
    const name = CATEGORY_NAMES[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
    const emoji = CATEGORY_EMOJIS[cat] || "📂";
    rows.push({
      title: `${emoji} ${name}`,
      description: `${total} fitur`,
      id: `${prefix}menukategori ${cat}`,
    });
  }

  return [
    {
      type: "single_select",
      text: "📂 Kategori",
      sections: [{ title: "Pilih Kategori", rows }],
    },
    { id: `${prefix}owner`, text: "ℹ️ Info Lainnya" },
    isAllMenuCtx
      ? { id: `${prefix}menu`, text: "🏠 Menu" }
      : { id: `${prefix}allmenu`, text: "📋 All Menu" },
    { id: `${prefix}tanyaai`, text: "🤖 Tanya AI" },
  ];
}

export {
  // Futuristic v4
  futuristicHeader, futuristicSection, progressBar, statusDot,
  futuristicDivider, futuristicFooter, kv, futuristicCategory,
  futuristicDashboard, CATEGORY_ORDER,
  // Backward compat
  buildNavButtons,
  claraHeader, alyaHeader, bracketBox, claraWrap, claraLine,
  separator, tipText, formatNumber, broadcastFormat, novaUsage,
  toSC, sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  infoBox, listBox,
};
