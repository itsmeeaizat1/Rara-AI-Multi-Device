// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "disable",
  alias: ["dis", "turnoff"],
  category: "owner",
  description: "Mematikan fitur grup (welcome, antilink, antisticker, dll)",
  usage: ".disable <fitur>",
  example: ".disable welcome\n.disable antilinkgc\n.disable antisticker",
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

const FEATURES = {
  welcome:      { label: "Welcome",        dbKey: "welcome",       off: false },
  goodbye:      { label: "Goodbye",        dbKey: "goodbye",       off: false },
  autoreaction: { label: "Auto Reaction",  dbKey: "autoreaction",  off: false },
  autosticker:  { label: "Auto Sticker",   dbKey: "autosticker",   off: false },
  autoreply:    { label: "Auto Reply",     dbKey: "autoreply",     off: false },
  automedia:    { label: "Auto Media",     dbKey: "automedia",     off: false },
  autodl:       { label: "Auto Download",  dbKey: "autodl",        off: false },
  autosambut:  { label: "Auto Sambut",    dbKey: "autoSambut",   off: false },
  autoforward:  { label: "Auto Forward",   dbKey: "autoforward",   off: false },
  antilinkgc:   { label: "Anti Link Grup", dbKey: "antilinkgc",    off: "off" },
  antilinkall:  { label: "Anti Link All",  dbKey: "antilinkall",   off: "off" },
  antivn:        { label: "Anti VN",        dbKey: "antivn",        off: false },
  antifoto:      { label: "Anti Foto",       dbKey: "antifoto",      off: false },
  antivideo:     { label: "Anti Video",      dbKey: "antivideo",     off: false },
  antisticker:  { label: "Anti Sticker",   dbKey: "antisticker",   off: "off" },
  antitoxic:    { label: "Anti Toxic",     dbKey: "antitoxic",     off: false },
  antikasar:    { label: "Anti Kasar",     dbKey: "antikasar",     off: "off" },
  anti18plus:   { label: "Anti 18+",       dbKey: "anti18plus",    off: "off" },
  antibucin:    { label: "Anti Bucin",     dbKey: "antibucin",     off: "off" },
  antijudol:    { label: "Anti Judol",     dbKey: "antijudol",     off: "off" },
  antiribut:    { label: "Anti Ribut",     dbKey: "antiribut",     off: "off" },
  antibot:      { label: "Anti Bot",       dbKey: "antibot",       off: false },
  antiphising:  { label: "Anti Phising",   dbKey: "antiphising",   off: "off" },
  antiswgc:     { label: "Anti SW Grup",   dbKey: "antiswgc",      off: "off" },
  antitagsw:    { label: "Anti Tag SW",    dbKey: "antitagsw",     off: "off" },
  antiremove:   { label: "Anti Delete",    dbKey: "antiremove",    off: "off" },
  anticustom:   { label: "Anti Custom",   dbKey: "anticustom",    off: "off" },
  antimedia:    { label: "Anti Media",     dbKey: "antimedia",     off: "off" },
  antidocument: { label: "Anti Document",  dbKey: "antidocument",  off: "off" },
  antivirtex:   { label: "Anti Virtex",    dbKey: "antivirtex",    off: false },
  antibug:      { label: "Anti Bug",       dbKey: "antibug",        off: false },
  antinomorluar:{ label: "Anti Nomor Luar", dbKey: "antinomorluar", off: false },
  antispam:     { label: "Anti Spam",      dbKey: "antispam",      off: "off" },
  mutegc:       { label: "Mute Grup",      dbKey: "mutegc",        off: false },
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

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = (m.args || []).map((a) => a.toLowerCase());
  const featureName = args[0];

  if (!featureName) {
    let txt = `DISABLE FITUR GRUP\n\n`;
    txt += `Cara pakai: \`${m.prefix}disable <fitur>\`\n\n`;
    txt += `Contoh:\n`;
    txt += `1. ${m.prefix}disable welcome\n`;
    txt += `2. ${m.prefix}disable antilinkgc\n`;
    txt += `3. ${m.prefix}disable antisticker\n\n`;
    txt += `Ketik \`${m.prefix}enable\` untuk melihat semua fitur`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "disable" });
  }

  const resolvedName = ALIASES[featureName] || featureName;
  const feature = FEATURES[resolvedName];

  if (!feature) {
    let txt = `Fitur *${featureName}* tidak ditemukan!\n\n`;
    txt += `Ketik \`${m.prefix}enable\` untuk melihat daftar fitur`;
    return await m.reply(claraWrap("disable", txt));
  }

  db.setGroup(m.chat, { [feature.dbKey]: feature.off });
  await m.react("✅");

  let txt = `DISABLE - ${feature.label}\n`;
  txt += `> Status: OFF`;

  return await sendReplyWithNav(m, sock, txt, { commandName: "disable" });
}

export { pluginConfig as config, handler };
