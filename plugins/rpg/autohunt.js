// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  getPlayer,
  ensurePlayer,
  addExp,
  addGold,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autohunt",
  alias: ["ahunt", "autoburu", "autoberburu"],
  category: "game",
  description: "Auto berburu 5x berturut-turut (Premium only)",
  usage: ".autohunt",
  example: ".autohunt",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 300,
  energi: 0,
  isEnabled: true,
};

const MAX_HUNTS = 5;
const STAMINA_PER_HUNT = 15;
const MIN_HP_PERCENT = 20;

const MONSTERS = [
  { name: "Slime", hp: 50, gold: 30, exp: 20, dmg: 5 },
  { name: "Goblin", hp: 80, gold: 50, exp: 35, dmg: 10 },
  { name: "Wolf", hp: 120, gold: 80, exp: 50, dmg: 15 },
  { name: "Orc", hp: 200, gold: 150, exp: 80, dmg: 25 },
  { name: "Troll", hp: 150, gold: 100, exp: 60, dmg: 20 },
  { name: "Skeleton", hp: 90, gold: 60, exp: 40, dmg: 12 },
  { name: "Dark Knight", hp: 250, gold: 200, exp: 100, dmg: 30 },
  { name: "Dragon", hp: 500, gold: 500, exp: 200, dmg: 50 },
  { name: "Bandit", hp: 70, gold: 40, exp: 25, dmg: 8 },
  { name: "Giant Spider", hp: 110, gold: 70, exp: 45, dmg: 14 },
  { name: "Ice Golem", hp: 300, gold: 250, exp: 120, dmg: 35 },
  { name: "Fire Imp", hp: 60, gold: 35, exp: 22, dmg: 7 },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userName = m.pushName || "Player";
    ensurePlayer(m, userName);
    const player = getPlayer(m);

    if (!player) {
      return m.reply(claraWrap("autohunt", "Gagal memuat data player. Coba lagi."));
    }

    let stamina = player.stamina ?? 100;
    if (stamina < STAMINA_PER_HUNT) {
      return sendReplyWithNav(
        sock,
        m,
        `⚡ *STAMINA KURANG*\n\n` +
        `Butuh minimal: ${STAMINA_PER_HUNT}\n` +
        `Stamina kamu: ${stamina}\n\n` +
        `💡 Gunakan \`${prefix}stamina isi\` atau makan makanan`,
        "autohunt"
      );
    }

    let hp = player.hp ?? 100;
    const maxHp = player.maxHp ?? 100;
    if (hp < (maxHp * MIN_HP_PERCENT) / 100) {
      return sendReplyWithNav(
        sock,
        m,
        `❤️ *HP TERLALU RENDAH*\n\n` +
        `HP: ${hp}/${maxHp}\n` +
        `Minimal: ${Math.ceil((maxHp * MIN_HP_PERCENT) / 100)} HP\n\n` +
        `💡 Gunakan \`${prefix}heal\` dulu`,
        "autohunt"
      );
    }

    await m.react("🕐");

    let totalGold = 0;
    let totalExp = 0;
    let totalKills = 0;
    let totalEscapes = 0;
    let totalDamage = 0;
    let huntsDone = 0;
    const huntLog = [];

    for (let i = 0; i < MAX_HUNTS; i++) {
      const curPlayer = getPlayer(m);
      const curStamina = curPlayer.stamina ?? 100;
      if (curStamina < STAMINA_PER_HUNT) {
        huntLog.push(`Round ${i + 1}: Stamina habis, berhenti`);
        break;
      }

      const curHp = curPlayer.hp ?? 100;
      const curMaxHp = curPlayer.maxHp ?? 100;
      if (curHp < (curMaxHp * MIN_HP_PERCENT) / 100) {
        huntLog.push(`Round ${i + 1}: HP terlalu rendah, berhenti`);
        break;
      }

      savePlayer(m, {
        stamina: curStamina - STAMINA_PER_HUNT,
      });

      // Weighted monster pick
      const weights = MONSTERS.map((_, idx) => Math.max(1, 10 - idx));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * totalWeight;
      let monsterIdx = 0;
      for (let j = 0; j < weights.length; j++) {
        roll -= weights[j];
        if (roll <= 0) {
          monsterIdx = j;
          break;
        }
      }
      const monster = MONSTERS[monsterIdx];

      // Battle simulation
      const playerLevel = getPlayer(m).level ?? 1;
      const monsterLevel = Math.floor(monster.hp / 50) + 1;
      const levelBonus = Math.min(0.2, (playerLevel - monsterLevel) * 0.02);
      const killChance = Math.min(0.95, 0.7 + levelBonus);
      const killed = Math.random() < killChance;

      const damage = killed
        ? Math.floor(monster.dmg * (0.5 + Math.random() * 0.5))
        : Math.floor(monster.dmg * 0.3);

      const hpPlayer = getPlayer(m);
      const newHp = Math.max(0, (hpPlayer.hp ?? 100) - damage);
      savePlayer(m, { hp: newHp });

      if (killed) {
        const goldReward = Math.floor(monster.gold * (0.8 + Math.random() * 0.4));
        const expReward = Math.floor(monster.exp * (0.8 + Math.random() * 0.4));
        addGold(m, goldReward);
        addExp(m, expReward);
        totalGold += goldReward;
        totalExp += expReward;
        totalKills++;
        totalDamage += damage;
        huntLog.push(`Round ${i + 1}: ${monster.name} dibunuh (+${goldReward}G +${expReward}EXP, -${damage}HP)`);
      } else {
        totalEscapes++;
        totalDamage += damage;
        huntLog.push(`Round ${i + 1}: ${monster.name} kabur (-${damage}HP)`);
      }

      huntsDone++;
    }

    // Final state
    const finalPlayer = getPlayer(m);
    const finalHp = finalPlayer.hp ?? 0;
    const finalMaxHp = finalPlayer.maxHp ?? 100;
    const finalStamina = finalPlayer.stamina ?? 0;
    const finalLevel = finalPlayer.level ?? 1;
    const finalGold = finalPlayer.gold ?? 0;

    let text =
      claraWrap("Auto Hunt", [`╎❏ Total Round: *${huntsDone}/${MAX_HUNTS}*`,
        `╎❏ Monster Dibunuh: *${totalKills}*`,
        `╎❏ Monster Kabur: *${totalEscapes}*`,
        `╎❏ Total Gold: *+${totalGold.toLocaleString("id-ID")}*`,
        `╎❏ Total EXP: *+${totalExp.toLocaleString("id-ID")}*`,
        `╎❏ Total Damage: *-${totalDamage} HP*`].join("\n")) +
      "\n\n" +
      claraWrap("STATUS", [`╎❏ Level: *${finalLevel}*`, `╎❏ HP: *${finalHp}/${finalMaxHp}*`, `╎❏ Stamina: *${finalStamina}*`, `╎❏ Gold: *${finalGold.toLocaleString("id-ID")}*`].join("\n")) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      "LOG BERBURU\n";

    for (const log of huntLog) {
      text += `${log}\n`;
    }

    text +=
      "\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Cooldown: 5 menit. Ketik ${prefix}autohunt lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}heal untuk pulihkan HP`);

    await m.react("✅");
    return sendReplyWithNav(sock, m, text, "autohunt");
  } catch (error) {
    console.error("[AutoHunt] Error:", error);
    return sendReplyWithNav(
      sock,
      m,
      `❌ *ERROR*\n\n> ${error.message}\n\nCoba lagi nanti`,
      "autohunt"
    );
  }
}

export { pluginConfig as config, handler };
