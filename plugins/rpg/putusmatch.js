// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Putus (kehilangan affection, gold penalty)

import { ensureRpg, getRpgData, removeGold } from "../../src/lib/nova-rpg-service.js";
import { getCintaData, breakUp, formatDurasi } from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "putusmatch",
  alias: ["putusmatch"],
  category: "rpg",
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
      return m.reply(
        `╭──「 *ᴘᴜᴛᴜs ᴍᴀᴛᴄʜ* 」\n\n」` +
        `│ 💔 Kamu tidak punya pasangan!\n\n` +
        `╰──────────❀`
      );
    }

    // Penalty gold
    const goldLost = Math.min(rpg.gold || 0, PUTUS_PENALTY);
    removeGold(m, goldLost);

    const durasi = Date.now() - (cinta.datingDate || 0);
    const durasiHari = Math.floor(durasi / 86400000);
    const wasMarried = cinta.married;

    breakUp(m);

    let msg = `╭──「 *ᴘᴜᴛᴜs ᴍᴀᴛᴄʜ* 」\n\n」`;
    msg += `│ 💔 @${m.sender.split("@")[0]} putus dengan *${cinta.spouseName}*\n`;
    msg += `│ ⏰ Durasi: *${formatDurasi(durasi)}*\n`;
    if (durasiHari > 0) msg += `│ 📅 ${durasiHari} hari bersama\n`;
    if (wasMarried) msg += `│ 💍 Status: *Dicerai otomatis*\n`;
    msg += `\n  📊 *Penalty:*\n`;
    msg += `│ 💰 Gold: *-${goldLost}*\n`;
    msg += `│ 💔 Affection direset ke *0*\n\n`;
    msg += `╰──────────❀`;

    await m.reply(msg);
    await m.react("💔");
  } catch (e) {
    console.error("[putusmatch] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
