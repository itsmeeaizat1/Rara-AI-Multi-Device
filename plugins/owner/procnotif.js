// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "procnotif",
  alias: ["procnotif"],
  category: "owner",
  description: "Toggle notifikasi proses untuk fitur media/tool",
  usage: ".procnotif on/off/status",
  example: ".procnotif on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, db }) {
  const args = (m.args && m.args[0]) ? m.args[0].toLowerCase() : "status";
  const prefix = config.command?.prefix || ".";

  if (args === "status") {
    const status = db.setting("procNotif") ?? true;
    const txt = `Status: ${status ? "Aktif" : "Nonaktif"}
Kategori: ai, canvas, image, maker, sticker, convert, tools, download, tts, anime
\`${prefix}procnotif on\` → aktifkan
\`${prefix}procnotif off\` → nonaktifkan`;
    return m.reply(novaWrap("procnotif", txt));
  }

  if (args === "on") {
    db.setting("procNotif", true);
    await db.save();
    return m.reply(novaWrap("procnotif", "Notifikasi proses media/tool diaktifkan. Saat fitur media/tool dijalankan, bot akan kirim react 🕒 saat proses dimulai dan 🐣 saat selesai."));
  }

  if (args === "off") {
    db.setting("procNotif", false);
    await db.save();
    return m.reply(novaWrap("procnotif", "Notifikasi proses media/tool dimatikan."));
  }

  return m.reply(novaWrap("procnotif", `Gunakan \`${prefix}procnotif on\` atau \`${prefix}procnotif off\`.`));
}

export default { config: pluginConfig, handler };
