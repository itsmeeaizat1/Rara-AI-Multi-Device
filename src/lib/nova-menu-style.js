// === Nova AI Menu Style (v6 — Clean Caption Style) ===
// Aesthetic khas bot WhatsApp dev Indonesia:
// ╭──「 」 box drawing, │ clean lines (no bullets), ❀ footer
// + modern data: ▰▱ progress bars, ● status dots, system info
// Semua fungsi lama tetap export dengan signature sama.

// Small caps map
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

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
    return `│ ${clean}`;
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
  const k = String(key);
  const padded = k + " ".repeat(Math.max(0, padTo - k.length));
  return `${padded} : ${value}`;
}

function categoryBox(emoji, name, commands, prefix, perLine = 3) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const header = `╭──「 ${emojiStr}${toSC(name)} (${commands.length}) 」`;
  const lines = [];
  for (let i = 0; i < commands.length; i += perLine) {
    const chunk = commands.slice(i, i + perLine);
    lines.push(`│ ${chunk.map(c => `${prefix}${c}`).join("  ")}`);
  }
  const footer = `╰──────────❀`;
  return [header, ...lines, footer].join("\n");
}

// ═══════════════════════════════════════════════
// BACKWARD COMPAT — fungsi lama, signature sama
// Output: Clean Caption Style v6 (no ❏ bullets)
// Dipakai oleh 1266+ file plugin. Update di sini = update semua.
// ═══════════════════════════════════════════════

function sectionHeader(title) {
  return `╭──「 *${toSC(title)}* 」`;
}

function sectionItem(text) {
  const clean = String(text).replace(/^[•┊╎❏➶╭╰│]\s*/g, '').replace(/^\s+/g, '');
  return `│ ${clean}`;
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
    return `│ ${clean}`;
  });
  const footer = `╰──────────❀`;
  return [header, ...body, footer].join("\n");
}

function separator(char = "─", repeat = 20) {
  return "─".repeat(Math.min(repeat, 28));
}

function tipText(text) {
  return `│ 💡 *Tip:* ${text}`;
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

// novaUsage: pesan usage yang menarik dengan emoji labels
// Output:
// ╭──「 🎵 Tiktok Download 」
// │
// │ 📌 *Cara Pakai:*
// │ `.tiktok2 <url>`
// │
// │ 💡 *Contoh:*
// │ `.tiktok2 https://vt.tiktok.com/xxx`
// │
// ╰──────────❀
function novaUsage(commandName, { steps = [], example = "", note = "", emoji = "" } = {}) {
  let lines = [];
  if (steps.length > 0) {
    lines.push("");
    lines.push("📌 *Cara Pakai:*");
    for (const step of steps) {
      const clean = String(step)
        .replace(/^[•┊╎❏➶╭╰│]\s*/g, '')
        .replace(/^\s+/g, '');
      lines.push(clean);
    }
  }
  if (example) {
    lines.push("");
    lines.push("💡 *Contoh:*");
    lines.push(`\`${example}\``);
  }
  if (note) {
    lines.push("");
    lines.push(`_${note}_`);
  }
  lines.push("");
  const title = emoji ? `${emoji} ${commandName}` : commandName;
  return bracketBox('i', title, lines);
}

function infoBox(title, { intro, sections = [] } = {}) {
  const out = [`╭──「 ${toSC(title)} 」`];
  if (intro) out.push(`│ ${intro}`);
  for (const sec of sections) {
    out.push(`│`);
    if (sec.heading) out.push(`│ ◈ *${toSC(sec.heading)}*`);
    for (const line of sec.lines || []) {
      out.push(`│ ┊ ${line}`);
    }
  }
  out.push(`╰──────────❀`);
  return out.join("\n");
}

function listBox(title, items = []) {
  const out = [`╭──「 ${toSC(title)} 」`];
  for (const item of items) out.push(`│ ${item}`);
  out.push(`╰──────────❀`);
  return out.join("\n");
}

// ═══════════════════════════════════════════════
// NAV BUTTONS
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
      text: "Kategori",
      sections: [{ title: "Pilih Kategori", rows }],
    },
    { id: `${prefix}owner`, text: "Info Lainnya" },
    isAllMenuCtx
      ? { id: `${prefix}menu`, text: "Menu" }
      : { id: `${prefix}allmenu`, text: "All Menu" },
    { id: `${prefix}tanyaai`, text: "Tanya AI" },
  ];
}

export {
  botHeader, botSignature, sectionBox, progressBar, statusDot,
  kv, categoryBox, CATEGORY_ORDER, CATEGORY_NAMES, CATEGORY_EMOJIS,
  buildNavButtons,
  claraHeader, alyaHeader, bracketBox, claraWrap, claraLine,
  separator, tipText, formatNumber, broadcastFormat, novaUsage,
  toSC, sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  infoBox, listBox, novaCaption,
};

// novaCaption: caption menarik per-fitur dari metadata plugin
// ╭──「 🎵 TikTok Download 」
// │ Download video TikTok tanpa watermark
// │
// │ 📌 *Cara Pakai:*
// │ `.tiktok2 <url>`
// │
// │ 💡 *Contoh:*
// │ `.tiktok2 https://vt.tiktok.com/xxx`
// │
// ╰──────────❀
function novaCaption({ emoji = "", name = "", description = "", usage = "", example = "", note = "" } = {}) {
  const emojiStr = isRealEmoji(emoji) ? `${emoji} ` : "";
  const lines = [];
  
  if (description) {
    lines.push(description);
    lines.push("");
  }
  
  if (usage) {
    lines.push("📌 *Cara Pakai:*");
    lines.push(`\`${usage}\``);
    lines.push("");
  }
  
  if (example) {
    lines.push("💡 *Contoh:*");
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
    lines.push("");
  }
  
  return bracketBox("i", `${emojiStr}${name}`, lines);
}
