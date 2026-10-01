// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG — Meditation: istirahat pulihkan HP, Mana & Energi (revival dari RPG lama, disesuaikan sistem baru)

import { ensureRpg, getRpgData, regenEnergy, regenMana, regenHP } from "../../src/lib/rara-rpg-service.js";
import { gameCTA, renderStatBar, raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "meditation",
  alias: ["meditation", "meditasi", "istirahat"],
  category: "rpg",
  description: "Istirahat/meditasi untuk pulihkan HP, Mana & Energi",
  usage: ".meditation",
  example: ".meditation",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 600,
  energi: 0,
  isEnabled: true,
};

async function handler(m) {
  try {
    await m.react("🕒");
    ensureRpg(m, m.pushName || "Player");
    const rpg = getRpgData(m);

    const curHp = rpg.hp || 100;
    const maxHp = rpg.maxHp || 100;
    const curMana = rpg.mana || 50;
    const maxMana = rpg.maxMana || 50;
    const curEnergy = rpg.energy || 100;
    const maxEnergy = rpg.maxEnergy || 100;

    // Kalau sudah full semua
    if (curHp >= maxHp && curMana >= maxMana && curEnergy >= maxEnergy) {
      await m.react("🐣");
      return m.reply(raraRpgBox("Meditasi", [
        "Kamu sudah dalam kondisi prima! Tidak ada yang perlu dipulihkan.",
        `❤️ HP : ${curHp}/${maxHp}`,
        `💙 Mana : ${curMana}/${maxMana}`,
        `⚡ Energi : ${curEnergy}/${maxEnergy}`,
      ]));
    }

    // Animasi istirahat sebentar
    await m.reply(raraRpgBox("Meditasi", "💤 Beristirahat sejenak... memulihkan energi..."));
    await new Promise((r) => setTimeout(r, 2500));

    // Pulihkan random
    const hpRec = Math.min(maxHp - curHp, 30 + Math.floor(Math.random() * 20));
    const manaRec = Math.min(maxMana - curMana, 25 + Math.floor(Math.random() * 15));
    const energyRec = Math.min(maxEnergy - curEnergy, 40 + Math.floor(Math.random() * 20));

    regenHP(m, hpRec);
    regenMana(m, manaRec);
    regenEnergy(m, energyRec);

    const fresh = getRpgData(m);
    await m.react("🐣");
    const msg = raraRpgBox("Meditasi", [
      "✨ Istirahat selesai! Kamu merasa lebih segar.",
      "---",
      { sub: "Pulih" },
      `❤️ HP : +${hpRec} → ${renderStatBar(fresh.hp, fresh.maxHp)}`,
      `💙 Mana : +${manaRec} → ${renderStatBar(fresh.mana, fresh.maxMana)}`,
      `⚡ Energi : +${energyRec} → ${renderStatBar(fresh.energy, fresh.maxEnergy)}`,
      "---",
      gameCTA("meditation"),
    ]);
    return m.reply(msg);
  } catch (e) {
    console.error("[meditation] Error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("Meditasi", "Yah gagal kak, coba lagi 😩", "error"));
  }
}

export { pluginConfig as config, handler };
