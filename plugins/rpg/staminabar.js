// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// staminabar.js — Stamina system (manage energy for RPG activities)
import { getDatabase } from "../../src/lib/nova-database.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "staminabar",
  alias: ["staminabar", "stamina", "energibar", "staminarpg"],
  category: "rpg",
  description: "Stamina system — kelola energy untuk aktivitas RPG",
  usage: ".stamina (status)\n.stamina rest (istirahat, restore)\n.stamina buy (beli stamina)",
  example: ".stamina\n.stamina rest",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

const MAX_STAMINA = 100;
const REST_COOLDOWN = 10 * 60 * 1000; // 10 min
const REGEN_INTERVAL = 5 * 60 * 1000; // 1 per 5 min
const BUY_COST = 100; // per 10 stamina

function bar(val, max) {
  const pct = Math.floor((val / max) * 10);
  return "█".repeat(pct) + "░".repeat(10 - pct);
}

async function getData(db, sender) {
  let data = await db.getPlayerData?.(sender, "stamina") || { stamina: MAX_STAMINA, lastRegen: Date.now(), lastRest: 0, totalBought: 0 };
  // Apply passive regen
  const now = Date.now();
  const regenTicks = Math.floor((now - (data.lastRegen || now)) / REGEN_INTERVAL);
  if (regenTicks > 0) {
    data.stamina = Math.min(MAX_STAMINA, (data.stamina || 0) + regenTicks);
    data.lastRegen = now;
    await db.setPlayerData?.(sender, "stamina", data);
  }
  return data;
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getData(db, m.sender);

    if (subCmd === "rest" || subCmd === "istirahat") {
      const now = Date.now();
      if (now - (data.lastRest || 0) < REST_COOLDOWN) {
        const remaining = Math.ceil((REST_COOLDOWN - (now - (data.lastRest || 0))) / 60000);
        return m.reply(novaRpgBox("staminabar", `Baru saja istirahat! Tunggu ${remaining} menit lagi.`, "error"));
      }

      const restored = 30;
      data.stamina = Math.min(MAX_STAMINA, data.stamina + restored);
      data.lastRest = now;
      await db.setPlayerData?.(m.sender, "stamina", data);
      await m.react("🐣");
  await animGeneric(m, sock, "⚡", "Checking Stamina");
      // FIX OWNER 2026-09-07: bar dikasih jarak dari kalimat
      return m.reply(novaRpgBox("staminabar", `🛌 Istirahat berhasil! +${restored} stamina\n\n[${bar(data.stamina, MAX_STAMINA)}] ${data.stamina}/${MAX_STAMINA}`));
    }

    if (subCmd === "buy" || subCmd === "beli") {
      const qty = parseInt(m.args[1] || "10");
      const cost = Math.ceil(qty / 10) * BUY_COST;
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < cost) {
          await m.react("❌");
          return m.reply(novaRpgBox("staminabar", `Gold kurang! ${qty} stamina = ${cost}g`, "error"));
        }
        await db.minGold?.(m.sender, cost);
      } catch {}

      data.stamina = Math.min(MAX_STAMINA, data.stamina + qty);
      data.totalBought = (data.totalBought || 0) + qty;
      await db.setPlayerData?.(m.sender, "stamina", data);
      await m.react("🐣");
      // FIX OWNER 2026-09-07: bar dikasih jarak dari kalimat
      return m.reply(novaRpgBox("staminabar", `⚡ Beli ${qty} stamina (${cost}g)\n\n[${bar(data.stamina, MAX_STAMINA)}] ${data.stamina}/${MAX_STAMINA}`));
    }

    // STATUS (default)
    let msg = "";
    msg += `⚡ [${bar(data.stamina || 0, MAX_STAMINA)}] ${data.stamina || 0}/${MAX_STAMINA}\n`;
    msg += `
`;
    msg += `Regenerasi: +1 per 5 menit (passive)\n`;
    msg += `Total dibeli: *${data.totalBought || 0}*\n`;
    msg += `
`;
    msg += `${m.prefix}stamina rest - istirahat (+30, 10m CD)\n`;
    msg += `${m.prefix}stamina buy <qty> - beli (${BUY_COST}g/10)\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("staminabar error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("staminabar", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
