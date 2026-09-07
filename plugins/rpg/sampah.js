// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Sampah — Collect trash for recycling (low effort, low reward, eco)

import {
  ensureRpg, addExp, addGold, useEnergy, addItem,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animGather } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "sampah",
  alias: ["sampah", "buangsampah"],
  category: "rpg",
  description: "Kumpulkan sampah untuk didaur ulang — gold kecil tapi EXP lumayan",
  usage: ".sampah",
  example: ".sampah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SAMPAH_ENERGY = 3;
const SAMPAH_COOLDOWN = 20 * 1000;

const SAMPAH_TYPES = [
  { name: "Botol Plastik", gold: 2, exp: 5, drop: "plasticBottle", chance: 80 },
  { name: "Kaleng Aluminium", gold: 5, exp: 8, drop: "aluminumCan", chance: 60 },
  { name: "Kertas Bekas", gold: 1, exp: 3, drop: "scrapPaper", chance: 90 },
  { name: "Besi Tua", gold: 8, exp: 12, drop: "scrapIron", chance: 30 },
  { name: "Elektronik Rusak", gold: 15, exp: 20, drop: "eWaste", chance: 10 },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("sampah", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastSampah");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("sampah", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < SAMPAH_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("sampah", `Energi kurang! Butuh *${SAMPAH_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, SAMPAH_ENERGY, sock);

    // Animation
    await animGather(m, sock, "🗑️", "Mengumpulkan sampah...");

    // Roll 1-3 items
    const found = [];
    const count = Math.floor(Math.random() * 3) + 1;
    let totalGold = 0;
    let totalExp = 0;

    for (let i = 0; i < count; i++) {
      const trash = SAMPAH_TYPES[Math.floor(Math.random() * SAMPAH_TYPES.length)];
      const goldGain = Math.floor(trash.gold * (1 + Math.random() * 0.5));
      const expGain = Math.floor(trash.exp * (1 + Math.random() * 0.5));

      totalGold += goldGain;
      totalExp += expGain;

      if (Math.random() * 100 < trash.chance) {
        addItem(m, trash.drop, 1);
        found.push(`${trash.name} (+${goldGain} gold, +${expGain} EXP)`);
      } else {
        found.push(`${trash.name} (+${goldGain} gold, +${expGain} EXP)`);
      }
    }

    addGold(m, totalGold);
    await bumpPlayerStat(m, "sampah", "totalSampah", 1);
    addExp(m, totalExp);

    setCooldown(m, "lastSampah", SAMPAH_COOLDOWN);

    await m.react("🐣");
    return m.reply(novaGameBox({
      title: "sampah", icon: "🗑️",
      flavor: "♻️ *SAMPAH BERHASIL DIKUMPULKAN!*",
      body: [
        `Hasil kulet sampah (${count} item):`,
        ...found.map(f => `│ • ${f}`),
        "",
        `│ • 💰 Total gold : +${totalGold}`,
        `│ • ✨ Total EXP : +${totalExp}`,
        `│ • ⚡ Energi : ${rpg.energy}/${rpg.maxEnergy}`,
      ].join("\n"),
      cta: gameCTA("sampah"),
    }));
  } catch (err) {
    console.error("sampah error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("sampah", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
