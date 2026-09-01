import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "summon",
  alias: ["summon", "summonspirit", "panggilspirit", "spirit"],
  category: "rpg",
  description: "Sistem Pemanggilan Spirit Elementalis untuk mendapatkan buff sementara (30 Menit)",
  usage: ".summon list\n.summon <nama_spirit>\n.summon status",
  example: ".summon fire",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const SUMMON_COST_GOLD = 1000;
const SUMMON_COST_ENERGI = 10;
const BUFF_DURATION_MS = 30 * 60 * 1000; // 30 Menit

const SPIRITS = [
  { id: "fire", name: "Fire Spirit", emoji: "🔥", effect: "+50 ATK", stat: "atk", value: 50, aliases: ["fire", "api"] },
  { id: "water", name: "Water Spirit", emoji: "💧", effect: "+50 DEF", stat: "def", value: 50, aliases: ["water", "air"] },
  { id: "earth", name: "Earth Spirit", emoji: "🌿", effect: "+100 HP", stat: "hp", value: 100, aliases: ["earth", "tanah", "bumi"] },
  { id: "wind", name: "Wind Spirit", emoji: "🌪️", effect: "+20% Luck", stat: "luck", value: 20, aliases: ["wind", "angin"] },
  { id: "light", name: "Light Spirit", emoji: "🌟", effect: "+50 Energi", stat: "energi", value: 50, aliases: ["light", "cahaya"] },
];

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const input = (m.args[0] || "").toLowerCase().trim();

    const summonData = await db.getPlayerData?.(sender, "summon") || { activeSpirit: null };
    const now = Date.now();

    if (input === "status" || input === "info" || input === "cek") {
      let msg = `╭─「 SPIRIT BUFF STATUS 」\n`;
      if (summonData.activeSpirit && summonData.activeSpirit.expiresAt > now) {
        const remainingMs = summonData.activeSpirit.expiresAt - now;
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        msg += `│ 🌟 Spirit Aktif: *${summonData.activeSpirit.name}* ${summonData.activeSpirit.emoji}\n`;
        msg += `│ ✨ Efek Buff: *${summonData.activeSpirit.effect}*\n`;
        msg += `│ ⏳ Sisa Durasi: *${mins}m ${secs}d*\n`;
      } else {
        msg += `│ ❌ Tidak ada spirit buff yang aktif saat ini.\n`;
        msg += `│ 💡 Ketik *${m.prefix}summon list* untuk memanggil spirit.\n`;
      }
      msg += `╰──────────`;
      await m.react("🐣");
      return m.reply(msg);
    }

    if (!input || input === "list") {
      let listMsg = `╭─「 SPIRIT SUMMONING SYSTEM 」\n`;
      listMsg += `│ Biaya Pemanggilan: *${SUMMON_COST_GOLD} Gold* + *${SUMMON_COST_ENERGI} Energi*\n`;
      listMsg += `│ Durasi Buff: *30 Menit*\n│\n`;
      SPIRITS.forEach((s, i) => {
        listMsg += `│ ${i + 1}. *${s.name}* ${s.emoji}\n`;
        listMsg += `│    ✨ Efek: *${s.effect}*\n`;
        listMsg += `│    🔑 Perintah: *${m.prefix}summon ${s.id}*\n`;
      });
      listMsg += `│\n│ 💡 *Cek Buff:* ${m.prefix}summon status\n`;
      listMsg += `╰──────────`;
      await m.react("🐣");
      return m.reply(listMsg);
    }

    const spirit = SPIRITS.find(s => s.id === input || s.aliases.includes(input));
    if (!spirit) {
      await m.react("❌");
      return m.reply(claraWrap("summon", `Spirit "*${input}*" tidak dikenali.\n\nKetik *${m.prefix}summon list* untuk melihat pilihan spirit.`, "error"));
    }

    const profile = await db.getPlayerData?.(sender, "profile") || { gold: 2000, energi: 100 };
    profile.gold = profile.gold || 0;
    profile.energi = profile.energi !== undefined ? profile.energi : 100;

    if ((profile.gold < SUMMON_COST_GOLD || profile.energi < SUMMON_COST_ENERGI) && !m.isOwner) {
      await m.react("❌");
      return m.reply(claraWrap("summon", `Biaya tidak cukup! Membutuhkan *${SUMMON_COST_GOLD} Gold* & *${SUMMON_COST_ENERGI} Energi*.\nKamu memiliki: *${profile.gold} Gold* & *${profile.energi} Energi*.`, "error"));
    }

    if (!m.isOwner) {
      profile.gold -= SUMMON_COST_GOLD;
      profile.energi -= SUMMON_COST_ENERGI;
    }

    if (spirit.id === "light") {
      profile.energi += 50;
    }

    const expiresAt = now + BUFF_DURATION_MS;
    summonData.activeSpirit = {
      id: spirit.id,
      name: spirit.name,
      emoji: spirit.emoji,
      effect: spirit.effect,
      expiresAt: expiresAt,
    };

    let msg = `╭─「 SPIRIT SUMMONING RITUAL 」\n`;
    msg += `│ 🔮 *Ritual Pemanggilan Elementalis*\n`;
    msg += `│ 🕯️ Menggambar lingkaran sihir di atas tanah...\n`;
    msg += `│ ✨ Mengalirkan ${SUMMON_COST_GOLD} Gold & ${SUMMON_COST_ENERGI} Energi ke dalam altar...\n`;
    msg += `│ 🌟 Cahaya berkilau! *${spirit.name}* ${spirit.emoji} berhasil dipanggil!\n│\n`;
    msg += `│ 📜 *Buff Aktif:*\n`;
    msg += `│  • Spirit: *${spirit.name}*\n`;
    msg += `│  • Efek: *${spirit.effect}*\n`;
    msg += `│  • Durasi: *30 Menit*\n│\n`;
    msg += `│ ⚡ Sisa Energi: *${profile.energi}*\n`;
    msg += `│ 💰 Sisa Gold: *${profile.gold.toLocaleString()}*\n`;
    msg += `╰──────────`;

    await db.setPlayerData?.(sender, "profile", profile);
    await db.setPlayerData?.(sender, "summon", summonData);

    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("summon error:", err);
    await m.react("❌");
    return m.reply(claraWrap("summon", err.message || "Terjadi kesalahan saat pemanggilan spirit.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
