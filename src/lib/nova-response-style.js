// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const SMALL_CAPS = {
  a: "A", b: "B", c: "C", d: "D", e: "E", f: "F", g: "G", h: "H",
  i: "I", j: "J", k: "K", l: "L", m: "M", n: "N", o: "O", p: "P",
  q: "Q", r: "R", s: "s", t: "T", u: "U", v: "V", w: "W", x: "x",
  y: "Y", z: "Z",
};

function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function tipText(text) {
  return `  ┊  ➶ 💡 *Tip:* ${text}`;
}

function smartGreeting(prefix = ".", userName = "") {
  const hour = new Date().getHours();
  let timeGreeting = "Selamat malam";
  if (hour >= 4 && hour < 10) timeGreeting = "Selamat pagi";
  else if (hour >= 10 && hour < 14) timeGreeting = "Selamat siang";
  else if (hour >= 14 && hour < 18) timeGreeting = "Selamat sore";

  const namePart = userName ? `, ${userName}` : "";
  return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀\n┊\n  ┊  ➶ ${timeGreeting}${namePart}! Ada yang bisa aku bantu?\n┊\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
}

function previewBlock(items = [], title = "Preview") {
  const lines = items.map(([label, value]) => {
    const val = typeof value === "undefined" || value === null ? "tidak diketahui" : value;
    return `  ┊  ➶ *${label}:* ${val}`;
  });
  return `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${title}\n┊\n${lines.join("\n")}\n┊\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
}

function resultBlock(title, items = [], prefix = ".") {
  const body = items.map((item, i) => {
    if (typeof item === "string") {
      return `  ┊  ➶ ${i + 1}. ${prefix}${item}`;
    }
    const name = item.name || item.command || "unknown";
    const alias = Array.isArray(item.alias) && item.alias.length ? ` (${item.alias.slice(0, 2).join(", ")})` : "";
    return `  ┊  ➶ ${i + 1}. ${prefix}${name}${alias}`;
  });
  return [`❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${title}`, `┊`, ...body, `┊`, `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`].join("\n");
}

function aiChatBlock(role, text) {
  const emoji = role === "user" ? "👤" : "🤖";
  const label = role === "user" ? "Kamu" : "Bot";
  return `${emoji} *${label}:* ${text}`;
}

function chatBubble(role, text) {
  const emoji = role === "user" ? "👤" : "🤖";
  return `${emoji} ${text}`;
}

function infoBlock(title, lines = []) {
  const body = lines.map((line) => `  ┊  ➶ ${line}`);
  return [`❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ${title}`, `┊`, ...body, `┊`, `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`].join("\n");
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
