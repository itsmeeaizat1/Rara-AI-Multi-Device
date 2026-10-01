// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Rumor & Savepoint — World rumors and save points

import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "rumor",
  alias: ["rumor"],
  category: "rpg",
  description: "Rumor dunia RPG dan save point",
  usage: ".rumor | .savepoint",
  example: ".rumor",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const RUMORS = [
  "💀 Penjaga Kuil telah bangkit! Hati-hati petualang...",
  "🎁 Event harta akan muncul besok! Siapkan inventorymu!",
  "🌪️ Badai di Gunung Utara membuat monster lebih agresif!",
  "🧙 Penyihir tua mencari murid berbakat...",
  "⚔️ Guild terkuat akan diumumkan minggu ini!",
  "🐉 Naga terlihat terbang di langit malam...",
  "💰 Pedagang misterius menjual item langka di pasar!",
  "🔮 Portal dimensi terbuka di hutan kabut...",
];

async function handler(m, { sock, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("rumor", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "rumor") {
      const rumor = RUMORS[Math.floor(Math.random() * RUMORS.length)];
      return m.reply("Rumor Tersebar:\n\n" + rumor);
    }

    if (command === "savepoint" || command === "save") {
      await m.react("🕒");
      rpg.savePoint = Date.now();
      rpg.savedLevel = rpg.level;
      rpg.savedExp = rpg.exp;
      rpg.savedGold = rpg.gold;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu menyentuh *Save Point*!\nProgres disimpan:\nLv." + rpg.level + " | " + (rpg.gold || 0) + " Gold");
    }
  } catch (e) {
    console.error("rumor error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox(m.command || "rumor", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
