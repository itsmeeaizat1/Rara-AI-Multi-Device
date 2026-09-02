// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Ojek — Drive people for gold (motorcycle taxi)

import {
  ensureRpg, addExp, addGold, useEnergy,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { rpgProgress } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "ojekrpg",
  alias: ["ojekrpg", "ojek", "gojek", "taxirpg"],
  category: "rpg",
  description: "Jadi driver ojek — antar penumpang untuk gold",
  usage: ".ojekrpg",
  example: ".ojekrpg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const OJEK_ENERGY = 7;
const OJEK_COOLDOWN = 60 * 1000;

const PASSENGERS = [
  { name: "Bu Sari", distance: [1, 5], goldPerKm: 8, tipChance: 20, tipAmount: [5, 20] },
  { name: "Pak Budi", distance: [2, 8], goldPerKm: 10, tipChance: 15, tipAmount: [10, 30] },
  { name: "Mas Joko", distance: [3, 10], goldPerKm: 12, tipChance: 25, tipAmount: [5, 15] },
  { name: "Mbak Rina", distance: [1, 6], goldPerKm: 9, tipChance: 30, tipAmount: [8, 25] },
  { name: "Pak Dosen", distance: [5, 15], goldPerKm: 15, tipChance: 10, tipAmount: [20, 50] },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("ojekrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastOjek");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("ojekrpg", `Cooldown ojek tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < OJEK_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("ojekrpg", `Energi kurang! Butuh *${OJEK_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, OJEK_ENERGY, sock);

    // Animation
    await rpgProgress(m, sock, [
      "🛵 Ngebut ke lokasi penumpang...",
      "⏳ Mengantar penumpang...",
      "📦 Selesai mengantar...",
    ], 900);

    const passenger = PASSENGERS[Math.floor(Math.random() * PASSENGERS.length)];
    const distance = Math.floor(Math.random() * (passenger.distance[1] - passenger.distance[0] + 1)) + passenger.distance[0];
    const baseFare = distance * passenger.goldPerKm;
    const expGain = 15 + distance * 3;

    // Tip
    let tip = 0;
    if (Math.random() * 100 < passenger.tipChance) {
      tip = Math.floor(Math.random() * (passenger.tipAmount[1] - passenger.tipAmount[0] + 1)) + passenger.tipAmount[0];
    }

    const totalGold = baseFare + tip;
    addGold(m, totalGold);
    addExp(m, expGain);

    setCooldown(m, "lastOjek", OJEK_COOLDOWN);

    await m.react("🐣");
    let msg = "";
    msg += `🏍️ Penumpang: *${passenger.name}*\n`;
    msg += `📍 Jarak: *${distance} km*\n`;
    msg += `
`;
    msg += `📦 *ʜᴀsɪʟ* ${tip > 0 ? "+ tip!" : ""}\n`;
    msg += `💰 Ongkos: *+${baseFare}*\n`;
    if (tip > 0) msg += `Tip: *+${tip} gold*\n`;
    msg += `✦ EXP: *+${expGain}*\n`;
    msg += `
`;
    msg += `💼 Gold: *${rpg.gold + totalGold}*\n`;
    msg += `⚡ Energy: *${rpg.energy - OJEK_ENERGY}/${rpg.maxEnergy}*\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("ojekrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("ojekrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
