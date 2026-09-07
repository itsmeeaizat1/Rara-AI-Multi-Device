// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Boss Raid — Fight powerful bosses (needs key, high reward)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, addGems,
  addItem, getEquipStats, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime, MONSTER_DB
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animBattle, rpgSleep } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bossraid",
  alias: ["bossraid", "boss", "raid"],
  category: "rpg",
  description: "Raid boss untuk hadiah epic (butuh Kunci Boss, Lv.40+)",
  usage: ".bossraid",
  example: ".bossraid",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

const BOSS_COOLDOWN = 30 * 60 * 1000; // 30 menit
const BOSS_ENERGY = 30;
const MIN_LEVEL = 40;

// Boss pool — makin tinggi level, makin kuat
const BOSS_POOL = [
  { id: "ancientDragon", name: "Naga Kuno", minLv: 40, hp: 5000, atk: 250, def: 120, exp: 2000, gold: 2000, drops: [{ item: "dragonScale", chance: 50 }, { item: "mithrilOre", chance: 20 }] },
  { id: "fireDrake", name: "Fire Drake", minLv: 50, hp: 3000, atk: 180, def: 80, exp: 1500, gold: 1500, drops: [{ item: "dragonScale", chance: 30 }, { item: "goldOre", chance: 60 }] },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("bossraid", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (rpg.level < MIN_LEVEL) {
      await m.react("🚫");
      return m.reply(novaRpgBox("bossraid", `Butuh minimal *Level ${MIN_LEVEL}* untuk raid boss. Level kamu: *${rpg.level}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastBossRaid");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("bossraid", `Cooldown boss raid tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < BOSS_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("bossraid", `Energi kurang! Butuh *${BOSS_ENERGY} energy*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    // Pilih boss sesuai level
    let boss = BOSS_POOL.find(b => rpg.level >= b.minLv);
    if (!boss) boss = BOSS_POOL[0];

    // Cek kunci boss (optional — tanpa kunci masih bisa tapi boss 2x kuat)
    const hasKey = rpg.inventory?.bossKey?.qty > 0;
    let bossMultiplier = 1;
    let keyText = "Tanpa kunci (boss 2x lebih kuat, reward tetap)";

    if (hasKey) {
      rpg.inventory.bossKey.qty -= 1;
      if (rpg.inventory.bossKey.qty <= 0) delete rpg.inventory.bossKey;
      bossMultiplier = 0.5; // boss lebih lemah dengan kunci
      keyText = "Kunci Boss digunakan (boss lebih lemah)";
    }

    useEnergy(m, BOSS_ENERGY, sock);

    // Combat
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk;
    const playerDef = rpg.def + equip.def;
    let playerHp = rpg.hp;

    let bossHp = Math.floor(boss.hp * bossMultiplier);
    const bossAtk = Math.floor(boss.atk * bossMultiplier);
    const bossDef = Math.floor(boss.def * bossMultiplier);

    let rounds = 0;
    const maxRounds = 20;
    let totalDmgTaken = 0;
    const log = [];

    // Boss battle intro
    await m.reply("🐉 Boss muncul! Bersiap...");
    await rpgSleep(1000);

    while (bossHp > 0 && playerHp - totalDmgTaken > 0 && rounds < maxRounds) {
      rounds++;

      // Player attack
      const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
      const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - bossDef / (bossDef + 100))));
      bossHp -= playerDmg;
      log.push(`R${rounds}: Hit ${playerDmg}${crit ? " CRIT" : ""}`);

      if (bossHp <= 0) break;

      // Boss attack
      const bossDmg = Math.max(1, Math.floor(bossAtk * (1 - playerDef / (playerDef + 100))));
      if (Math.random() * 100 < (rpg.evasion + equip.evasion)) {
        log.push(`R${rounds}: Boss miss!`);
      } else {
        totalDmgTaken += bossDmg;
        log.push(`R${rounds}: Boss hit ${bossDmg}`);
      }
    }

    const won = bossHp <= 0;

    if (won) {
      const expGain = Math.floor(boss.exp * (1 + (rpg.expBonus || 0) / 100));
      const goldGain = Math.floor(boss.gold * (1 + (rpg.goldFind || 0) / 100));
      const drops = rollDrop(boss.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

      addExp(m, expGain);
      addGold(m, goldGain);

      // Boss selalu kasih gems
      const gemGain = 5 + Math.floor(rpg.level / 10);
      addGems(m, gemGain);

      for (const d of drops) {
        addItem(m, d.item, d.qty);
      }

      // Chance untuk rebirth stone
      if (Math.random() < 0.1) {
        addItem(m, "rebirthStone", 1);
      }

      saveRpg(m, {
        hp: Math.max(1, rpg.hp - totalDmgTaken),
        bossKills: (rpg.bossKills || 0) + 1,
        totalKills: (rpg.totalKills || 0) + 1,
      });
      setCooldown(m, "lastBossRaid", BOSS_COOLDOWN);

      const dropLines = [];
      if (drops.length > 0) {
        const grouped = {};
        for (const d of drops) grouped[d.item] = (grouped[d.item] || 0) + d.qty;
        for (const [item, qty] of Object.entries(grouped)) {
          dropLines.push(`│ • 📦 ${ITEM_DB[item]?.name || item} : +${qty}x`);
        }
      }

      await m.react("🐣");
      return m.reply(novaGameBox({
        title: "bossraid", icon: "👹",
        flavor: "🏆 *BOSS DIKALAHKAN!*",
        body: [
          `│ • 👹 Boss : ${boss.name}`,
          keyText,
          `│ • ⚔️ Pertarungan : ${rounds} ronde`,
          "",
          `│ • ✨ EXP : +${expGain}`,
          `│ • 💰 Gold : +${goldGain}`,
          `│ • 💎 Gems : +${gemGain}`,
          ...dropLines,
          ...(Math.random() < 0.1 ? [`│ • 🎁 Bonus : +1x Batu Reinkarnasi`] : []),
          "",
          `│ • ❤️ HP : ${Math.max(1, rpg.hp - totalDmgTaken)}/${rpg.maxHp}`,
          `│ • 👑 Boss kills : ${(rpg.bossKills || 0) + 1}`,
        ].join("\n"),
        cta: gameCTA("bossraid"),
      }));
    } else {
      saveRpg(m, { hp: Math.max(1, rpg.hp - totalDmgTaken) });
      setCooldown(m, "lastBossRaid", BOSS_COOLDOWN);

      await m.react("❌");
      return m.reply(novaGameBox({
        title: "bossraid", icon: "👹",
        flavor: "💀 *KALAH DARI BOSS!*",
        body: [
          `│ • 👹 Boss : ${boss.name}`,
          keyText,
          `│ • ⚔️ Pertarungan : ${rounds} ronde`,
          `│ • 💥 DMG diterima : ${totalDmgTaken}`,
          `│ • ❤️ HP : ${Math.max(1, rpg.hp - totalDmgTaken)}/${rpg.maxHp}`,
          "",
          "💡 Tingkatkan equipment & level dulu",
          "Gunakan .craftrpg untuk bikin item lebih kuat",
        ].join("\n"),
        cta: gameCTA("bossraid"),
      }));
    }
  } catch (err) {
    console.error("bossraid error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("bossraid", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };