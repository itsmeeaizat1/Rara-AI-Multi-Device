import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpggroup",
  alias: ["rpggroup", "rpggc", "grouprpg"],
  category: "group",
  description: "Mengaktifkan atau menonaktifkan fitur RPG di grup",
  usage: ".rpg <on/off>",
  example: ".rpg on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.text?.trim()?.toLowerCase();

  if (args !== "on" && args !== "off") {
    return sendReplyWithNav(sock, m, `⚔️ *FITUR RPG GRUP*\n\n` +
        `Gunakan perintah ini untuk mengatur akses member ke fitur RPG.\n\n` +
        `• *${m.prefix}rpg on* - Member bisa main RPG\n` +
        `• *${m.prefix}rpg off* - Member tidak bisa main RPG\n\n` +
        `*Catatan:* Admin tetap bisa mengakses RPG meskipun dimatikan.`, "rpg");
  }

  const db = getDatabase();
  const group = db.getGroup(m.chat) || db.setGroup(m.chat);

  const isEnable = args === "on";

  if (group.rpg === isEnable) {
    return m.reply(claraWrap("Rpg", `⚔️ Fitur RPG sudah *${isEnable ? "AKTIF" : "NONAKTIF"}* di grup ini.`));
  }

  group.rpg = isEnable;
  db.setGroup(m.chat, group);

  await m.react("✅");
  return sendReplyWithNav(sock, m, `✅ Berhasil *${isEnable ? "MENGAKTIFKAN" : "MENONAKTIFKAN"}* fitur RPG di grup ini!\n\n` +
    (isEnable
      ? `Member sekarang bisa menggunakan semua perintah di menu RPG.`
      : `Member tidak akan bisa menggunakan perintah RPG lagi.`), "rpg");
}

export { pluginConfig as config, handler };
