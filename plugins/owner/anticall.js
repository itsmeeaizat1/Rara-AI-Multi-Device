// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import config from "../../config.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "anticall",
  alias: ["antitelpon", "antitelp", "rejectcall"],
  category: "owner",
  description: "Auto tolak panggilan masuk",
  usage: ".anticall on/off",
  example: ".anticall on",
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
    const current = db.setting("antiCall") ?? config.features?.antiCall ?? true;
    return sendReplyWithNav(sock, m, `📞 *Anti Call*\n\n` +
        `> Status: *${current ? "Aktif ✅" : "Nonaktif ❌"}*\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}anticall on* — Aktifkan\n` +
        `> *${m.prefix}anticall off* — Nonaktifkan\n\n` +
        `_Bot akan otomatis menolak panggilan masuk_`, "anticall");
  }

  if (option === "on") {
    db.setting("antiCall", true);
    const ctx = saluranCtx();
    return m.reply(claraWrap("anticall", `📞 *Anti Call Aktif*\n\n` +
        `> Bot akan otomatis menolak panggilan masuk`));
  }

  if (option === "off") {
    db.setting("antiCall", false);
    return m.reply(claraWrap("anticall", `📞 *Anti Call Nonaktif*\n\n` +
        `> Bot tidak akan menolak panggilan masuk`));
  }

  return m.reply(claraWrap("Anticall", `❌ *Opsi Tidak Valid*\n\n> Gunakan *${m.prefix}anticall on* atau *${m.prefix}anticall off*`));
}

export { pluginConfig as config, handler };
