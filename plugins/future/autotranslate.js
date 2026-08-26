// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autotranslate", alias: ["autotr", "realtranslate"], category: "future",
  alias: ["autotranslate"],
  description: "Toggle auto-translate pesan grup", usage: ".autotranslate <on/off>",
  example: ".autotranslate on", isOwner: true, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const arg = (m.text || "").trim().toLowerCase();
    const db = getDatabase();
    if (!db.autoTranslate) db.autoTranslate = {};
    const gid = m.key?.remoteJid || "";
    if (arg === "on") {
      db.autoTranslate[gid] = "id"; db.write();
      await m.reply(claraWrap("Auto Translate", ["│ ❏ Pesan asing akan auto-translate ke Indonesia"].join("\n")));
    } else if (arg === "off") {
      delete db.autoTranslate[gid]; db.write();
      await m.reply(claraWrap("Auto Translate", ["│ ❏ Auto-translate dimatikan"].join("\n")));
    } else {
      await m.reply(claraWrap("Auto Translate", [`│ ❏ Status: *${db.autoTranslate[gid] ? "ON" : "OFF"}*`,
        `│ ❏ Ketik: *${prefix}autotranslate on/off*`].join("\n")));
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };