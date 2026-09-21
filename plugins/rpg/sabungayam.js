// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Sabungayam — Cockfight betting (player vs AI rooster)

import {
  ensureRpg, addExp, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animSabung } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "cockfight",
  alias: ["sabungayam", "sabung", "ayam"],
  category: "rpg",
  description: "Sabung ayam — bet gold pada ayammu melawan AI",
  usage: ".sabungayam <bet>",
  example: ".sabungayam 500",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const SABUNG_COOLDOWN = 60 * 1000;
const MIN_BET = 20;
const MAX_BET = 5000;

const ROOSTER_NAMES = [
  "Si Jago Merah", "Si Pitung", "Bang Ijo", "Kapol Merah",
  "Si Butet", "Jalak Ijo", "Bang Karet", "Si Bule"
];

function makeRooster(name, level) {
  const baseHp = 80 + level * 5;
  return {
    name,
    hp: baseHp,
    maxHp: baseHp,
    atk: 8 + Math.floor(level * 0.8) + Math.floor(Math.random() * 5),
    def: 3 + Math.floor(level * 0.3) + Math.floor(Math.random() * 3),
    spd: 5 + Math.floor(Math.random() * 5),
  };
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("sabungayam", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const bet = parseInt(args[0]);

    if (!bet || bet < MIN_BET) {
      return m.reply(novaRpgBox("sabungayam", `Minimal bet *${MIN_BET} gold*. Contoh: .sabungayam 500`, "warn"));
    }

    if (bet > MAX_BET) {
      return m.reply(novaRpgBox("sabungayam", `Maksimal bet *${MAX_BET} gold*.`, "warn"));
    }

    if (rpg.gold < bet) {
      await m.react("🚫");
      return m.reply(novaRpgBox("sabungayam", `Gold tidak cukup! Kamu punya *${rpg.gold}*, butuh *${bet}*.`, "warn"));
    }

    const cd = checkCooldown(m, "lastSabung");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("sabungayam", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    await m.react("🕒");
    await animSabung(m, sock);

    // Create roosters
    const myRooster = makeRooster("Ayam Kamu", rpg.level);
    const enemyName = ROOSTER_NAMES[Math.floor(Math.random() * ROOSTER_NAMES.length)];
    const enemyRooster = makeRooster(enemyName, rpg.level + Math.floor(Math.random() * 6 - 3));

    removeGold(m, bet, sock);

    // Simulate fight
    let round = 1;
    const log = [];
    let myHp = myRooster.hp;
    let enemyHp = enemyRooster.hp;
    const maxRounds = 10;

    while (myHp > 0 && enemyHp > 0 && round <= maxRounds) {
      let first, second;
      if (myRooster.spd >= enemyRooster.spd) {
        first = { atk: myRooster.atk, def: enemyRooster.def, name: "Ayam Kamu", target: "enemy" };
        second = { atk: enemyRooster.atk, def: myRooster.def, name: enemyName, target: "me" };
      } else {
        first = { atk: enemyRooster.atk, def: myRooster.def, name: enemyName, target: "me" };
        second = { atk: myRooster.atk, def: enemyRooster.def, name: "Ayam Kamu", target: "enemy" };
      }

      // First attack
      const crit1 = Math.random() < 0.2;
      const dmg1 = Math.max(1, Math.floor(first.atk * (crit1 ? 1.5 : 1) * (1 - first.def / (first.def + 50))));
      if (first.target === "enemy") {
        enemyHp -= dmg1;
        log.push(`R${round}: ${first.name} menebas ${dmg1}${crit1 ? " CRIT" : ""}`);
      } else {
        myHp -= dmg1;
        log.push(`R${round}: ${first.name} menebas ${dmg1}${crit1 ? " CRIT" : ""}`);
      }

      if (myHp <= 0 || enemyHp <= 0) break;

      // Second attack
      const crit2 = Math.random() < 0.2;
      const dmg2 = Math.max(1, Math.floor(second.atk * (crit2 ? 1.5 : 1) * (1 - second.def / (second.def + 50))));
      if (second.target === "enemy") {
        enemyHp -= dmg2;
        log.push(`R${round}: ${second.name} menebas ${dmg2}${crit2 ? " CRIT" : ""}`);
      } else {
        myHp -= dmg2;
        log.push(`R${round}: ${second.name} menebas ${dmg2}${crit2 ? " CRIT" : ""}`);
      }

      round++;
    }

    const won = myHp > 0 && enemyHp <= 0;
    const draw = myHp > 0 && enemyHp > 0;

    let payout = 0;
    let expGain = 0;

    if (won) {
      payout = Math.floor(bet * 1.8);
      addGold(m, payout);
      expGain = 30 + Math.floor(Math.random() * 20);
      addExp(m, expGain);
    } else if (draw) {
      payout = bet; // refund
      addGold(m, payout);
    }

    setCooldown(m, "lastSabung", SABUNG_COOLDOWN);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "sabungayam", icon: "🐓",
      flavor: won ? "🏆 *AYAMMU MENANG!*" : draw ? "🤝 *SERI!*" : "💀 *KALAH!*",
      body: [
        `Ayam Kamu vs ${enemyName}`,
        "",
        "Pertarungan:",
        ...log.slice(-5),
        "",
        `│ • 💵 Bet : ${bet} gold`,
        ...(won
          ? [`│ • 🏆 Payout : ${payout} gold (net +${payout - bet})`, `│ • ✨ EXP : +${expGain}`]
          : draw
          ? [`│ • 💰 Refund : ${payout} gold`]
          : [`│ • 💸 Rugi : -${bet} gold`]),
        `│ • 💰 Gold : ${rpg.gold - bet + payout}`,
      ].join("\n"),
      cta: gameCTA("sabungayam"),
    }));
  } catch (err) {
    console.error("sabungayam error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("sabungayam", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
