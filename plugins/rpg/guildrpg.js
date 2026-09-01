// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Guild — Create/join/leave guild, view guild info

import {
  ensureRpg, createGuild, joinGuild, leaveGuild, getGuild, JOB_DB
} from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "guildrpg",
  alias: ["guildrpg", "guild", "clanrpg"],
  category: "rpg",
  description: "Sistem guild RPG — buat, join, leave, info guild",
  usage: ".guildrpg <create|join|leave|list|info> [nama/id]",
  example: ".guildrpg create Nova Hunters",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("guildrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Default: show guild info
    if (!action || action === "info") {
      if (!rpg.guildId) {
        let msg = `╭─「 ɢᴜɪʟᴅ 」\n`;
        msg += `│ Kamu belum bergabung guild\n`;
        msg += `│\n`;
        msg += `│ 📌 .guildrpg create <nama> — buat guild (Lv.20+)\n`;
        msg += `│ 📌 .guildrpg list — lihat guild tersedia\n`;
        msg += `│ 📌 .guildrpg join <id> — join guild\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      }

      const guild = getGuild(rpg.guildId);
      if (!guild) {
        saveRpg: rpg.guildId = null; rpg.guildRank = null;
        return m.reply(claraWrap("guildrpg", "Guild tidak ditemukan (mungkin sudah dihapus).", "warn"));
      }

      let msg = `╭─「 ɢᴜɪʟᴅ ɪɴғᴏ 」\n`;
      msg += `│ 🏰 Nama: *${guild.name}*\n`;
      msg += `│ 👑 Leader: *${guild.leader?.split("@")[0] || "Unknown"}*\n`;
      msg += `│ 👥 Members: *${guild.members.length}/50*\n`;
      msg += `│ 📊 Rank kamu: *${rpg.guildRank || "member"}*\n`;
      msg += `│ 📅 Dibuat: *${new Date(guild.createdAt).toLocaleDateString("id-ID")}*\n`;
      msg += `│\n`;

      // List members (top 5 by level)
      const db = getDatabase();
      const memberData = guild.members.map(jid => {
        const u = db.db?.data?.users?.[jid];
        return { jid, name: u?.name || jid.split("@")[0], level: u?.rpg?.level || 1 };
      }).sort((a, b) => b.level - a.level).slice(0, 5);

      msg += `│ 📋 *ᴛᴏᴘ ᴍᴇᴍʙᴇʀs*\n`;
      for (let i = 0; i < memberData.length; i++) {
        const m = memberData[i];
        const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
        msg += `│ ${medal} ${m.name} (Lv.${m.level})\n`;
      }

      msg += `│\n`;
      msg += `│ 📌 .guildrpg leave — keluar dari guild\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // Create guild
    if (action === "create" || action === "buat") {
      const name = args.slice(1).join(" ");
      if (!name) return m.reply(claraWrap("guildrpg", "Nama guild apa? Contoh: .guildrpg create Nova Hunters", "warn"));

      const result = createGuild(m, name);

      if (result.success) {
        await m.react("🐣");
        let msg = `╭─「 ɢᴜɪʟᴅ ᴄʀᴇᴀᴛᴇ 」\n`;
        msg += `│ ✅ Guild berhasil dibuat!\n`;
        msg += `│\n`;
        msg += `│ 🏰 Nama: *${result.name}*\n`;
        msg += `│ 👑 Leader: *${m.pushName}*\n`;
        msg += `│ 👥 Members: 1/50\n`;
        msg += `│\n`;
        msg += `│ Share ID guild untuk ajak orang join:\n`;
        msg += `│ ID: *${result.guildId}*\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      } else {
        return m.reply(claraWrap("guildrpg", result.reason || "Gagal buat guild.", "warn"));
      }
    }

    // List guilds
    if (action === "list") {
      const db = getDatabase();
      const guilds = db.db?.data?.guilds || {};
      const guildList = Object.entries(guilds).map(([id, g]) => ({
        id, name: g.name, members: g.members?.length || 0, leader: g.leader?.split("@")[0] || "Unknown"
      }));

      if (guildList.length === 0) {
        return m.reply(claraWrap("guildrpg", "Belum ada guild yang dibuat. Jadilah yang pertama! Ketik .guildrpg create <nama>", "info"));
      }

      let msg = `╭─「 ɢᴜɪʟᴅ ʟɪsᴛ 」\n`;
      msg += `│ Total guild: *${guildList.length}*\n`;
      msg += `│\n`;

      for (const g of guildList.slice(0, 10)) {
        msg += `│ 🏰 *${g.name}*\n`;
        msg += `│     Leader: ${g.leader} | Members: ${g.members}/50\n`;
        msg += `│     ID: ${g.id}\n`;
      }

      msg += `│\n`;
      msg += `│ 📌 .guildrpg join <id> untuk join\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // Join guild
    if (action === "join" || action === "gabung") {
      const guildId = args[1];
      if (!guildId) return m.reply(claraWrap("guildrpg", "Guild ID apa? Ketik .guildrpg list untuk lihat.", "warn"));

      const result = joinGuild(m, guildId);

      if (result.success) {
        await m.react("🐣");
        let msg = `╭─「 ɢᴜɪʟᴅ ᴊᴏɪɴ 」\n`;
        msg += `│ ✅ Berhasil join guild!\n`;
        msg += `│ 🏰 *${result.guild.name}*\n`;
        msg += `│ 👥 Members: ${result.guild.members.length}/50\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      } else {
        return m.reply(claraWrap("guildrpg", result.reason || "Gagal join guild.", "warn"));
      }
    }

    // Leave guild
    if (action === "leave" || action === "keluar") {
      const result = leaveGuild(m);

      if (result.success) {
        await m.react("🐣");
        let msg = `╭─「 ɢᴜɪʟᴅ ʟᴇᴀᴠᴇ 」\n`;
        msg += `│ ✅ Kamu keluar dari guild\n`;
        msg += `╰──────────`;
        return m.reply(msg);
      } else {
        return m.reply(claraWrap("guildrpg", result.reason || "Tidak ada guild untuk ditinggalkan.", "warn"));
      }
    }

    return m.reply(claraWrap("guildrpg", "Aksi tidak dikenal. Gunakan: create, join, leave, list, info", "warn"));
  } catch (err) {
    console.error("guildrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("guildrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
