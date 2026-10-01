// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Honeymoon: bulan madu bareng pasangan (khusus nikah), sekali sebulan (revival dari RPG lama)

import { ensureRpg, getRpgData, addExp, addGold } from "../../src/lib/rara-rpg-service.js";
import { raraGameBox, gameCTA, renderStatBar, raraRpgBox } from "../../src/lib/rara-games.js";
import { getCintaData, addAffection, saveCintaData } from "../../src/lib/rara-rpg-cinta.js";

const pluginConfig = {
  name: "honeymoon",
  alias: ["honeymoon", "bulanmadu", "honeymoontrip"],
  category: "rpg couple",
  description: "Bulan madu bareng pasangan (khusus nikah), sekali sebulan",
  usage: ".honeymoon",
  example: ".honeymoon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const HONEYMOON_SPOTS = [
  "Pantai Kuta, Bali",
  "Gunung Bromo",
  "Danau Toba",
  "Raja Ampat, Papua",
  "Pulau Lombok",
  "Pulau Derawan",
  "Dieng Plateau",
  "Bukittinggi, Sumatra",
];

const HONEYMOON_COOLDOWN = 30 * 86400000; // sekali sebulan

async function handler(m) {
  try {
    await m.react("🕒");
    ensureRpg(m, m.pushName || "Player");
    const cinta = getCintaData(m);

    // Harus married
    if (!cinta.spouse || !cinta.married) {
      await m.react("❗");
      return m.reply(raraRpgBox("Honeymoon", [
        "Bulan madu cuma buat yang udah menikah! 💍",
        `Nikah dulu: ${m.prefix}nikahmatch`,
      ], "error"));
    }

    // Cooldown 30 hari
    const lastHoneymoon = cinta.lastHoneymoon || 0;
    const elapsed = Date.now() - lastHoneymoon;
    if (lastHoneymoon > 0 && elapsed < HONEYMOON_COOLDOWN) {
      const daysLeft = Math.ceil((HONEYMOON_COOLDOWN - elapsed) / 86400000);
      await m.react("🕒");
      return m.reply(raraRpgBox("Honeymoon", [
        `Udah bulan madu bulan ini!`,
        `Tunggu: ${daysLeft} hari lagi`,
        `Sambil nunggu, ramein hubungan: ${m.prefix}rpgkencan`,
      ], "error"));
    }

    const partnerJid = cinta.spouse;
    const partnerName = cinta.spouseName || partnerJid.split("@")[0];
    const spot = HONEYMOON_SPOTS[Math.floor(Math.random() * HONEYMOON_SPOTS.length)];

    // Bonus berdua
    const expBonus = Math.floor(Math.random() * 50) + 100;
    const goldBonus = Math.floor(Math.random() * 100) + 200;
    const affectionBonus = Math.floor(Math.random() * 20) + 30;

    const me = { sender: m.sender, pushName: m.pushName };
    const partner = { sender: partnerJid, pushName: partnerName };

    addExp(me, expBonus);
    addExp(partner, expBonus);
    addGold(me, goldBonus);
    addGold(partner, goldBonus);
    addAffection(me, affectionBonus);
    addAffection(partner, affectionBonus);

    // Update lastHoneymoon & counter berdua
    const myCinta = getCintaData(m);
    myCinta.lastHoneymoon = Date.now();
    myCinta.honeymoonCount = (myCinta.honeymoonCount || 0) + 1;
    saveCintaData(m, myCinta);

    const pCinta = getCintaData(partner);
    pCinta.lastHoneymoon = Date.now();
    saveCintaData(partner, pCinta);

    const msg = raraGameBox({
      title: "rpg cinta", icon: "🏖️",
      flavor: `🏖️ *BULAN MADU KE ${spot.toUpperCase()}!*`,
      body: [
        `│ • 💑 Pasangan : ${m.pushName || "Player"} & ${partnerName}`,
        `│ • 📍 Lokasi : ${spot}`,
        `│ • ✨ EXP : +${expBonus} (berdua)`,
        `│ • 💰 Gold : +${goldBonus} (berdua)`,
        `│ • 💞 Affection : +${affectionBonus} berdua`,
        `│    ${renderStatBar(myCinta.affection || 0, 500)} (Total: ${myCinta.affection || 0})`,
        `│ • 🎀 Total Honeymoon : ${myCinta.honeymoonCount}`,
      ].join("\n"),
      cta: gameCTA("honeymoon"),
    });

    await m.reply(msg);
    await m.react("💞");
  } catch (e) {
    console.error("[honeymoon] Error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("Honeymoon", "Yah gagal kak, coba lagi 😩", "error"));
  }
}

export { pluginConfig as config, handler };
