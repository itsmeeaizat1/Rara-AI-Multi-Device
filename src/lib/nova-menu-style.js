// === Nova AI Menu Style ===
// Clean Clara-MD bracket formatting system
// Format: ╔┈┈「 emoji *Title* 」╎❏ ╚┈┈❖

function claraHeader(title, emoji = "🌸") {
  return `╔┈┈「 ${emoji} *${title}* 」`;
}

function bracketBox(emoji, label, lines = []) {
  const header = `╔┈┈「 ${emoji} *${label}* 」\n╎`;
  const body = lines.map((line) => `╎❏ ${line}`);
  const footer = `╚┈┈┈┈┈┈┈┈┈┈┈┈❖`;
  return [header, ...body, footer].join("\n");
}

function separator(char = "┈", repeat = 22) {
  return `╚┈${char.repeat(repeat)}❖`;
}

function tipText(text) {
  return `🌸 *Tip:* ${text}`;
}

// === Clara-MD Auto Formatter ===
// Wraps any plain text into Clara-MD box style automatically
// Usage: claraWrap("Title", "body text") → styled output

function claraWrap(title, body, type = "info") {
  const tag = type === "error" ? "x" : type === "success" ? "v" : type === "warn" ? "!" : "i";
  
  // Split body into lines for bracketBox
  const lines = String(body).split("\n").filter(l => l.trim());
  
  // bracketBox already includes the header, so just use it directly
  return bracketBox(tag, title, lines);
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

export {
  claraHeader,
  alyaHeader, // backward compat
  bracketBox,
  claraWrap,
  claraLine,
  separator,
  tipText,
  formatNumber,
  broadcastFormat,
};


// === Broadcast Message Formatter ===
// Wraps broadcast content with consistent header info for recipients
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
