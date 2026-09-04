import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { animAdventure } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "patrol",
  alias: ["patrol", "patroli", "rangerpatrol"],
  category: "rpg",
  description: "Patroli Ranger untuk menjelajahi area pertahanan dan menghadapi berbagai event acak",
  usage: ".patrol",
  example: ".patrol",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const PATROL_COST = 15;

const PATROL_FLAVOR = {
  monster: "⚔️ *MONSTER DIKALAHKAN!*",
  treasure: "💎 *HARTA DITEMUKAN!*",
  nothing: "🛡️ *PATROLI AMAN!*",
  trap: "⚠️ *KENA JEBAKAN!*",
  merchant: "🛒 *PEDAGANG MISTERIUS!*",
  shrine: "⛩️ *KUIL SUCI DITEMUKAN!*",
};

const EVENTS = [
  {
    type: "monster",
    name: "Pertempuran Monster",
    icon: "⚔️",
    narrative: "Saat berpatroli di garis depan, seekor Monster Liar muncul dari kegelapan dan menyerangmu!",
  },
  {
    type: "treasure",
    name: "Penemuan Harta",
    icon: "💎",
    narrative: "Di sela-sela semak belukar, kamu menemukan peti kayu tua tersembunyi yang berisi gold!",
  },
  {
    type: "nothing",
    name: "Patroli Aman",
    icon: "🛡️",
    narrative: "Patroli berlangsung dengan tenang dan tanpa kendala. Seluruh perbatasan terpantau aman.",
  },
  {
    type: "trap",
    name: "Jebakan Berbahaya",
    icon: "⚠️",
    narrative: "KREK! Langkahmu memicu jebakan beracun yang dipasang musuh di tanah!",
  },
  {
    type: "merchant",
    name: "Pertemuan Pedagang",
    icon: "🛒",
    narrative: "Kamu bertemu dengan Pedagang Keliling misterius yang membagikan barang langka secara gratis!",
  },
  {
    type: "shrine",
    name: "Kuil Penyembuhan",
    icon: "⛩️",
    narrative: "Kamu menemukan Kuil Suci Kuno yang mengalirkan aura kehidupan alami.",
  },
];

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const profile = await db.getPlayerData?.(sender, "profile") || { hp: 100, maxHp: 100, energi: 100, gold: 1000, exp: 0 };

    profile.hp = profile.hp !== undefined ? profile.hp : 100;
    profile.maxHp = profile.maxHp || 100;
    profile.energi = profile.energi !== undefined ? profile.energi : 100;
    profile.gold = profile.gold || 0;
    profile.exp = profile.exp || 0;

    if (profile.hp <= 0) {
      await m.react("❌");
      return m.reply(claraWrap("patrol", "HP kamu telah habis! Gunakan item penyembuh atau istirahat terlebih dahulu sebelum berpatroli.", "error"));
    }

    if (profile.energi < PATROL_COST && !m.isOwner) {
      await m.react("❌");
      return m.reply(claraWrap("patrol", `Energi tidak cukup! Patroli membutuhkan *${PATROL_COST} Energi*, kamu saat ini memiliki *${profile.energi} Energi*.`, "error"));
    }

    if (!m.isOwner) {
      profile.energi -= PATROL_COST;
    }

    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    let eventDetail = "";

    if (event.type === "monster") {
      const goldGain = Math.floor(Math.random() * 1000) + 500;
      const expGain = Math.floor(Math.random() * 200) + 100;
      profile.gold += goldGain;
      profile.exp += expGain;
      eventDetail = [
        "Kamu berhasil mengalahkan monster!",
        `│ • 💰 Gold : +${goldGain.toLocaleString()}`,
        `│ • ✨ EXP : +${expGain}`,
      ].join("\n");
    } else if (event.type === "treasure") {
      const goldGain = Math.floor(Math.random() * 1200) + 800;
      profile.gold += goldGain;
      eventDetail = `│ • 💰 Harta ditemukan : +${goldGain.toLocaleString()} Gold`;
    } else if (event.type === "nothing") {
      const expGain = 50;
      profile.exp += expGain;
      eventDetail = `│ • ✨ EXP : +${expGain} dari pengalaman patroli`;
    } else if (event.type === "trap") {
      const hpLoss = Math.floor(Math.random() * 16) + 15;
      profile.hp = Math.max(0, profile.hp - hpLoss);
      eventDetail = `│ • 💔 Kena jebakan : -${hpLoss} HP`;
    } else if (event.type === "merchant") {
      const inventory = await db.getPlayerData?.(sender, "inventory") || { items: {} };
      if (!inventory.items) inventory.items = {};
      inventory.items["Ramuan Suci"] = (inventory.items["Ramuan Suci"] || 0) + 1;
      await db.setPlayerData?.(sender, "inventory", inventory);
      eventDetail = `│ • 🎁 Dapat hadiah : Ramuan Suci x1`;
    } else if (event.type === "shrine") {
      const hpHeal = 40;
      const energyRestored = 20;
      profile.hp = Math.min(profile.maxHp, profile.hp + hpHeal);
      profile.energi += energyRestored;
      eventDetail = [
        `│ • 💚 HP : +${hpHeal}`,
        `│ • ⚡ Energi : +${energyRestored}`,
      ].join("\n");
    }

    await db.setPlayerData?.(sender, "profile", profile);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "patrol", icon: "🧭",
      flavor: PATROL_FLAVOR[event.type] || "🧭 *PATROLI SELESAI!*",
      body: [
        event.narrative,
        "",
        `│ • ${event.icon} Event : ${event.name}`,
        eventDetail,
        "",
        `│ • ❤️ HP : ${profile.hp}/${profile.maxHp}`,
        `│ • ⚡ Energi : ${profile.energi}`,
        `│ • 💰 Total Gold : ${profile.gold.toLocaleString()}`,
      ].join("\n"),
      cta: gameCTA("patrol"),
    }));
  } catch (err) {
    console.error("patrol error:", err);
    await m.react("❌");
    return m.reply(claraWrap("patrol", err.message || "Terjadi kesalahan saat patroli.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
