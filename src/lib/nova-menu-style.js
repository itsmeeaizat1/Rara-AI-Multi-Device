// === Nova AI Menu Style (v4 — Futuristic Dashboard) ===
// Modern futuristic design: ▎ sections, ┊ details, ▰▱ progress bars, ● status
// Semua fungsi lama (claraWrap, bracketBox, dll) tetap export dengan signature sama,
// tapi output-nya sekarang pakai style futuristik v4.

// Small caps map
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

// Helper: detect real emoji (multi-char unicode), bukan "i" atau teks biasa
const isRealEmoji = (s) => s && /\p{Extended_Pictographic}/u.test(s);

// ═══════════════════════════════════════════════
// FUTURISTIC v4 FUNCTIONS (untuk menu/allmenu/allmenucategory)
// ═══════════════════════════════════════════════

function futuristicHeader(title) {
  return `◆ ◇ ◆ ${toSC(title)} ◆ ◇ ◆`;
}

function futuristicSection(heading, lines = []) {
  const out = [`▎${toSC(heading)}`];
  for (const line of lines) {
    out.push(`┊ ${line}`);
  }
  return out.join("\n");
}

function progressBar(value, max, width = 8) {
  const v = Math.max(0, Math.min(value, max));
  const filled = max > 0 ? Math.round((v / max) * width) : 0;
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

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

function futuristicDivider(len = 28) {
  return "┈" + "┈".repeat(Math.min(len, 36));
}

function futuristicFooter(stats, botName) {
  return `${futuristicDivider()}\n${stats}\n${toSC(botName)}`;
}

function kv(key, value, padTo = 10) {
  const k = String(key);
  const padded = k + " ".repeat(Math.max(0, padTo - k.length));
  return `${padded}: ${value}`;
}

function futuristicCategory(emoji, name, commands, prefix, perLine = 3) {
  const header = `▎${emoji} ${toSC(name)} (${commands.length})`;
  const lines = [];
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    lines.push(`┊ ${chunk.map(c => `${prefix}${c}`).join("  ")}`);
  }
  return [header, ...lines].join("\n");
}

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
// BACKWARD COMPAT — fungsi lama, signature sama, output futuristik v4
// Dipakai oleh 1266+ file plugin. Update di sini = update semua plugin.
// ═══════════════════════════════════════════════

// Section header: ▎Title (was ╭─「 *Title* 」)
function sectionHeader(title) {
  return `▎${toSC(title)}`;
}

// Section item: ┊ text (was │  ➥ text)
function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│]\s*/g, '').replace(/^\s+/g, '');
  return `┊ ${clean}`;
}

// Section close: ┈┈┈ (was ╰─)
function sectionClose() {
  return futuristicDivider();
}

// Spacer line: ┊ (was │)
function sectionSpacer() {
  return `┊`;
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

// claraHeader: ▎Emoji Title (was ╭─「 *Title* 」)
function claraHeader(title, emoji = "") {
  if (isRealEmoji(emoji)) return `▎${emoji} ${toSC(title)}`;
  return `▎${toSC(title)}`;
}

// bracketBox: ▎Label / ┊ lines / ┈┈┈ (was ╭─「 」 / │ ➥ / ╰─)
// Emoji param: hanya render kalau emoji asli, bukan "i" atau teks
function bracketBox(emoji, label, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const header = `▎${emojiStr}${toSC(label)}`;
  const body = lines.map((line) => {
    const clean = String(line)
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '')
      .replace(/^[•┊╎❏➶╭╰│]\s*/g, '');
    return `┊ ${clean}`;
  });
  const footer = futuristicDivider();
  return [header, ...body, footer].join("\n");
}

// separator: ┈┈┈┈┈┈┈ (was ┊──────┊)
function separator(char = "─", repeat = 20) {
  return futuristicDivider(repeat);
}

// tipText: ┊ 💡 Tip: text (was │  💡 *Tip:* text)
function tipText(text) {
  return `┊ 💡 Tip: ${text}`;
}

// claraWrap: calls bracketBox — auto futuristic
function claraWrap(title, body, type = "info") {
  const typeLabel = type === "error" ? " — Error" : type === "success" ? " — Success" : type === "warn" ? " — Warning" : "";
  const raw = Array.isArray(body) ? body : String(body).split("\n");
  const lines = raw.filter(l => l.trim());
  return bracketBox(type, title + typeLabel, lines);
}

// claraLine: calls bracketBox — auto futuristic
function claraLine(title, text) {
  return bracketBox("i", title, [text]);
}

const alyaHeader = claraHeader;

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// broadcastFormat: calls bracketBox — auto futuristic
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

// novaUsage: calls bracketBox — auto futuristic
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

// infoBox: futuristic style (was ╭─「 」 / │ ◈ / │ ┊ / ╰──)
function infoBox(title, { intro, sections = [] } = {}) {
  const out = [`▎${toSC(title)}`];
  if (intro) out.push(`┊ ${intro}`);
  for (const sec of sections) {
    out.push(`┊`);
    if (sec.heading) out.push(`┊ ◈ *${toSC(sec.heading)}*`);
    for (const line of sec.lines || []) {
      out.push(`┊   ${line}`);
    }
  }
  out.push(futuristicDivider());
  return out.join("\n");
}

// listBox: futuristic style (was ╭─「 」 / │ ◈ / ╰──)
function listBox(title, items = []) {
  const out = [`▎${toSC(title)}`];
  for (const item of items) out.push(`┊ ◈ ${item}`);
  out.push(futuristicDivider());
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
  // Backward compat (futuristic output, same signature)
  buildNavButtons,
  claraHeader, alyaHeader, bracketBox, claraWrap, claraLine,
  separator, tipText, formatNumber, broadcastFormat, novaUsage,
  toSC, sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  infoBox, listBox,
};
