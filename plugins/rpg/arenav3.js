// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Arena v3 — Multiplayer PvP tournament system

import {
  ensureRpg, saveRpg, addExp, addGold, addGems, removeGold,
  getEquipStats, pvpResult, checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "arenav3",
  alias: ["arenav3", "arena", "tournament"],
  category: "rpg",
  description: "Arena v3 — PvP 1v1 vs random player or AI, ELO rating, ranked",
  usage: ".arenav3 <ranked|casual|ai|leaderboard>",
  example: ".arenav3 ai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const ARENA_ENERGY = 15;
const ARENA_COOLDOWN = 2 * 60 * 1000;

function simulateCombat(player1, player2) {
  const p1Hp = player1.hp;
  const p2Hp = player2.hp;
  let hp1 = p1Hp, hp2 = p2Hp;
  let rounds = 0;
  const log = [];

  while (hp1 > 0 && hp2 > 0 && rounds < 20) {
    rounds++;

    // Speed determines who goes first
    const p1First = player1.spd >= player2.spd;

    function attack(attacker, defender) {
      const crit = Math.random() * 100 < (attacker.critRate || 5);
      const dmg = Math.max(1, Math.floor(attacker.atk * (crit ? 1.5 : 1) * (1 - defender.def / (defender.def + 100))));
      if (Math.random() * 100 < (attacker.evasion || 0)) return { dmg: 0, dodge: true, crit: false };
      return { dmg, dodge: false, crit };
    }

    if (p1First) {
      const hit = attack(player1, player2);
      if (!hit.dodge) hp2 -= hit.dmg;
      log.push(`R${rounds}: P1 ${hit.dodge ? "miss" : `-${hit.dmg}${hit.crit ? "!" : ""}`} → P2:${hp2}`);

      if (hp2 <= 0) break;

      const hit2 = attack(player2, player1);
      if (!hit2.dodge) hp1 -= hit2.dmg;
      log.push(`R${rounds}: P2 ${hit2.dodge ? "miss" : `-${hit2.dmg}${hit2.crit ? "!" : ""}`} → P1:${hp1}`);
    } else {
      const hit = attack(player2, player1);
      if (!hit.dodge) hp1 -= hit.dmg;
      log.push(`R${rounds}: P2 ${hit.dodge ? "miss" : `-${hit.dmg}${hit.crit ? "!" : ""}`} → P1:${hp1}`);

      if (hp1 <= 0) break;

      const hit2 = attack(player1, player2);
      if (!hit2.dodge) hp2 -= hit2.dmg;
      log.push(`R${rounds}: P1 ${hit2.dodge ? "miss" : `-${hit2.dmg}${hit2.crit ? "!" : ""}`} → P2:${hp2}`);
    }
  }

  return {
    winner: hp1 > 0 ? "p1" : (hp2 > 0 ? "p2" : "draw"),
    rounds,
    log,
    p1HpLeft: Math.max(0, hp1),
    p2HpLeft: Math.max(0, hp2),
  };
}

function makeAI(level) {
  return {
    name: "AI Arena Bot",
    level,
    hp: 100 + level * 15,
    atk: 15 + level * 3 + Math.floor(Math.random() * 10),
    def: 8 + level * 2 + Math.floor(Math.random() * 5),
    spd: 5 + Math.floor(Math.random() * 10),
    critRate: 5 + Math.floor(Math.random() * 10),
    evasion: 5 + Math.floor(Math.random() * 10),
    pvpRating: 1000 + level * 10 + Math.floor(Math.random() * 200 - 100),
  };
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("arenav3", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const mode = args[0]?.toLowerCase();

    // Leaderboard
    if (mode === "leaderboard" || mode === "top") {
      const db = getDatabase();
      const users = db.db?.data?.users || {};
      const players = Object.entries(users)
        .filter(([jid, u]) => u?.rpg?.pvpRating && jid.includes("@"))
        .map(([jid, u]) => ({ jid, name: u.name || jid.split("@")[0], rating: u.rpg.pvpRating, wins: u.rpg.arenaWins || 0, losses: u.rpg.arenaLosses || 0 }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);

      if (players.length === 0) {
        return m.reply(claraWrap("arenav3", "Belum ada player di arena.", "info"));
      }

      let msg = `╭──「 *ᴀʀᴇɴᴀ ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ* 」\n`;
      msg += `│ 📊 Top 10 Arena Players\n`;
      msg += `│\n`;
      const medal = ["🥇", "🥈", "🥉"];
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const rank = medal[i] || `${i + 1}.`;
        const wr = p.wins + p.losses > 0 ? Math.floor(p.wins / (p.wins + p.losses) * 100) : 0;
        msg += `│ ${rank} ${p.name}\n`;
        msg += `│     Rating: *${p.rating}* | W:${p.wins} L:${p.losses} (${wr}%)\n`;
      }
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // Need mode
    if (!mode || !["ranked", "casual", "ai", "bot"].includes(mode)) {
      let msg = `╭──「 *ᴀʀᴇɴᴀ ᴠ3* 」\n`;
      msg += `│ 📊 Rating: *${rpg.pvpRating || 1000}*\n`;
      msg += `│ 🏆 W:${rpg.arenaWins || 0} L:${rpg.arenaLosses || 0}\n`;
      msg += `│\n`;
      msg += `│ 📋 *ᴍᴏᴅᴇs*\n`;
      msg += `│ 🤖 .arenav3 ai — lawan AI (casual, no rating)\n`;
      msg += `│ ⚔️ .arenav3 ranked — lawan AI (rated, ELO)\n`;
      msg += `│ 🎮 .arenav3 casual — lawan AI (no stake)\n`;
      msg += `│ 📊 .arenav3 leaderboard — top players\n`;
      msg += `│\n`;
      msg += `│ ⚡ Cost: *${ARENA_ENERGY} energy*\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // Check cooldown & energy
    const cd = checkCooldown(m, "lastArenaV3");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("arenav3", `Cooldown arena tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < ARENA_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("arenav3", `Energi kurang! Butuh *${ARENA_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    await m.react("🕒");

    // Build player combat stats
    const equip = getEquipStats(m);
    const player = {
      name: m.pushName || "Player",
      level: rpg.level,
      hp: rpg.hp,
      atk: rpg.atk + equip.atk,
      def: rpg.def + equip.def,
      spd: rpg.spd + equip.spd,
      critRate: (rpg.critRate || 5) + equip.critRate,
      evasion: (rpg.evasion || 5) + equip.evasion,
      pvpRating: rpg.pvpRating || 1000,
    };

    // Pick opponent (AI for all modes)
    const aiLevel = mode === "ranked" ? rpg.level + Math.floor(Math.random() * 6 - 3) : rpg.level;
    const opponent = makeAI(Math.max(1, aiLevel));

    // Simulate combat
    const combat = simulateCombat(player, opponent);
    const won = combat.winner === "p1";
    const draw = combat.winner === "draw";

    // Energy cost
    rpg.energy = Math.max(0, rpg.energy - ARENA_ENERGY);

    let expGain = 0, goldGain = 0, gemGain = 0;
    let ratingChange = 0;

    if (won) {
      expGain = 50 + rpg.level * 3;
      goldGain = 30 + rpg.level * 2;

      if (mode === "ranked") {
        // ELO calculation
        const expected = 1 / (1 + Math.pow(10, (opponent.pvpRating - rpg.pvpRating) / 400));
        ratingChange = Math.max(8, Math.floor((1 - expected) * 32));
        goldGain += ratingChange * 2;

        // Rare gem reward
        if (Math.random() < 0.2) {
          gemGain = 1 + Math.floor(Math.random() * 2);
          addGems(m, gemGain);
        }
      }

      addExp(m, expGain);
      addGold(m, goldGain);

      saveRpg(m, {
        energy: rpg.energy,
        arenaWins: (rpg.arenaWins || 0) + 1,
        pvpRating: mode === "ranked" ? (rpg.pvpRating || 1000) + ratingChange : rpg.pvpRating,
        hp: Math.max(1, rpg.hp - (rpg.hp - combat.p1HpLeft)),
      });
    } else if (draw) {
      expGain = 20;
      addExp(m, expGain);
      saveRpg(m, { energy: rpg.energy, hp: Math.max(1, combat.p1HpLeft) });
    } else {
      if (mode === "ranked") {
        const expected = 1 / (1 + Math.pow(10, (opponent.pvpRating - rpg.pvpRating) / 400));
        ratingChange = -Math.max(5, Math.floor(expected * 32));
      }
      saveRpg(m, {
        energy: rpg.energy,
        arenaLosses: (rpg.arenaLosses || 0) + 1,
        pvpRating: mode === "ranked" ? Math.max(100, (rpg.pvpRating || 1000) + ratingChange) : rpg.pvpRating,
        hp: Math.max(1, combat.p1HpLeft),
      });
    }

    setCooldown(m, "lastArenaV3", ARENA_COOLDOWN);

    const freshRpg = ensureRpg(m, m.pushName);

    await m.react("🐣");
    let out = `╭──「 *ᴀʀᴇɴᴀ ᴠ3* 」\n`;
    out += `│ ⚔️ ${player.name} vs ${opponent.name}\n`;
    out += `│ 📊 Mode: *${mode.toUpperCase()}*\n`;
    out += `│\n`;
    out += `│ 📋 *ᴄᴏᴍʙᴀᴛ ʟᴏɢ*\n`;
    for (const l of combat.log.slice(-6)) {
      out += `│ ${l}\n`;
    }
    out += `│\n`;

    if (won) {
      out += `│ 🏆 *ᴠɪᴄᴛᴏʀʏ!*\n`;
      out += `│ ✦ EXP: *+${expGain}*\n`;
      out += `│ 💰 Gold: *+${goldGain}*\n`;
      if (gemGain > 0) out += `│ 💎 Gems: *+${gemGain}*\n`;
      if (ratingChange > 0) out += `│ 📈 Rating: *+${ratingChange}* (${freshRpg.pvpRating})\n`;
    } else if (draw) {
      out += `│ 🤝 *ᴅʀᴀᴡ!*\n`;
      out += `│ ✦ EXP: *+${expGain}*\n`;
    } else {
      out += `│ 💀 *ᴅᴇғᴇᴀᴛ!*\n`;
      if (ratingChange < 0) out += `│ 📉 Rating: *${ratingChange}* (${freshRpg.pvpRating})\n`;
    }

    out += `│\n`;
    out += `│ ❤️ HP: *${freshRpg.hp}/${rpg.maxHp}*\n`;
    out += `│ ⚡ Energy: *${freshRpg.energy}/${rpg.maxEnergy}*\n`;
    out += `╰──────────`;

    return m.reply(out);
  } catch (err) {
    console.error("arenav3 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("arenav3", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
