// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import te from "../../src/lib/rara-error.js";
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "selfthisgc",
  alias: ["selfthisgc"],
  category: "group",
  description: "Aktifkan mode self hanya di grup ini",
  usage: ".selfthisgc",
  example: ".selfthisgc",
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

  if (isSelfGroup) {
    return m.reply(raraWrap("Grup Ini sUdah Mode sElf", 
        `Bot hanya merespon owner & bot sendiri\n\n` +
        `_Gunakan ${m.prefix}publicthisgc untuk membuka akses_`));
  }

  if (!selfGroups.includes(m.chat)) {
    db.setting("selfGroups", [...selfGroups, m.chat]);
  }

  const updatedPublic = publicGroups.filter((id) => id !== m.chat);
  db.setting("publicGroups", updatedPublic);

  return m.reply(raraWrap("Mode sElf Aktif", 
      `Bot di grup ini sekarang hanya merespon:\n` +
      `Owner bot\n` +
      `Bot sendiri (fromMe)\n\n` +
      `📋 *grup lain tidak terpengaruh*\n\n` +
      `_Gunakan ${m.prefix}publicthisgc untuk membuka akses_`));
}

export { pluginConfig as config, handler };
