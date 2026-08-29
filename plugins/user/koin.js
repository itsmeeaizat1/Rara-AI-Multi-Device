// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "koinuser",
  alias: ["koinuser"],
  category: "user",
  description: "Cek koin user",
  usage: ".koin [@user]",
  example: ".koin",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatKoin(num) {
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + "T";
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return (num || 0).toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  const db = getDatabase();

  let targetJid = m.sender;
  let targetName = m.pushName || "Kamu";

  if (m.quoted) {
    targetJid = m.quoted.sender;
    targetName = m.quoted.pushName || targetJid.split("@")[0];
  } else if (m.mentionedJid?.length) {
    targetJid = m.mentionedJid[0];
    targetName = targetJid.split("@")[0];
  }

  const user = db.getUser(targetJid) || db.setUser(targetJid);
  const isSelf = targetJid === m.sender;
  const isOwner = config.isOwner(targetJid);
  const isPremium = user.isPremium;

  let txt = "╭──「 Koin Info 」\n";
  txt += "│\n";
  txt += "│ 👤 User: *" + targetName + "*\n";
  txt += "│ 💰 Koin: *" + formatKoin(user.koin || 0) + "*\n";
  txt += "│ 💎 Status: *" + (isOwner ? "👑 Owner" : isPremium ? "⭐ Premium" : "🆓 Free") + "*\n";

  if (isSelf && !isOwner) {
    txt += "│\n";
    txt += "├──「 *Shop* 」\n";
    txt += "│ `.buyenergi <jml>` (1 = 100 koin)\n";
    txt += "│ `.buyfitur` (1 = 3000 koin)\n";
    txt += "│\n";
    txt += "│ 🎮 Mau tambah koin? Main game aja!\n";
  }
  txt += "╰──────────";

  await m.reply(txt, { mentions: [targetJid] });
}

export { pluginConfig as config, handler };
