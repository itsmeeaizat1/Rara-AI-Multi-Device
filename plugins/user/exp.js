// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { calculateLevel, getRole } from "../../src/lib/nova-level.js";

const pluginConfig = {
  name: "expuser",
  alias: ["expuser", "exp"],
  category: "user",
  description: "Cek exp user",
  usage: ".exp [@user]",
  example: ".exp",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return (num || 0).toLocaleString("id-ID");
}

async function handler(m, { sock }) {
  try {
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
  const exp = user.exp || 0;
  const level = calculateLevel(exp);
  const role = getRole(level);

  let txt = "╭─「 ✦ EXP Info ✦ 」\n";
  txt += "│\n";
  txt += "│ 👤 User: *" + targetName + "*\n";
  txt += "│ ⭐ Exp: *" + formatNumber(exp) + "*\n";
  txt += "│ 🏆 Level: *" + level + "*\n";
  txt += "│ 🎖️ Role: " + role + "\n";
  txt += "╰────  •  ────";

  await m.reply(txt, { mentions: [targetJid] });

  } catch (e) {
    console.error("[user/exp.js]:", e.message);
    try { await m.reply("❌ Terjadi error: " + (e.message || "unknown")); } catch {}
  }
}

export { pluginConfig as config, handler };
