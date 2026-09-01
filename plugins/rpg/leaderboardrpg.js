// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Leaderboard — Top players by level, gold, or PvP rating

import {
  getLeaderboard, ensureRpg, JOB_DB
} from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "leaderboardrpg",
  alias: ["leaderboardrpg", "toprpg", "papanrpg"],
  category: "rpg",
  description: "Papan peringkat RPG (level, gold, pvp)",
  usage: ".toprpg <level|gold|pvp>",
  example: ".toprpg level",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = m.text?.trim().split(/\s+/) || [];
    const type = (args[0] || "level").toLowerCase();

    const validTypes = ["level", "gold", "pvp", "gems"];
    if (!validTypes.includes(type)) {
      return m.reply(claraWrap("toprpg", `Tipe tidak valid. Pilih: *${validTypes.join(", ")}*`, "warn"));
    }

    // Get all users from database
    const db = getDatabase();
    const users = db.db?.data?.users || {};
    const entries = Object.entries(users)
      .filter(([jid, user]) => user?.rpg && jid.includes("@"))
      .map(([jid, user]) => ({
        jid,
        name: user.name || jid.split("@")[0],
        level: user.rpg.level || 1,
        gold: user.rpg.gold || 0,
        pvpRating: user.rpg.pvpRating || 1000,
        gems: user.rpg.gems || 0,
        job: user.rpg.job || "novice",
      }));

    // Sort by type
    entries.sort((a, b) => {
      if (type === "level") return b.level - a.level;
      if (type === "gold") return b.gold - a.gold;
      if (type === "pvp") return b.pvpRating - a.pvpRating;
      if (type === "gems") return b.gems - a.gems;
      return 0;
    });

    const top = entries.slice(0, 10);

    if (top.length === 0) {
      return m.reply(claraWrap("toprpg", "Belum ada player RPG yang terdaftar.", "info"));
    }

    const typeLabel = {
      level: "ʟᴇᴠᴇʟ",
      gold: "ɢᴏʟᴅ",
      pvp: "ᴘᴠᴘ ʀᴀᴛɪɴɢ",
      gems: "ɢᴇᴍs",
    }[type];

    const medal = ["🥇", "🥈", "🥉"];

    let msg = `╭─「 *ᴛᴏᴘ ${typeLabel}* 」\n`;
    msg += `│ 📊 Top 10 Player\n`;
    msg += `│\n`;

    top.forEach((player, i) => {
      const rank = medal[i] || `${i + 1}.`;
      let value = "";
      if (type === "level") value = `Lv.${player.level} | ${JOB_DB[player.job]?.name || "Pemula"}`;
      else if (type === "gold") value = `${player.gold.toLocaleString()} gold`;
      else if (type === "pvp") value = `${player.pvpRating} rating`;
      else if (type === "gems") value = `${player.gems} gems`;

      msg += `│ ${rank} ${player.name}\n`;
      msg += `│     ${value}\n`;
    });

    msg += `│\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("toprpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("toprpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
