// === Nova AI Menu Style (v3 — Clean Box Drawing) ===
// Format konsisten: ╭─「 title 」 / │  ➥ item / ╰─
// Semua fungsi lama (claraWrap, bracketBox, claraHeader, dll) tetap export
// dengan nama yang sama untuk backward compat — tinggal output-nya berubah.

// Small caps map
const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

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

// === Backward compat functions ===
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


// === Info-style box (◈ subsection + ┊ detail) ===
// Dipakai KHUSUS untuk info/profile (.menu) dan daftar command (.allmenu,
// .allmenucategory, .menu2) — beda dari bracketBox (➥) yang dipakai untuk
// caption/petunjuk cara pakai di tiap plugin (JANGAN diganti, sudah benar).
//
// Struktur:
//   ╭─「 Title 」
//   │ intro (opsional, baris bebas di bawah judul)
//   │
//   │  ◈ *Heading Subsection* (opsional)
//   │  ┊ Key: value
//   ╰──────────────
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

// Daftar command polos (tanpa subsection), tiap item pakai bullet ◈.
//   ╭─「 Title 」
//   │  ◈ item1
//   │  ◈ item2
//   ╰──────────────
function listBox(title, items = []) {
  const out = [`╭─「 ${toSC(title)} 」`];
  for (const item of items) out.push(`│  ◈ ${item}`);
  out.push(`╰──────────────`);
  return out.join("\n");
}

export {
  buildNavButtons,
  claraHeader, alyaHeader, bracketBox, claraWrap, claraLine,
  separator, tipText, formatNumber, broadcastFormat, novaUsage,
  toSC, sectionHeader, sectionItem, sectionClose, sectionSpacer, buildSection,
  infoBox, listBox,
};

// === Tombol navigasi untuk menu (single_select untuk Kategori) ===
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

/**
 * Build 4 tombol navigasi: Kategori (single_select popup), Info Lainnya, All Menu/Menu, Tanya AI.
 * @param {string} prefix - Command prefix
 * @param {boolean} isAllMenuCtx - kalau true, tombol ke-3 jadi "🏠 Menu", kalau false jadi "📋 All Menu"
 * @param {Array} allCatKeys - semua key kategori yang tersedia
 * @param {object} commandsByCategory - map cat → commands
 * @param {object} caseCats - map cat → case commands
 * @param {boolean} isOwner - kalau true, tampilkan kategori owner
 * @returns {Array} buttons array untuk sendMenuCard
 */
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
