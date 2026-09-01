// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "smartreplyfuture", alias: ["smartreplyfuture", "smartreply"], category: "future",
  alias: ["smartreplyfuture", "smartreply"],
  description: "Toggle AI auto-reply kontekstual", usage: ".smartreply <on/off>",
  example: ".smartreply on", isOwner: true, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const arg = (m.text || "").trim().toLowerCase();
    const db = getDatabase();
    if (!db.smartReply) db.smartReply = {};
    const gid = m.key?.remoteJid || "";
    if (arg === "on") {
      db.smartReply[gid] = true; db.write();
      await m.reply(claraWrap("Smart Reply", ["│ AI akan bales chat otomatis di grup ini",
        "│ Hanya chat yang mention bot atau reply"].join("\n")));
    } else if (arg === "off") {
      delete db.smartReply[gid]; db.write();
      await m.reply(claraWrap("Smart Reply", ["│ Smart reply dimatikan"].join("\n")));
    } else {
      await m.reply(claraWrap("Smart Reply", [`│ Status: *${db.smartReply[gid] ? "ON" : "OFF"}*`,
        `│ Ketik: *${prefix}smartreply on/off*`].join("\n")));
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };