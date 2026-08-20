// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Aura — Sistem aura personal, warna berbeda = buff berbeda
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgaura",
  alias: ["aurarpg", "aurapersonal", "warnaaura", "rpgelektrik", "auraenergy"],
  category: "rpg",
  description: "RPG Aura — Sistem aura personal, kumpulkan energi untuk unlock warna aura",
  usage: ".rpgaura — Lihat aura kamu\n.rpgaura charge — Isi energi aura (gold untuk energy)\n.rpgaura activate <warna> — Aktifkan warna aura\n.rpgaura list — Daftar semua aura\n.rpgaura info — Statistik",
  example: ".rpgaura charge\n.rpgaura activate crimson",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CHARGE_COST = 1000; // gold per charge
const MAX_ENERGY = 100;

const AURAS = [
  { id: "white", name: "Aura Putih", emoji: "⚪", unlockCost: 0, goldBonus: 0, expBonus: 0.05, desc: "Aura dasar, +5% exp" },
  { id: "crimson", name: "Aura Merah", emoji: "🔴", unlockCost: 20, goldBonus: 0.15, expBonus: 0, desc: "+15% gold, aura pejuang" },
  { id: "azure", name: "Aura Biru", emoji: "🔵", unlockCost: 30, goldBonus: 0, expBonus: 0.20, desc: "+20% exp, aura bijaksana" },
  { id: "emerald", name: "Aura Hijau", emoji: "🟢", unlockCost: 40, goldBonus: 0.10, expBonus: 0.10, desc: "+10% gold & exp, seimbang" },
  { id: "golden", name: "Aura Emas", emoji: "🟡", unlockCost: 60, goldBonus: 0.25, expBonus: 0.15, desc: "+25% gold & +15% exp, premium" },
  { id: "violet", name: "Aura Ungu", emoji: "🟣", unlockCost: 80, goldBonus: 0.20, expBonus: 0.25, desc: "+20% gold & +25% exp, elite" },
  { id: "void", name: "Aura Void", emoji: "🌌", unlockCost: 100, goldBonus: 0.35, expBonus: 0.35, desc: "+35% semua, LEGENDARY" },
  { id: "celestial", name: "Aura Surgawi", emoji: "✨", unlockCost: 150, goldBonus: 0.50, expBonus: 0.50, desc: "+50% semua, MYTHICAL" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    const currentAura = player.activeAura || "white";
    const auraData = AURAS.find(a => a.id === currentAura);
    const energy = player.auraEnergy || 0;
    const unlocked = player.auraUnlocked || ["white"];

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Aura", [
        "SISTEM AURA PERSONAL",
        "Isi energi, unlock warna aura untuk bonus",
        "Charge: " + CHARGE_COST + "g = 10 energy (max " + MAX_ENERGY + ")",
        "",
        "AURA:",
        "⚪ Putih (default) +5% exp",
        "🔴 Merah 20E +15% gold",
        "🔵 Biru 30E +20% exp",
        "🟢 Hijau 40E +10% gold & exp",
        "🟡 Emas 60E +25% gold & +15% exp",
        "🟣 Ungu 80E +20% gold & +25% exp",
        "🌌 Void 100E +35% semua LEGENDARY",
        "✨ Surgawi 150E +50% semua MYTHICAL",
        "",
        "PERINTAH:",
        usedPrefix + "rpgaura charge — Isi energi",
        usedPrefix + "rpgaura activate <warna>",
        usedPrefix + "rpgaura list — Daftar aura",
        usedPrefix + "rpgaura info — Statistik",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.auraStats || {};
      const lines = [
        "STATISTIK AURA",
        "Aura aktif: " + (auraData?.emoji || "⚪") + " " + (auraData?.name || "Putih"),
        "Energi: " + energy + "/" + MAX_ENERGY,
        "Unlocked: " + unlocked.length + "/" + AURAS.length,
        "Total charge: " + (stats.charges || 0),
        "Total gold terisi: " + (stats.totalGold || 0),
        "",
        "Bonus aktif: +" + ((auraData?.goldBonus || 0) * 100) + "% gold | +" + ((auraData?.expBonus || 0) * 100) + "% exp",
      ];
      return m.reply(claraWrap("RPG Aura", lines, "info"));
    }

    if (action === "list") {
      const lines = ["DAFTAR AURA", ""];
      AURAS.forEach(a => {
        const isUnlocked = unlocked.includes(a.id);
        const isActive = currentAura === a.id;
        const status = isActive ? " [AKTIF]" : isUnlocked ? " [UNLOCKED]" : " [" + a.unlockCost + "E]";
        lines.push(a.emoji + " " + a.name + status);
        lines.push("  " + a.desc);
      });
      return m.reply(claraWrap("RPG Aura", lines, "info"));
    }

    if (action === "charge") {
      if (energy >= MAX_ENERGY) {
        return m.reply(claraWrap("RPG Aura", "Energi penuh! (" + MAX_ENERGY + "/" + MAX_ENERGY + ")", "warn"));
      }

      if ((player.gold || 0) < CHARGE_COST) {
        return m.reply(claraWrap("RPG Aura", "Gold kurang! Butuh: " + CHARGE_COST, "warn"));
      }

      addGold(m, -CHARGE_COST);
      const gain = Math.min(10, MAX_ENERGY - energy);
      player.auraEnergy = energy + gain;

      if (!player.auraStats) player.auraStats = {};
      player.auraStats.charges = (player.auraStats.charges || 0) + 1;
      player.auraStats.totalGold = (player.auraStats.totalGold || 0) + CHARGE_COST;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aura", [
        "Energi terisi!",
        "Gold: -" + CHARGE_COST + " | Energi: +" + gain,
        "Total: " + player.auraEnergy + "/" + MAX_ENERGY,
      ], "info"));
    }

    if (action === "activate") {
      const auraId = args[1]?.toLowerCase();
      const aura = AURAS.find(a => a.id === auraId);

      if (!aura) return m.reply(claraWrap("RPG Aura", "Aura tidak ditemukan. Lihat: " + usedPrefix + "rpgaura list", "warn"));

      if (!unlocked.includes(aura.id)) {
        // Try to unlock
        if (energy < aura.unlockCost) {
          return m.reply(claraWrap("RPG Aura", [
            "Energi kurang untuk unlock!",
            "Butuh: " + aura.unlockCost + " | Punya: " + energy,
            "Isi: " + usedPrefix + "rpgaura charge",
          ], "warn"));
        }

        // Unlock
        player.auraEnergy = energy - aura.unlockCost;
        player.auraUnlocked = [...unlocked, aura.id];
      }

      player.activeAura = aura.id;
      savePlayer(m, player);

      return m.reply(claraWrap("RPG Aura", [
        "Aura diaktifkan!",
        aura.emoji + " " + aura.name,
        aura.desc,
        "",
        unlocked.includes(aura.id) ? "(Sudah unlock sebelumnya)" : "Unlocked! Biaya: " + aura.unlockCost + " energi",
        "Energi tersisa: " + (player.auraEnergy || 0) + "/" + MAX_ENERGY,
      ], "info"));
    }

    // Default: show current aura
    const lines = [
      "AURA KAMU",
      auraData?.emoji + " " + (auraData?.name || "Putih"),
      auraData?.desc || "",
      "",
      "Energi: " + energy + "/" + MAX_ENERGY,
      "Unlocked: " + unlocked.length + "/" + AURAS.length,
      "",
      "Bonus: +" + ((auraData?.goldBonus || 0) * 100) + "% gold | +" + ((auraData?.expBonus || 0) * 100) + "% exp",
    ];

    if (energy < MAX_ENERGY) {
      lines.push("");
      lines.push("Isi energi: " + usedPrefix + "rpgaura charge");
    }

    return m.reply(claraWrap("RPG Aura", lines, "info"));
  } catch (e) {
    console.error("[RpgAura]", e);
    return m.reply(claraWrap("RPG Aura", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
