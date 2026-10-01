// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { saluranCtx } from "../../src/lib/nova-context.js";

const pluginConfig = {
  name: "unmutegc",
  alias: ["unmutegc"],
  category: "group",
  description: "Buka blokir command bot untuk member di grup",
  usage: ".unmutegc",
  example: ".unmutegc",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  isBotAdmin: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const groupData = db.getGroup(m.chat) || {};

  if (!groupData.mutegc) {
    return m.reply(novaWrap("Mute GC Tidak Aktif", `Member sudah bisa menggunakan command bot di grup ini`, "info"));
  }

  db.setGroup(m.chat, { mutegc: false });
  const ctx = saluranCtx();
  const groupName = m.groupMetadata?.subject || "grup ini";

  return m.reply(novaWrap("Mute GC Nonaktif", 
      `Grup: *${groupName}*\n` +
      `Member sekarang bisa menggunakan command bot lagi\n\n` +
      `_Ketik *${m.prefix}mutegc* untuk memblokir kembali_`));
}

export { pluginConfig as config, handler };
