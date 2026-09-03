// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Putus (kehilangan affection, gold penalty)

import { ensureRpg, getRpgData, removeGold } from "../../src/lib/nova-rpg-service.js";
import { getCintaData, breakUp, formatDurasi } from "../../src/lib/nova-rpg-cinta.js";
import { claraWrap, novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "putusmatch",
  alias: ["putusmatch"],
  category: "rpg couple",
  description: "Memutuskan hubungan pacaran di RPG",
  usage: ".putusmatch",
  example: ".putusmatch",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

const PUTUS_PENALTY = 200;

async function handler(m, { sock }) {
  try {
    ensureRpg(m, m.pushName || "Player");
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);

    if (!cinta.spouse) {
      return m.reply(claraWrap("Putus", "Kamu tidak punya pasangan!", "warn"));
    }

    // Penalty gold
    const goldLost = Math.min(rpg.gold || 0, PUTUS_PENALTY);
    removeGold(m, goldLost, sock);

    const durasi = Date.now() - (cinta.datingDate || 0);
    const durasiHari = Math.floor(durasi / 86400000);
    const wasMarried = cinta.married;

    breakUp(m);

    const msgLines = [
      `💔 @${m.sender.split("@")[0]} putus dengan ${cinta.spouseName}`,
      `Durasi: ${formatDurasi(durasi)}`,
    ];
    if (durasiHari > 0) msgLines.push(`${durasiHari} hari bersama`);
    if (wasMarried) msgLines.push("Status: Dicerai otomatis");
    msgLines.push("---", { sub: "Penalty" },
      `Gold: -${goldLost}`,
      "Affection direset ke 0");
    await m.reply(novaBox("Putus", msgLines));
    await m.react("💔");
  } catch (e) {
    console.error("[putusmatch] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
