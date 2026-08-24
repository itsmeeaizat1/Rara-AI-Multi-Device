// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import config from "../../config.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoread",
  alias: ["readchat", "autobaca"],
  category: "owner",
  description: "Auto read pesan masuk",
  usage: ".autoread on/off",
  example: ".autoread on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const option = m.text?.toLowerCase()?.trim();

  if (!option) {
    const current = db.setting("autoRead") ?? config.features?.autoRead ?? false;
    return m.reply( `📖 *Auto Read*\n\n` +
        `Status: *${current ? "Aktif ✅" : "Nonaktif ❌"}*\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}autoread on* — Aktifkan\n` +
        `*${m.prefix}autoread off* — Nonaktifkan\n\n` +
        `_Bot akan otomatis membaca pesan masuk_`, "autoread");
  }

  if (option === "on") {
    db.setting("autoRead", true);
    const ctx = saluranCtx();
    return m.reply(claraWrap("autoread", `📖 *Auto Read Aktif*\n\n` +
        `Bot akan otomatis membaca pesan masuk`));
  }

  if (option === "off") {
    db.setting("autoRead", false);
    return m.reply(claraWrap("autoread", `📖 *Auto Read Nonaktif*\n\n` +
        `Bot tidak akan otomatis membaca pesan`));
  }

  return m.reply(claraWrap("Autoread", `❌ *Opsi Tidak Valid*\n\nGunakan *${m.prefix}autoread on* atau *${m.prefix}autoread off*`));
}

export { pluginConfig as config, handler };
