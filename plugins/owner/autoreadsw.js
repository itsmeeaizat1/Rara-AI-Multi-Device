// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autoreadsw",
  alias: ["autoreadsw"],
  category: "owner",
  description: "Auto read semua status/story WA",
  usage: ".autoreadsw on/off",
  example: ".autoreadsw on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const action = (m.args?.[0] || "").toLowerCase();
  const current = db.setting("autoReadSW") || { enabled: false };

  if (!action) {
    return m.reply( claraWrap("Auto Read Story", [
      `Status: ${current.enabled ? "AKTIF" : "MATI"}`,
      "",
      "Perintah:",
      ".autoreadsw on - Aktifkan",
      ".autoreadsw off - Matikan",
    ]), { commandName: "autoreadsw" });
  }

  if (action === "on") {
    db.setting("autoReadSW", { enabled: true });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto Read Story", "Auto read story diaktifkan!", "success"));
  }

  if (action === "off") {
    db.setting("autoReadSW", { enabled: false });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto Read Story", "Auto read story dimatikan!", "info"));
  }

  return m.reply(claraWrap("Auto Read Story", "Gunakan on/off", "warn"));
}

export { pluginConfig as config, handler };
