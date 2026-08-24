// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "enable",
  alias: ["en", "turnon"],
  category: "owner",
  description: "Mengaktifkan fitur grup (welcome, antilink, antisticker, dll)",
  usage: ".enable <fitur> [opsi]",
  example: ".enable welcome\n.enable antilinkgc kick\n.enable antisticker",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  isBotAdmin: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// dbKey, onValue, offValue, label, optional modeKey + modes
const FEATURES = {
  welcome:        { label: "Welcome",        dbKey: "welcome",       on: true,  off: false },
  goodbye:        { label: "Goodbye",        dbKey: "goodbye",       on: true,  off: false },
  autoreaction:   { label: "Auto Reaction",  dbKey: "autoreaction",  on: true,  off: false },
  autosticker:    { label: "Auto Sticker",   dbKey: "autosticker",   on: true,  off: false },
  autoreply:      { label: "Auto Reply",     dbKey: "autoreply",     on: true,  off: false },
  automedia:      { label: "Auto Media",     dbKey: "automedia",     on: true,  off: false },
  autodl:         { label: "Auto Download",  dbKey: "autodl",        on: true,  off: false },
  autosambut:    { label: "Auto Sambut",    dbKey: "autoSambut",   on: true,  off: false },
  autoforward:    { label: "Auto Forward",   dbKey: "autoforward",   on: true,  off: false },
  antilinkgc:     { label: "Anti Link Grup", dbKey: "antilinkgc",    on: "on",  off: "off", modeKey: "antilinkgcMode",  modes: ["kick","remove"] },
  antilinkall:    { label: "Anti Link All",  dbKey: "antilinkall",   on: "on",  off: "off", modeKey: "antilinkallMode", modes: ["kick","remove"] },
  antivn:         { label: "Anti VN",        dbKey: "antivn",        on: true,  off: false },
  antifoto:       { label: "Anti Foto",       dbKey: "antifoto",      on: true,  off: false },
  antivideo:      { label: "Anti Video",      dbKey: "antivideo",     on: true,  off: false },
  antisticker:    { label: "Anti Sticker",   dbKey: "antisticker",   on: "on",  off: "off" },
  antitoxic:      { label: "Anti Toxic",     dbKey: "antitoxic",     on: true,  off: false },
  antikasar:      { label: "Anti Kasar",     dbKey: "antikasar",     on: "on",  off: "off" },
  anti18plus:     { label: "Anti 18+",       dbKey: "anti18plus",    on: "on",  off: "off" },
  antibucin:      { label: "Anti Bucin",     dbKey: "antibucin",     on: "on",  off: "off" },
  antijudol:      { label: "Anti Judol",     dbKey: "antijudol",     on: "on",  off: "off" },
  antiribut:      { label: "Anti Ribut",     dbKey: "antiribut",     on: "on",  off: "off" },
  antibot:        { label: "Anti Bot",       dbKey: "antibot",       on: true,  off: false },
  antiphising:    { label: "Anti Phising",   dbKey: "antiphising",   on: "on",  off: "off" },
  antiswgc:       { label: "Anti SW Grup",   dbKey: "antiswgc",      on: "on",  off: "off" },
  antitagsw:      { label: "Anti Tag SW",    dbKey: "antitagsw",     on: "on",  off: "off" },
  antiremove:     { label: "Anti Delete",    dbKey: "antiremove",    on: "on",  off: "off" },
  anticustom:     { label: "Anti Custom",   dbKey: "anticustom",    on: "on",  off: "off", modeKey: "anticustomMode", modes: ["kick","remove","warn"] },
  antimedia:      { label: "Anti Media",     dbKey: "antimedia",     on: "on",  off: "off" },
  antidocument:   { label: "Anti Document",  dbKey: "antidocument",  on: "on",  off: "off" },
  antivirtex:     { label: "Anti Virtex",    dbKey: "antivirtex",    on: true,  off: false },
  antibug:        { label: "Anti Bug",       dbKey: "antibug",        on: true,  off: false },
  antinomorluar:  { label: "Anti Nomor Luar", dbKey: "antinomorluar", on: true,  off: false, extraKey: "nomorluarBlock", defaultExtra: "60" },
  antispam:       { label: "Anti Spam",      dbKey: "antispam",      on: "on",  off: "off" },
  mutegc:         { label: "Mute Grup",      dbKey: "mutegc",        on: true,  off: false },
};

const ALIASES = {
  antilink: "antilinkgc", antigc: "antilinkgc",
  antiall: "antilinkall", antitagall: "antilinkall",
  asticker: "antisticker", astkr: "antisticker",
  antidelete: "antiremove", antihapus: "antiremove", ar: "antiremove",
  toxic: "antitoxic", kasar: "antikasar",
  nsfw: "anti18plus", "18+": "anti18plus",
  bucin: "antibucin", judol: "antijudol", ribut: "antiribut",
  sambut: "autosambut", forward: "autoforward",
  reaction: "autoreaction", sticker: "autosticker",
  reply: "autoreply", media: "automedia",
  download: "autodl", spam: "antispam",
  bot: "antibot", phising: "antiphising",
  swgc: "antiswgc", tagsw: "antitagsw",
  antivideo: "antivideo", antivid: "antivideo", novideo: "antivideo", avn: "antivn", voice: "antivn", vn: "antivn", foto: "antifoto", image: "antifoto", photo: "antifoto", novid: "antivideo", antimedia: "antimedia", mute: "mutegc", virtex: "antivirtex", virus: "antivirtex", bug: "antibug", nomorluar: "antinomorluar", asing: "antinomorluar", foreign: "antinomorluar",
  bye: "goodbye", wb: "welcome",
};

const CATEGORIES = {
  "Main":       ["welcome", "goodbye", "autoreaction", "autosticker", "autoreply", "automedia", "autodl", "autosambut", "autoforward"],
  "Anti Link":  ["antilinkgc", "antilinkall"],
  "Anti Media": ["antivn", "antifoto", "antivideo", "antisticker", "antimedia", "antidocument"],
  "Anti Toxic": ["antitoxic", "antikasar", "anti18plus", "antibucin", "antijudol", "antiribut"],
  "Anti Lain": ["antibot", "antiphising", "antiswgc", "antitagsw", "antiremove", "anticustom", "antispam", "antivirtex", "antibug", "antinomorluar"],
  "Grup":       ["mutegc"],
};

function isOn(value, onValue) {
  return value === onValue || value === true || value === "on";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.args || []).map((a) => a.toLowerCase());
  const featureName = args[0];
  const mode = args[1];

  if (!featureName) {
    const groupData = db.getGroup(m.chat) || {};
    let txt = `ENABLE FITUR GRUP\n\n`;

    for (const [cat, features] of Object.entries(CATEGORIES)) {
      txt += `${cat}\n`;
      for (const feat of features) {
        const f = FEATURES[feat];
        if (!f) continue;
        const current = groupData[f.dbKey];
        const active = isOn(current, f.on);
        const icon = active ? "ON" : "OFF";
        txt += `${icon}  ${feat}\n`;
      }
      txt += `\n`;
    }

    txt += `Cara pakai:\n`;
    txt += `1. ${m.prefix}enable welcome\n`;
    txt += `2. ${m.prefix}enable antilinkgc kick\n`;
    txt += `3. ${m.prefix}disable welcome`;

    return await m.reply( txt, { commandName: "enable" });
  }

  const resolvedName = ALIASES[featureName] || featureName;
  const feature = FEATURES[resolvedName];

  if (!feature) {
    let txt = `Fitur *${featureName}* tidak ditemukan!\n\n`;
    txt += `Ketik \`${m.prefix}enable\` untuk melihat daftar fitur`;
    return await m.reply(claraWrap("enable", txt));
  }

  const groupData = db.getGroup(m.chat) || {};
  let update = { [feature.dbKey]: feature.on };

  if (feature.modes && mode && feature.modes.includes(mode)) {
    update[feature.modeKey] = mode;
  }
  // Anti nomor luar: mode arg is the prefix to block (e.g. 60, 44)
  if (feature.extraKey && mode && /^\d+$/.test(mode)) {
    update[feature.extraKey] = mode;
  }

  db.setGroup(m.chat, update);
  await m.react("✅");

  let txt = `ENABLE - ${feature.label}\n`;
  txt += `Status: ON`;
  if (feature.modes) {
    const newMode = mode && feature.modes.includes(mode) ? mode : (groupData[feature.modeKey] || feature.modes[0]);
    txt += `\n> Mode: ${newMode}`;
  }

  return await m.reply( txt, { commandName: "enable" });
}

export { pluginConfig as config, handler };
