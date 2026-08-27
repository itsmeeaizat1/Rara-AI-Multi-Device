// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "smartmoderation", alias: ["smartmoderation"], category: "future",
  alias: ["smartmoderation"],
  description: "Toggle AI moderation anti-toxic", usage: ".smartmoderation <on/off>",
  example: ".smartmoderation on", isOwner: true, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

const BAD_WORDS = ["anjing","kontol","memek","bangsat","goblok","tolol","babi","setan","pepek","ngentot","fuck","shit","bitch","damn"];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const arg = (m.text || "").trim().toLowerCase();
    const db = getDatabase();
    if (!db.smartMod) db.smartMod = {};
    const gid = m.key?.remoteJid || "";
    if (arg === "on") {
      db.smartMod[gid] = true; db.write();
      await m.reply(claraWrap("Smart Moderation", ["│ AI akan deteksi kata toxic otomatis",
        "│ Pesan toxic akan diberi peringatan"].join("\n")));
    } else if (arg === "off") {
      delete db.smartMod[gid]; db.write();
      await m.reply(claraWrap("Smart Moderation", ["│ Moderation dimatikan"].join("\n")));
    } else {
      await m.reply(claraWrap("Smart Moderation", [`│ Status: *${db.smartMod[gid] ? "ON" : "OFF"}*`,
        `│ Ketik: *${prefix}smartmoderation on/off*`].join("\n")));
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };