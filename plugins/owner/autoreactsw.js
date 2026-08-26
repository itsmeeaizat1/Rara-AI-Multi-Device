// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "autoreactsw",
  alias: ["autoreactsw", "reactsw", "autoreactstory", "autoreaksi"],
  category: "owner",
  description: "Auto react semua status/story WA",
  usage: ".autoreactsw on/off [emoji]",
  example: ".autoreactsw on 🔥",
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
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();
  const emoji = args[1] || "🔥";
  const current = db.setting("autoReactSW") || { enabled: false, emoji: "🔥" };

  if (!action) {
    return m.reply( claraWrap("Auto React Story", [
      `Status: ${current.enabled ? "AKTIF" : "MATI"}`,
      `Emoji: ${current.emoji}`,
      "",
      "Perintah:",
      `.autoreactsw on - Aktifkan (emoji default)`,
      `.autoreactsw on 😍 - Aktifkan dengan emoji`,
      `.autoreactsw off - Matikan`,
      `.autoreactsw emoji 😍 - Ubah emoji saja`,
    ]), { commandName: "autoreactsw" });
  }

  if (action === "on") {
    db.setting("autoReactSW", { enabled: true, emoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto React Story", [
      "Auto react story diaktifkan!",
      `Emoji: ${emoji}`,
    ], "success"));
  }

  if (action === "off") {
    db.setting("autoReactSW", { enabled: false, emoji: current.emoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto React Story", "Auto react story dimatikan!", "info"));
  }

  if (action === "emoji") {
    const newEmoji = args[1];
    if (!newEmoji) {
      return m.reply(claraWrap("Auto React Story", `Emoji saat ini: ${current.emoji}`, "warn"));
    }
    db.setting("autoReactSW", { enabled: current.enabled, emoji: newEmoji });
    db.save();
    await m.react("🐣");
    return m.reply(claraWrap("Auto React Story", `Emoji diatur ke ${newEmoji}`, "success"));
  }

  return m.reply(claraWrap("Auto React Story", "Gunakan on/off/emoji", "warn"));
}

export { pluginConfig as config, handler };
