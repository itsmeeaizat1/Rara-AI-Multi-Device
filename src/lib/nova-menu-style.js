// === Nova AI Menu Style (v2 — Kaomoji) ===
// Format: ❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Title, ┊ ➶ bullets, ❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀ footer
// Semua fungsi lama (claraWrap, bracketBox, claraHeader, dll) tetap export
// dengan nama yang sama untuk backward compat — tinggal output-nya berubah.

function claraHeader(title, emoji = "🌸") {
  // emoji param tetap diterima untuk compat, tapi gak dipakai di header baru
  return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${title}`;
}

function bracketBox(emoji, label, lines = []) {
  // emoji param tetap diterima untuk compat, tapi header baru gak pakai emoji
  const header = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${label}\n`;
  const body = lines.map((line) => {
    // Strip prefix lama (╎❏, ╎, ┊ ➶) kalau ada — hindari double prefix
    const clean = String(line)
      .replace(/^╎❏\s*/, '')
      .replace(/^╎\s*$/, '')
      .replace(/^┊\s+➶\s*/, '');
    return `  ┊  ➶ ${clean}`;
  });
  const footer = `\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
  return [header, ...body, footer].join("\n");
}

function separator(char = "┈", repeat = 22) {
  return `❀${"˖".repeat(Math.min(repeat, 22))}❀`;
}

function tipText(text) {
  return `❀ *Tip:* ${text}`;
}

// === Nova Auto Formatter (v2) ===
// Wraps any plain text into Kaomoji style automatically
// Usage: claraWrap("Title", "body text") → styled output

function claraWrap(title, body, type = "info") {
  const typeLabel = type === "error" ? " ERROR" : type === "success" ? " SUCCESS" : type === "warn" ? " WARNING" : "";
  const lines = String(body).split("\n").filter(l => l.trim());
  return bracketBox(type, title + typeLabel, lines);
}

// Quick format for single-line responses
function claraLine(title, text) {
  return bracketBox("i", title, [text]);
}

// Backward compat alias
const alyaHeader = claraHeader;

// Format number with comma separator (e.g. 1234567 -> "1,234,567")
function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// === Broadcast Message Formatter ===
function broadcastFormat({ botName = "Nova AI", senderName = "Owner", message, type = "group" }) {
  const now = new Date()
  const tanggal = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const waktu = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  const typeLabel = type === "private" ? "Private Chat" : type === "channel" ? "Channel" : "Grup"
  
  const lines = [
    `Bot: ${botName}`,
    `Pengirim: ${senderName}`,
    `Tipe: ${typeLabel}`,
    `Tanggal: ${tanggal}`,
    `Waktu: ${waktu}`,
    "",
    "Pesan:",
    message,
  ].filter(l => l !== undefined)
  
  return bracketBox("📢", "BROADCAST INFO", lines.filter(l => l !== undefined))
}

export {
  claraHeader,
  alyaHeader,
  bracketBox,
  claraWrap,
  claraLine,
  separator,
  tipText,
  formatNumber,
  broadcastFormat,
};

// === Nova Usage Formatter ===
// Format pesan usage yang konsisten & khas Nova AI
// Pattern: header kaomoji → cara pakai → contoh → catatan → footer
// Semua rata kiri, pakai ┊ ➶ bullets, no box-drawing

function novaUsage(commandName, { steps = [], example = "", note = "", emoji = "" }) {
  const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => SC_MAP[c.toLowerCase()]?.toUpperCase() || c);

  let lines = [];

  // Cara pakai
  if (steps.length > 0) {
    lines.push(`*Cara Pakai:*`);
    for (const step of steps) {
      // Strip leading bullets/karakter lama, pastikan rata kiri
      const clean = String(step)
        .replace(/^[•┊╎❏➶]\s*/g, '')
        .replace(/^\s+/g, '');
      lines.push(clean);
    }
  }

  // Contoh
  if (example) {
    lines.push('');
    lines.push(`*Contoh:* ${example}`);
  }

  // Catatan
  if (note) {
    lines.push('');
    lines.push(`_${note}_`);
  }

  const title = emoji ? `${emoji} ${toSC(commandName)}` : toSC(commandName);
  return bracketBox('i', title, lines);
}

export { novaUsage };
