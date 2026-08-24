// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "publicthisgc",
  alias: ["publicgc", "publicgroup", "publicthisgroup"],
  category: "group",
  description: "Aktifkan mode public hanya di grup ini",
  usage: ".publicthisgc",
  example: ".publicthisgc",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const selfGroups = db.setting("selfGroups") || [];
  const publicGroups = db.setting("publicGroups") || [];

  const isSelfGroup = selfGroups.includes(m.chat);
  const isPublicGroup = publicGroups.includes(m.chat);

  if (isPublicGroup && !isSelfGroup) {
    return m.reply(claraWrap("Grup Ini sUdah Mode Public", `ℹ️ *Grup Ini sUdah Mode Public*\n\n` +
        `Bot merespon semua member di grup ini\n\n` +
        `_Gunakan ${m.prefix}selfthisgc untuk menutup akses_`));
  }

  const updatedSelf = selfGroups.filter((id) => id !== m.chat);
  db.setting("selfGroups", updatedSelf);

  if (!publicGroups.includes(m.chat)) {
    db.setting("publicGroups", [...publicGroups, m.chat]);
  }

  return m.reply(claraWrap("Mode Public Diaktifkasi", `🌐 *Mode Public Diaktifkasi*\n\n` +
      `Bot sekarang merespon semua member di grup ini\n` +
      `Override mode global aktif untuk grup ini\n\n` +
      `📋 *Grup lain tidak terpengaruh*\n\n` +
      `_Gunakan ${m.prefix}selfthisgc untuk menutup akses lagi_`));
}

export { pluginConfig as config, handler };
