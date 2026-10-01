// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// patrol.js — Patroli Ranger: event acak di perimeter pertahanan
// Rombak khas 9 Sep 2026 (batch #6 antrean animasi per-game):
// - Animasi bentuk baru RONDA PERIMETER (🛡️ pos-per-pos mengelilingi markas)
// - Item khas: 🎖️ Lencana Patroli (25% per patroli, monster dijamin) → upgrade Peralatan Ranger
// - Result box rapih raraRpgBox

import { getDatabase } from "../../src/lib/rara-database.js";
import { getCash, spendCash, formatRp } from "../../src/lib/rara-rpg-service.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { shapePatrol } from "../../src/lib/rara-rpg-shapes.js";

const pluginConfig = {
  name: "patrol",
  alias: ["patrol", "patroli", "rangerpatrol"],
  category: "rpg",
  description: "Patroli Ranger untuk menjelajahi area pertahanan dan menghadapi berbagai event acak",
  usage: ".patrol\n.patrol status\n.patrol upgrade",
  example: ".patrol",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 0, isEnabled: true,
};

const PATROL_COST = 15;

// ─── KHAS PATROL: 🎖️ Lencana Patroli & 🛡️ Peralatan Ranger ───
const TOOL = {
  name: "🛡️ Peralatan Ranger", dbKey: "patrolTool",
  BADGE_CHANCE: 25,              // % per patroli (event monster dijamin +1)
  badgeCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 40000 * (lv + 1),
  rewardBonus: (lv) => 0.1 * lv,  // gold & EXP event +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, badges: 0 });

const PATROL_FLAVOR = {
  monster: "⚔️ MONSTER DIKALAHKAN!",
  treasure: "💎 HARTA DITEMUKAN!",
  nothing: "🛡️ PATROLI AMAN!",
  trap: "⚠️ KENA JEBAKAN!",
  merchant: "🛒 PEDAGANG MISTERIUS!",
  shrine: "⛩️ KUIL SUCI DITEMUKAN!",
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
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(sender);
    const lv = tool.level || 0;

    // ── subcommand khas patrol: status & upgrade ──
    if (sub === "status" || sub === "peralatan") {
      return m.reply(raraRpgBox("patrol",
        `🛡️ PERALATAN RANGER KAMU\n\n` +
        `Level : *Lv.${lv}*\n💰 Bonus gold event : +${10 * lv}%\n✨ Bonus EXP event : +${10 * lv}%\n🎖️ Lencana Patroli : ${tool.badges || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.badgeCost(lv)}x Lencana + ${formatRp(TOOL.rpCost(lv))}\nKetik: .patrol upgrade`));
    }

    if (sub === "upgrade") {
      const needBadge = TOOL.badgeCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.badges || 0) < needBadge) {
        return m.reply(raraRpgBox("patrol",
          `🎖️ Upgrade Peralatan ke Lv.${lv + 1} butuh:\n\n• Lencana Patroli : ${needBadge}x (punya ${tool.badges || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Lencana didapat dari .patrol sendiri — 25% per patroli, event monster dijamin +1!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("patrol", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(sender);
      fresh.badges = (fresh.badges || 0) - needBadge;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("patrol",
        `🛡️ PERALATAN UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n💰 Bonus gold event : +${10 * (lv + 1)}%\n✨ Bonus EXP event : +${10 * (lv + 1)}%\n\n🎖️ Material : −${needBadge} Lencana Patroli\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    const profile = await db.getPlayerData?.(sender, "profile") || { hp: 100, maxHp: 100, energi: 100, gold: 1000, exp: 0 };

    profile.hp = profile.hp !== undefined ? profile.hp : 100;
    profile.maxHp = profile.maxHp || 100;
    profile.energi = profile.energi !== undefined ? profile.energi : 100;
    profile.gold = profile.gold || 0;
    profile.exp = profile.exp || 0;

    if (profile.hp <= 0) {
      await m.react("❌");
      return m.reply(raraRpgBox("patrol", "HP kamu telah habis! Gunakan item penyembuh atau istirahat terlebih dahulu sebelum berpatroli.", "error"));
    }

    if (profile.energi < PATROL_COST && !m.isOwner) {
      await m.react("❌");
      return m.reply(raraRpgBox("patrol", `Energi tidak cukup! Patroli membutuhkan *${PATROL_COST} Energi*, kamu saat ini memiliki *${profile.energi} Energi*.`, "error"));
    }

    if (!m.isOwner) {
      profile.energi -= PATROL_COST;
    }

    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    let eventLines = [];
    const bonus = TOOL.rewardBonus(lv);

    // Animasi khas patrol: RONDA PERIMETER (pos-per-pos mengelilingi markas)
    await shapePatrol(m, sock);

    if (event.type === "monster") {
      const goldGain = Math.floor((Math.floor(Math.random() * 1000) + 500) * (1 + bonus));
      const expGain = Math.floor((Math.floor(Math.random() * 200) + 100) * (1 + bonus));
      profile.gold += goldGain;
      profile.exp += expGain;
      eventLines = [
        `💰 Gold : +${goldGain.toLocaleString()}`,
        `💵 Uang : Rp ${getCash(m)}`,
        `✨ EXP : +${expGain}`,
      ];
    } else if (event.type === "treasure") {
      const goldGain = Math.floor((Math.floor(Math.random() * 1200) + 800) * (1 + bonus));
      profile.gold += goldGain;
      eventLines = [`💰 Harta ditemukan : +${goldGain.toLocaleString()} Gold`];
    } else if (event.type === "nothing") {
      const expGain = Math.floor(50 * (1 + bonus));
      profile.exp += expGain;
      eventLines = [`✨ EXP : +${expGain} dari pengalaman patroli`];
    } else if (event.type === "trap") {
      const hpLoss = Math.floor(Math.random() * 16) + 15;
      profile.hp = Math.max(0, profile.hp - hpLoss);
      eventLines = [`💔 Kena jebakan : -${hpLoss} HP`];
    } else if (event.type === "merchant") {
      const inventory = await db.getPlayerData?.(sender, "inventory") || { items: {} };
      if (!inventory.items) inventory.items = {};
      inventory.items["Ramuan Suci"] = (inventory.items["Ramuan Suci"] || 0) + 1;
      await db.setPlayerData?.(sender, "inventory", inventory);
      eventLines = [`🎁 Dapat hadiah : Ramuan Suci x1`];
    } else if (event.type === "shrine") {
      const hpHeal = 40;
      const energyRestored = 20;
      profile.hp = Math.min(profile.maxHp, profile.hp + hpHeal);
      profile.energi += energyRestored;
      eventLines = [
        `💚 HP : +${hpHeal}`,
        `⚡ Energi : +${energyRestored}`,
      ];
    }

    // 🎖️ Lencana Patroli — item khas patrol
    let badgeGain = 0;
    if (event.type === "monster") badgeGain = 1;
    if (badgeGain === 0 && Math.random() * 100 < TOOL.BADGE_CHANCE) badgeGain = 1;
    if (badgeGain > 0) {
      const freshTool = getTool(sender);
      freshTool.badges = (freshTool.badges || 0) + badgeGain;
      getDatabase().setPlayerData(sender, TOOL.dbKey, freshTool);
    }

    await db.setPlayerData?.(sender, "profile", profile);

    await m.react("🐣");
    return m.reply(raraRpgBox("patrol",
      `${PATROL_FLAVOR[event.type] || "🧭 PATROLI SELESAI!"}\n\n` +
      `${event.narrative}\n\n` +
      `${event.icon} Event : ${event.name}\n` +
      `${eventLines.join("\n")}\n` +
      (badgeGain ? `🎖️ Lencana Patroli : +${badgeGain}x (total ${getTool(sender).badges}x)\n` : "") +
      `\n` +
      `❤️ HP : ${profile.hp}/${profile.maxHp}\n⚡ Energi : ${profile.energi}\n💰 Total Gold : ${profile.gold.toLocaleString()}\n` +
      (lv ? `🛡️ Peralatan : Lv.${lv} (+${10 * lv}% gold & EXP event)` : `💡 Peralatan bisa diupgrade: .patrol status`)));
  } catch (err) {
    console.error("patrol error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("patrol", err.message || "Terjadi kesalahan saat patroli.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
