// === Nova AI Menu Style (v7 — Full SmallCaps) ===
// Aesthetic khas bot WhatsApp dev Indonesia:
// ╭──「 」 box drawing, │ clean lines (no bullets), ❀ footer
// + modern data: ▰▱ progress bars, ● status dots, system info
// SEMUA text pakai smallcaps font (toSC diterapkan ke header + body)
// Semua fungsi lama tetap export dengan signature sama.

// Small caps map (q & x tidak ada di Unicode smallcaps, tetap as-is)
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};

// toSC: convert a-zA-Z → smallcaps, sisanya tetap
const toSC = (s) => String(s).replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);

// scLine: apply smallcaps to text content, tapi preserve:
// - box drawing chars (╭╮╰╯│├─┊❀)
// - emoji & special symbols (📌💡⚠️🐦 dll)
// - markdown markers (* ` _)
// - URLs (http/https jangan di-convert)
// - numbers
// - leading │ prefix
const scLine = (line) => {
  const str = String(line);
  if (!str || !str.trim()) return str;
  // Jangan convert URL
  // Split by URL pattern, convert non-URL parts, rejoin
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = str.split(urlRegex);
  return parts.map((part, i) => {
    // Odd indices = URLs (from split with capture group)
    if (i % 2 === 1) return part;
    // Even indices = normal text → smallcaps
    return toSC(part);
  }).join('');
};

// Helper: detect real emoji (bukan "i" atau teks biasa)
const isRealEmoji = (s) => s && /\p{Extended_Pictographic}/u.test(s);

// ═══════════════════════════════════════════════
// INDO DEV STYLE FUNCTIONS (untuk menu/allmenu/allmenucategory)
// ═══════════════════════════════════════════════

function botHeader(botName) {
  return `╭──「 *${toSC(botName)}* 」`;
}

function botSignature(botName) {
  return `╰──────────❀`;
}

function sectionBox(emoji, title, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const header = `╭──「 ${emojiStr}${toSC(title)} 」`;
  const body = lines.map(line => {
    const clean = String(line)
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '')
      .replace(/^[•┊╎❏➶╭╰│]\s*/g, '');
    return `│ ${scLine(clean)}`;
  });
  const footer = `╰──────────❀`;
  return [header, ...body, footer].join("\n");
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
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const header = `╭──「 ${emojiStr}${toSC(name)} (${commands.length}) 」`;
  const lines = [];
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    lines.push(`│ ${chunk.map(c => `${prefix}${toSC(c)}`).join("  ")}`);
  }
  const footer = `╰──────────❀`;
  return [header, ...lines, footer].join("\n");
}

// ═══════════════════════════════════════════════
// BACKWARD COMPAT — fungsi lama, signature sama
// Output: Full SmallCaps Style v7 (semua text ke-smallcaps)
// Dipakai oleh 1266+ file plugin. Update di sini = update semua.
// ═══════════════════════════════════════════════

function sectionHeader(title) {
  return `╭──「 *${toSC(title)}* 」`;
}

function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│]\s*/g, '').replace(/^\s+/g, '');
  return `│ ${scLine(clean)}`;
}

function sectionClose() {
  return `╰──────────❀`;
}

function sectionSpacer() {
  return `│`;
}

function buildSection(title, items = []) {
  const lines = [sectionHeader(title)];
  for (const item of items) {
    lines.push(sectionItem(item));
  }
  lines.push(sectionClose());
  return lines.join("\n");
}

function claraHeader(title, emoji = "") {
  if (isRealEmoji(emoji)) return `╭──「 ${emoji} ${toSC(title)} 」`;
  return `╭──「 *${toSC(title)}* 」`;
}

function bracketBox(emoji, label, lines = []) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const header = `╭──「 ${emojiStr}*${toSC(label)}* 」`;
  const body = lines.map((line) => {
    const clean = String(line)
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '')
      .replace(/^[•┊╎❏➶╭╰│]\s*/g, '');
    return `│ ${scLine(clean)}`;
  });
  const footer = `╰──────────❀`;
  return [header, ...body, footer].join("\n");
}

// commandListLine: baris command di list menu (allmenu/allmenucategory)
// Format: ♦ .ᴄᴍᴅ <ᴘᴀʀᴀᴍ> Ⓛ — smallcaps diterapkan ke semua
function commandListLine(prefix, cmdName, usage = "", symbols = "") {
  const paramMatches = usage ? String(usage).match(/<[^>]+>/g) : null;
  const paramPart = paramMatches ? " " + toSC(paramMatches.join(" ")) : "";
  const symbolPart = symbols ? " " + String(symbols).trim() : "";
  return `♦ ${prefix}${toSC(String(cmdName))}${paramPart}${symbolPart}`;
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

  let text = `╭──「 ${typeIcon} ${toSC("Broadcast Info")} 」`;
  text += "\n│";
  text += `\n├──「 *${toSC("Detail")}* 」`;
  text += `\n│ *${toSC("Bot")}:* ${scLine(botName)}`;
  text += `\n│ *${toSC("Dari")}:* ${scLine(senderName)}`;
  text += `\n│ *${toSC("Tipe")}:* ${typeIcon} ${scLine(typeLabel)}`;
  text += `\n│ *${toSC("Tanggal")}:* ${tanggal}`;
  text += `\n│ *${toSC("Waktu")}:* ${waktu} ${toSC("WIB")}`;
  text += "\n├──";
  text += `\n├──「 *${toSC("Pesan")}* 」`;
  text += "\n│ " + String(message || "").split("\n").map(l => l.trim() ? `│ ${scLine(l)}` : "│").join("\n");
  text += "\n├──";
  text += `\n├── ⚠️ _${toSC("Pesan resmi dari owner bot")}_`;
  text += "\n╰──────────❀";
  return text;
}

// novaUsage: pesan usage yang menarik dengan emoji labels
// SEMUA text pakai smallcaps (kecuali URL & command syntax di backtick)
function novaUsage(commandName, { steps = [], example = "", note = "", emoji = "" } = {}) {
  let lines = [];
  if (steps.length > 0) {
    lines.push("");
    lines.push(`📌 *${toSC("Cara Pakai")}:*`);
    for (const step of steps) {
      const clean = String(step)
        .replace(/^[•┊╎❏➶╭╰│]\s*/g, '')
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
  const out = [`╭──「 ${toSC(title)} 」`];
  if (intro) out.push(`│ ${scLine(intro)}`);
  for (const sec of sections) {
    out.push(`│`);
    if (sec.heading) out.push(`│ ◈ *${toSC(sec.heading)}*`);
    for (const line of sec.lines || []) {
      out.push(`│ ┊ ${scLine(line)}`);
    }
  }
  out.push(`╰──────────❀`);
  return out.join("\n");
}

function listBox(title, items = []) {
  const out = [`╭──「 ${toSC(title)} 」`];
  for (const item of items) out.push(`│ ${scLine(item)}`);
  out.push(`╰──────────❀`);
  return out.join("\n");
}

// ═══════════════════════════════════════════════
// NAV BUTTONS
// ═══════════════════════════════════════════════

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", rpg: "RPG", "rpg cinta": "RPG Cinta",
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
  canvas: "🎨", tools: "🛠️", rpg: "🎯", "rpg cinta": "❤️",
  media: "🎬", search: "🔍", group: "👥", main: "🏠",
  utility: "🔧", religi: "☪️", info: "ℹ️", cek: "📋",
  economy: "💰", user: "📊", random: "🎲", premium: "💎",
  ephoto: "🎨", jpm: "📢", pushkontak: "📱",
  panel: "🖥️", owner: "👑", store: "🛒",
  anime: "🎌", asupan: "😍", clan: "🛡️", convert: "🔄",
  downloader: "📥", education: "📚", food: "🍔",
  future: "🌌", islami: "☪️", islamic: "🕋", menu: "📋",
  maker: "🖌️", news: "📰", nsfw: "🔞", linode: "☁️",
  primbon: "🔮", cecan: "💃", stalker: "🕵️", tts: "🔊",
  vps: "🖧",
};

const CATEGORY_ORDER = [
  "main", "ai", "download", "sticker", "tools", "rpg", "rpg cinta",
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
    const emoji = CATEGORY_EMOJIS[cat] || "📋";
    rows.push({
      title: `${emoji} ${toSC(name)}`,
      description: `${total} ${toSC("fitur")}`,
      id: `${prefix}menukategori ${cat}`,
    });
  }

  return [
    {
      type: "single_select",
      text: toSC("Kategori"),
      sections: [{ title: toSC("Pilih Kategori"), rows }],
    },
    { id: `${prefix}owner`, text: toSC("Info Lainnya") },
    isAllMenuCtx
      ? { id: `${prefix}menu`, text: toSC("Menu") }
      : { id: `${prefix}allmenu`, text: toSC("All Menu") },
    { id: `${prefix}tanyaai`, text: toSC("Tanya AI") },
  ];
}

// novaCaption: caption menarik per-fitur dari metadata plugin
// SEMUA text pakai smallcaps
function novaCaption({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const lines = [];
  
  if (description) {
    lines.push(scLine(description));
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
    lines.push(`📝 _${scLine(note)}_`);
    lines.push("");
  }
  
  return bracketBox("i", `${emojiStr}${name}`, lines);
}

export {
  botHeader, botSignature, sectionBox, progressBar, statusDot,
  kv, categoryBox, CATEGORY_ORDER, CATEGORY_NAMES, CATEGORY_EMOJIS,
  buildNavButtons,
  claraHeader, alyaHeader, bracketBox, claraWrap, claraLine,
  separator, tipText, formatNumber, broadcastFormat, novaUsage,
  toSC, scLine, sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  infoBox, listBox, novaCaption, commandListLine,
};
