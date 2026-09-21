// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Gajian RPG — Claim daily salary

import {
  ensureRpg, addExp, addGold, checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { animGajian } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "payday",
  alias: ["gajian", "salary"],
  category: "rpg",
  description: "Menerima gaji harian",
  usage: ".gajian",
  example: ".gajian",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

const GAJIAN_COOLDOWN = 45 * 60 * 1000; // 45 menit (2700000 ms)
const GAJIAN_GOLD = 50000;
const GAJIAN_EXP = 100;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("gajian", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastGajian");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("gajian", `Cooldown gajian tersisa *${formatTime(cd)}*`, "warn"));
    }

    await animGajian(m, sock);

    addGold(m, GAJIAN_GOLD);
    addExp(m, GAJIAN_EXP);
    setCooldown(m, "lastGajian", GAJIAN_COOLDOWN);

    await m.react("🐣");

    let msg = "";
    msg += `👤 ${m.pushName || "Player"}\n`;
    msg += `💰 +Rp${GAJIAN_GOLD.toLocaleString("id-ID")}\n`;
    msg += `+${GAJIAN_EXP} EXP\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("gajian error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("gajian", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
