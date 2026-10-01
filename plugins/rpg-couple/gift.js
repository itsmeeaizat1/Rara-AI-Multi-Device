// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Kado: kasih item dari inventory ke pasangan, dapat affection (revival dari RPG lama, disesuaikan sistem baru)

import { ensureRpg, getRpgData, addItem, removeItem, addExp, ITEM_DB } from "../../src/lib/rara-rpg-service.js";
import { raraGameBox, gameCTA, renderStatBar, raraRpgBox } from "../../src/lib/rara-games.js";
import { getCintaData, addAffection } from "../../src/lib/rara-rpg-cinta.js";

const pluginConfig = {
  name: "kado",
  alias: ["kado", "kadopasangan", "kadocinta"],
  category: "rpg couple",
  description: "Kasih kado (item dari inventory) ke pasangan, dapat affection",
  usage: ".kado <nama item>",
  example: ".kado ramuan",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Affection bonus berdasarkan rarity item
const RARITY_VALUE = {
  common: 10,
  uncommon: 15,
  rare: 25,
  epic: 40,
  legendary: 60,
};

function findItemId(query) {
  const q = (query || "").toLowerCase().replace(/\s+/g, "");
  // match itemId langsung (mpPotion → mppotion) atau nama item (Ramuan MP → ramuanmp)
  for (const [id, def] of Object.entries(ITEM_DB)) {
    if (id.toLowerCase() === q || def.name.toLowerCase().replace(/\s+/g, "") === q) return id;
  }
  return null;
}

async function handler(m) {
  try {
    await m.react("🕒");
    ensureRpg(m, m.pushName || "Player");
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);
    const args = (m.body || "").replace(/^[!.#]\S+\s*/, "").trim();

    // Harus punya pasangan
    if (!cinta.spouse) {
      await m.react("❗");
      return m.reply(raraRpgBox("Kado", [
        "Kasih kado ke siapa? Ke bot? 😅",
        "Kamu belum punya pasangan!",
      ], "error"));
    }

    const partnerJid = cinta.spouse;
    const partnerName = cinta.spouseName || partnerJid.split("@")[0];

    // Tanpa argumen → tampilkan item consumable/craft yang bisa dikado
    if (!args) {
      const inv = rpg.inventory || {};
      const lines = [
        `Pasangan: ${partnerName}`,
        `Affection: ${cinta.affection || 0}`,
        "---",
        { sub: "Item Bisa Dikado" },
      ];
      const items = Object.entries(inv).filter(([, v]) => (v.qty || 0) > 0);
      if (!items.length) {
        lines.push("Inventory kosong! Dapatkan item lewat .berburu, .nambalban, atau beli di .farmrpg");
      } else {
        items.slice(0, 20).forEach(([id, v]) => {
          const def = ITEM_DB[id] || {};
          const bonus = RARITY_VALUE[v.rarity || def.rarity || "common"] || 10;
          lines.push(`• ${def.name || id} x${v.qty} → +${bonus} affection`);
        });
      }
      lines.push("---", `Ketik: ${m.prefix}kado <nama item>`);
      await m.react("🐣");
      return m.reply(raraRpgBox("Kado", lines));
    }

    // Cari item di inventory
    const itemId = findItemId(args);
    const slot = itemId ? (rpg.inventory || {})[itemId] : null;

    if (!itemId || !slot || (slot.qty || 0) <= 0) {
      await m.react("❗");
      return m.reply(raraRpgBox("Kado", [
        `Item *${args}* tidak ada di inventory kamu!`,
        `Cek inventory: ${m.prefix}kado (tanpa argumen)`,
      ], "error"));
    }

    // Pindahkan item
    removeItem(m, itemId, 1);
    addItem({ sender: partnerJid, pushName: partnerName }, itemId, 1);

    // Affection bonus berdua
    const rarity = slot.rarity || ITEM_DB[itemId].rarity || "common";
    const baseValue = RARITY_VALUE[rarity] || 10;
    const affectionGain = baseValue + Math.floor(Math.random() * 6);
    addAffection(m, affectionGain);
    addAffection({ sender: partnerJid, pushName: partnerName }, affectionGain);

    // Catat statistik kado
    const myCinta = getCintaData(m);
    myCinta.giftCount = (myCinta.giftCount || 0) + 1;

    const msg = raraGameBox({
      title: "rpg cinta", icon: "🎁",
      flavor: `🎁 *${(ITEM_DB[itemId]?.name || itemId).toUpperCase()} UNTUK ${partnerName.toUpperCase()}!*`,
      body: [
        `│ • 🎁 Kado : ${ITEM_DB[itemId]?.name || itemId} (${rarity})`,
        `│ • 💞 Affection : +${affectionGain} berdua`,
        `│    ${renderStatBar(myCinta.affection || 0, 500)} (Total: ${myCinta.affection || 0})`,
        `│ • 🎀 Total Kado : ${myCinta.giftCount}`,
        `│ • ✨ EXP : +2`,
      ].join("\n"),
      cta: gameCTA("kado"),
    });

    // EXP kecil sebagai apresiasi
    addExp(m, 2);

    await m.reply(msg);
    await m.react("🎁");
  } catch (e) {
    console.error("[kado] Error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("Kado", "Yah gagal kak, coba lagi 😩", "error"));
  }
}

export { pluginConfig as config, handler };
