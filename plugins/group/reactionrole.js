// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "reactionrole",
  alias: ["reactionrole"],
  aliases: ["reactionrole", "rr"],
  category: "group",
  description: "Auto-assign role berdasarkan reaction emoji di message",
  usage: ".reactionrole add <emoji> <rolename> (reply pesan) | .reactionrole list | .reactionrole del <emoji>",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.reactionRoles) db.data.reactionRoles = {};
    if (!db.data.reactionRoles[groupId]) db.data.reactionRoles[groupId] = [];

    const roles = db.data.reactionRoles[groupId];

    if (sub === "add") {
      const emoji = args[1];
      const roleName = args.slice(2).join(" ").trim();
      if (!emoji || !roleName) {
        return m.reply(raraWrap("Reaction Role", [
          `Cara: ${usedPrefix}reactionrole add <emoji> <rolename>`,
          `Reply pesan target lalu jalankan command ini.`,
          `Contoh: ${usedPrefix}reactionrole add 🎮 Gamer`,
          "",
          "Member yang react emoji tsb akan dapat role otomatis.",
        ].join("\n")));
      }
      if (!m.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        return m.reply(raraWrap("Reaction Role", "Reply pesan target dulu!"));
      }
      const targetMsg = m.message.extendedTextMessage.contextInfo;
      const existing = roles.find(r => r.emoji === emoji);
      if (existing) {
        existing.roleName = roleName;
        existing.messageId = targetMsg.stanzaId;
      } else {
        roles.push({
          emoji,
          roleName,
          messageId: targetMsg.stanzaId,
          messageIdKey: targetMsg.participant || "",
        });
      }
      await db.save();
      return m.reply(raraWrap("Reaction Role", [
        `Role berhasil ditambahkan!`,
        `Emoji: ${emoji}`,
        `Role: ${roleName}`,
        "",
        "Member yang react emoji ini akan auto-dapat role.",
      ].join("\n")));
    }

    if (sub === "list") {
      if (roles.length === 0) {
        return m.reply(raraWrap("Reaction Role", "Belum ada reaction role di grup ini."));
      }
      const list = roles.map((r, i) => `${i + 1}. ${r.emoji} = ${r.roleName}`).join("\n");
      return m.reply(raraWrap("Reaction Role", `Daftar Reaction Role (${roles.length}):\n\n${list}`, "info"));
    }

    if (sub === "del" || sub === "remove") {
      const emoji = args[1];
      if (!emoji) return m.reply(raraWrap("Usage", `Cara: ${usedPrefix}reactionrole del <emoji>`, "info"));
      const idx = roles.findIndex(r => r.emoji === emoji);
      if (idx === -1) return m.reply(raraWrap("Info", `Reaction role ${emoji} tidak ditemukan.`));
      roles.splice(idx, 1);
      await db.save();
      return m.reply(raraWrap("Reaction Role", `Reaction role ${emoji} berhasil dihapus.`, "info"));
    }

    return m.reply(raraWrap("Reaction Role", [
      `Reaction Role - Auto assign role via emoji reaction`,
      "",
      `Command:`,
      `1. ${usedPrefix}reactionrole add <emoji> <rolename> (reply pesan)`,
      `2. ${usedPrefix}reactionrole list`,
      `3. ${usedPrefix}reactionrole del <emoji>`,
      "",
      "Contoh: .reactionrole add 🎮 Gamer",
    ].join("\n")));
  } catch (e) {
    console.error("reactionrole error:", e);
    return m.reply(raraError("Reactionrole", e.message));
  }
}

export { pluginConfig as config, handler };
