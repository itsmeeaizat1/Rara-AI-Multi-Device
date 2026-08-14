const SMALL_CAPS = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
  i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
  q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
};


function formatNumber(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function boxTitle(title, emoji = "📦") {
  return [
    `╔══════════════════╗`,
    `   ${emoji} *${title}*`,
    `╚══════════════════╝`,
  ].join("\n");
}

function alyaHeader(title, emoji = "🌸") {
  return `╔┈┈「 ${emoji} *${title}* 」`;
}

function bracketBox(emoji, label, lines = []) {
  const header = `╔┈┈「 ${emoji} *${label}* 」\n╎`;
  const body = lines.map((line) => `╎❏ ${line}`);
  const footer = `╚┈┈┈┈┈┈┈┈┈┈┈┈❖`;
  return [header, ...body, footer].join("\n");
}

function infoBlock(items = []) {
  const lines = items.map(([label, value]) => {
    const val = typeof value === "undefined" || value === null ? "tidak diketahui" : value;
    return `◦ ${label}: *${val}*`;
  });
  return bracketBox("📊", "ɪɴꜰᴏ", lines);
}

function userInfoBlock(pushName, username, status, role = "user") {
  const roleTag = role === "owner" ? "👑" : role === "premium" ? "💎" : "👤";
  return bracketBox(roleTag, "Profil", [
    `◦ Name: *${pushName || "Guest"}*`,
    `◦ User: *@${username || "unknown"}*`,
    `◦ Status: *${status || "active"}*`,
    `◦ Role: *${role}*`,
  ]);
}

function categoryBlock(category, emoji, commands = [], prefix = ".") {
  const items = commands.map((cmd, i) => {
    const aliases = Array.isArray(cmd.alias) && cmd.alias.length
      ? ` (${cmd.alias.slice(0, 2).join(", ")})`
      : "";
    const name = typeof cmd === "string" ? cmd : cmd.name;
    return `${i + 1}. ${prefix}${name}${aliases}`;
  });
  return bracketBox(emoji, category, items);
}

function separator(char = "┈", repeat = 22) {
  return `╚┈${char.repeat(repeat)}❖`;
}

function tipText(text) {
  return `🌸 *ᴛɪᴘ:* ${text}`;
}

function alyaCategoryRow(emoji, name, description) {
  return `${emoji} *${(name)}*\n  ◦ ${description}`;
}

function toMonoUpperBold(text = "") {
  const chars = {
    A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛",
    I: "𝗜", J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣",
    Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫",
    Y: "𝗬", Z: "𝗭",
  };
  return String(text || "").toUpperCase().split("").map((c) => chars[c] || c).join("");
}

export {
  toMonoUpperBold,
  formatNumber,
  boxTitle,
  alyaHeader,
  bracketBox,
  infoBlock,
  userInfoBlock,
  categoryBlock,
  separator,
  tipText,
  alyaCategoryRow,
  claraWrap,
  claraLine,
};

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
  return bracketBox("i"(title), [text]);
}
