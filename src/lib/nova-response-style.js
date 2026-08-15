const SMALL_CAPS = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
  i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
  q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
};


function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function separator(char = "━", repeat = 22) {
  return `*${char.repeat(repeat)}*`;
}

function tipText(text) {
  return `💡 *ᴛɪᴘ:* ${text}`;
}

function smartGreeting(prefix = ".", userName = "") {
  const hour = new Date().getHours();
  let timeGreeting = "Selamat malam";
  if (hour >= 4 && hour < 10) timeGreeting = "Selamat pagi";
  else if (hour >= 10 && hour < 14) timeGreeting = "Selamat siang";
  else if (hour >= 14 && hour < 18) timeGreeting = "Selamat sore";

  const namePart = userName ? `, ${userName}` : "";
  return `💬 *${"Sapaan"}*\n┃ ◦ ${timeGreeting}${namePart}! Ada yang bisa aku bantu?`;
}

function previewBlock(items = [], title = "Preview") {
  const lines = items.map(([label, value]) => {
    const val = typeof value === "undefined" || value === null ? "tidak diketahui" : value;
    return `┃ ◦ ${label}: *${val}*`;
  });
  return `╭┈┈⬡「 🎵 *${title}* 」\n` + lines.join("\n") + `\n╰┈┈⬡`;
}

function resultBlock(title, items = [], prefix = ".") {
  const header = `╭┈┈⬡「 📦 *${title}* 」`;
  const body = items.map((item, i) => {
    if (typeof item === "string") {
      return `┃ ${i + 1}. ${prefix}${item}`;
    }
    const name = item.name || item.command || "unknown";
    const alias = Array.isArray(item.alias) && item.alias.length ? ` (${item.alias.slice(0, 2).join(", ")})` : "";
    return `┃ ${i + 1}. ${prefix}${name}${alias}`;
  });
  const footer = `╰┈┈⬡`;
  return [header, ...body, footer].join("\n");
}

function aiChatBlock(role, text) {
  const prefix = role === "user" ? "👤" : "🤖";
  const label = role === "user" ? "kamu" : "bot";
  return `${prefix} *${label}:* ${text}`;
}

function chatBubble(role, text) {
  const prefix = role === "user" ? "👤" : "🤖";
  return `${prefix} ${text}`;
}

function infoBlock(title, lines = []) {
  const header = `╭┈┈⬡「 ℹ️ *${title}* 」`;
  const body = lines.map((line) => `┃ ◦ ${line}`);
  const footer = `╰┈┈⬡`;
  return [header, ...body, footer].join("\n");
}

function userInfoBlock(name, id, role = "User") {
  return infoBlock("User Info", [
    `Nama: ${name}`,
    `ID: ${id}`,
    `Role: ${role}`,
  ]);
}

function botInfoBlock(name, version = "1.0", status = "Online") {
  return infoBlock("Bot Info", [
    `Nama: ${name}`,
    `Versi: ${version}`,
    `Status: ${status}`,
  ]);
}

export {
  formatNumber,
  separator,
  tipText,
  smartGreeting,
  previewBlock,
  resultBlock,
  aiChatBlock,
  chatBubble,
  infoBlock,
  userInfoBlock,
  botInfoBlock,
};
