// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "mutegc",
  alias: ["mutegc3", "mutegcon", "mutegrp3"],
  category: "group",
  description: "Blokir command bot untuk member, hanya admin/owner yang bisa pakai",
  usage: ".mutegc",
  example: ".mutegc",
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

  if (groupData.mutegc) {
    return sendReplyWithNav(sock, m, claraWrap("Mute GC Sudah Aktif", ["Member tidak bisa menggunakan command bot di grup ini", "Hanya admin grup dan owner bot yang bisa akses", "", `_Ketik *${m.prefix}unmutegc* untuk membuka_`].join("\n")), "mutegc");
  }

  db.setGroup(m.chat, { mutegc: true });
  const ctx = saluranCtx();
  const groupName = m.groupMetadata?.subject || "grup ini";

  return sendReplyWithNav(sock, m, claraWrap("Mute GC Aktif", [`Grup: *${groupName}*`, "Member tidak bisa menggunakan command bot", "Admin grup dan owner bot tetap bisa akses", "", `_Ketik *${m.prefix}unmutegc* untuk membuka_`].join("\n")), "mutegc");
}

function isMutegc(groupJid, db) {
  const group = db.getGroup(groupJid) || {};
  return !!group.mutegc;
}

export { pluginConfig as config, handler, isMutegc };
