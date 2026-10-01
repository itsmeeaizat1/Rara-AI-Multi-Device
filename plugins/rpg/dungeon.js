// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Dungeon — Explore dungeon for big rewards (high risk)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy, useMana,
  addItem, getEquipStats, getRandomMonster, rollDrop, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  getCash, spendCash, formatRp} from "../../src/lib/rara-rpg-service.js";
import { reactCooldown } from "../../src/lib/rara-menu-style.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { shapeDungeon } from "../../src/lib/rara-rpg-shapes.js";
import { rpgSleep } from "../../src/lib/rara-rpg-anim.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "dungeon",
  alias: ["dungeon", "dg"],
  category: "rpg",
  description: "Jelajahi dungeon untuk hadiah besar (high risk, high reward)",
  usage: ".dungeon",
  example: ".dungeon",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const DG_ENERGY = 20;
const DG_COOLDOWN = 10 * 60 * 1000; // 10 menit
const DG_MIN_LEVEL = 10;

// ─── KHAS DUNGEON: 🗿 Relik Kegelapan & 🕯️ Lentera Abadi ───
const TOOL = {
  name: "🕯️ Lentera Abadi", dbKey: "dungeonTool",
  RELIC_CHANCE: 25,           // % per stage clear (full clear dijamin +2)
  relicCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 50000 * (lv + 1),
  rewardBonus: (lv) => 0.1 * lv,  // EXP & gold dungeon +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, relics: 0 });

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("dungeon", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // ── subcommand khas dungeon: lentera status & upgrade ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    if (sub === "lentera" || sub === "status") {
      return m.reply(raraRpgBox("dungeon",
        `🕯️ LENTERA ABIADI KAMU\n\n` +
        `Level : *Lv.${lv}*\n✨ Bonus EXP dungeon : +${10 * lv}%\n💰 Bonus gold dungeon : +${10 * lv}%\n🗿 Relik Kegelapan : ${tool.relics || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.relicCost(lv)}x Relik + ${formatRp(TOOL.rpCost(lv))}\nKetik: .dungeon upgrade`));
    }

    if (sub === "upgrade") {
      const needRelic = TOOL.relicCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.relics || 0) < needRelic) {
        return m.reply(raraRpgBox("dungeon",
          `🗿 Upgrade Lentera ke Lv.${lv + 1} butuh:\n\n• Relik Kegelapan : ${needRelic}x (punya ${tool.relics || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Relik didapat dari .dungeon sendiri — 25% per stage clear, full clear dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("dungeon", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.relics = (fresh.relics || 0) - needRelic;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("dungeon",
        `🕯️ LENTERA UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n✨ Bonus EXP dungeon : +${10 * (lv + 1)}%\n💰 Bonus gold dungeon : +${10 * (lv + 1)}%\n\n🗿 Material : −${needRelic} Relik Kegelapan\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    if (rpg.level < DG_MIN_LEVEL) {
      await m.react("🚫");
      return m.reply(raraRpgBox("dungeon", `Butuh minimal *Level ${DG_MIN_LEVEL}* untuk masuk dungeon. Level kamu: *${rpg.level}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastDungeon");
    if (cd) {
      await reactCooldown(m);
      return m.reply(raraRpgBox("dungeon", `Cooldown dungeon tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < DG_ENERGY) {
      await m.react("🚫");
      return m.reply(raraRpgBox("dungeon", `Energi kurang! Butuh *${DG_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    // Cek kunci dungeon
    const hasKey = rpg.inventory?.dungeonKey?.qty > 0;
    if (hasKey) {
      // Pakai kunci
      rpg.inventory.dungeonKey.qty -= 1;
      if (rpg.inventory.dungeonKey.qty <= 0) delete rpg.inventory.dungeonKey;
    }

    useEnergy(m, DG_ENERGY, sock);

    // Animasi khas dungeon: TURUN KE KEDALAMAN (descent B1→Bn, lentera makin redup)
    const stageCount = hasKey ? 5 : 3;
    await shapeDungeon(m, sock, stageCount, hasKey);

    // Dungeon: 3 stage dengan monster makin kuat
    const equip = getEquipStats(m);
    const playerAtk = rpg.atk + equip.atk;
    const playerDef = rpg.def + equip.def;
    let playerHp = rpg.hp;
    let totalExp = 0;
    let totalGold = 0;
    let totalDrops = [];
    let stagesCleared = 0;

    const baseLevel = Math.max(rpg.level, 10);

    for (let stage = 1; stage <= stageCount; stage++) {
      await m.reply(`🏰 Stage ${stage}/${stageCount} — ${hasKey ? "🔑" : ""} Musuh muncul...`);
      await rpgSleep(800);
      const monster = getRandomMonster(baseLevel + stage * 5);
      if (!monster) break;

      let monsterHp = monster.hp * (1 + stage * 0.3);
      let monsterAtk = monster.atk * (1 + stage * 0.2);
      let monsterDef = monster.def + stage * 2;
      let rounds = 0;
      let dmgTaken = 0;

      while (monsterHp > 0 && playerHp - dmgTaken > 0 && rounds < 15) {
        const crit = Math.random() * 100 < (rpg.critRate + equip.critRate);
        const playerDmg = Math.max(1, Math.floor(playerAtk * (crit ? 1.5 : 1) * (1 - monsterDef / (monsterDef + 100))));
        monsterHp -= playerDmg;
        rounds++;

        if (monsterHp <= 0) break;

        const monsterDmg = Math.max(1, Math.floor(monsterAtk * (1 - playerDef / (playerDef + 100))));
        if (Math.random() * 100 < (rpg.evasion + equip.evasion)) continue;
        dmgTaken += monsterDmg;
      }

      if (monsterHp <= 0) {
        stagesCleared++;
        const sExp = Math.floor(monster.exp * (1 + stage * 0.5) * (1 + (rpg.expBonus || 0) / 100) * (1 + TOOL.rewardBonus(lv)));
        const sGold = Math.floor(monster.gold * (1 + stage * 0.5) * (1 + (rpg.goldFind || 0) / 100) * (1 + TOOL.rewardBonus(lv)));
        const sDrops = rollDrop(monster.drops || [], rpg.luck || 0, rpg.dropBonus || 0);

        totalExp += sExp;
        totalGold += sGold;
        for (const d of sDrops) {
          totalDrops.push(d);
          addItem(m, d.item, d.qty);
        }

        playerHp -= dmgTaken;
        if (playerHp <= 0) break;
      } else {
        playerHp -= dmgTaken;
        break;
      }
    }

    // Apply rewards
    if (stagesCleared > 0) {
      addExp(m, totalExp);
      addGold(m, totalGold);
    }

    // Boss bonus: clear semua stage
    let bossBonusLines = [];
    if (stagesCleared === stageCount) {
      const bonusGold = totalGold * 2;
      const bonusExp = totalExp * 2;
      addGold(m, bonusGold);
      addExp(m, bonusExp);
      bossBonusLines = [
        "👑 Boss Bonus — semua stage clear!",
        `💰 Bonus gold : +${bonusGold}`,
        `✨ Bonus EXP : +${bonusExp}`,
      ];
    }

    // 🗿 Relik Kegelapan — item khas dungeon (25% per stage clear, full clear +2)
    let relicGain = 0;
    for (let i = 0; i < stagesCleared; i++) {
      if (Math.random() * 100 < TOOL.RELIC_CHANCE) relicGain++;
    }
    if (stagesCleared === stageCount) relicGain += 2;
    if (relicGain > 0) {
      const freshTool = getTool(m.sender);
      freshTool.relics = (freshTool.relics || 0) + relicGain;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, freshTool);
    }

    // Save HP
    const newHp = Math.max(1, playerHp);
    saveRpg(m, { hp: newHp });
    setCooldown(m, "lastDungeon", DG_COOLDOWN);

    let dropLines = [];
    if (totalDrops.length > 0) {
      const grouped = {};
      for (const d of totalDrops) {
        grouped[d.item] = (grouped[d.item] || 0) + d.qty;
      }
      dropLines = Object.entries(grouped).map(([item, qty]) => `📦 Drop : +${qty}x ${ITEM_DB[item]?.name || item}`);
    }

    await m.react("🐣");
    return m.reply(raraRpgBox("dungeon",
      `${stagesCleared === stageCount ? "🏆 DUNGEON DIBERSIHKAN!" : stagesCleared > 0 ? "⚔️ EKSPEDISI SELESAI!" : "💀 GAGAL DI DUNGEON!"}\n\n` +
      `🏰 Stage clear : ${stagesCleared}/${stageCount}\n` +
      `${hasKey ? "🔑 Dungeon Key digunakan (+2 stage)" : "⚠️ Tanpa kunci (max 3 stage)"}\n\n` +
      `✨ EXP : +${totalExp}\n💰 Gold : +${totalGold}\n💵 Uang : Rp ${getCash(m)}\n` +
      `${dropLines.join("\n")}\n` +
      (relicGain ? `🗿 Relik Kegelapan : +${relicGain}x (total ${getTool(m.sender).relics}x)\n` : "") +
      `${bossBonusLines.length ? "\n" + bossBonusLines.join("\n") + "\n" : ""}\n` +
      `❤️ HP : ${newHp}/${rpg.maxHp}\n⚡ Energi : ${rpg.energy}/${rpg.maxEnergy}\n` +
      (lv ? `🕯️ Lentera : Lv.${lv} (+${10 * lv}% EXP & gold dungeon)` : `💡 Lentera bisa diupgrade: .dungeon lentera`)));
  } catch (err) {
    console.error("dungeon error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("dungeon", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };