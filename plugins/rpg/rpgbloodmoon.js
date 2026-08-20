// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Blood Moon — Event langka blood moon, boost semua aksi sementara
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgbloodmoon",
  alias: ["bloodmoonrpg", "bulanmerah", "bloodmoon", "merahbulan", "bulandarah"],
  category: "rpg",
  description: "RPG Blood Moon — Event langka, boost 2x semua reward selama durasi",
  usage: ".rpgbloodmoon invoke — Panggil blood moon (biaya besar, min Lv 15)\n.rpgbloodmoon info — Cek status\n.rpgbloodmoon ritual — Ritual gratis (5% chance muncul blood moon)",
  example: ".rpgbloodmoon invoke\n.rpgbloodmoon ritual",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 60,
  energi: 20,
  isEnabled: true,
};

const INVOKE_COST = 20000;
const MIN_LEVEL = 15;
const RITUAL_STAMINA = 30;
const RITUAL_CHANCE = 0.05; // 5%
const BLOOD_MOON_DURATION = 10 * 60 * 1000; // 10 minutes
const NATURAL_CHANCE = 0.02; // 2% chance on check
const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Blood Moon", [
        "BLOOD MOON EVENT",
        "Event langka! 2x semua gold & exp selama 10 menit",
        "",
        "PERINTAH:",
        usedPrefix + "rpgbloodmoon invoke - Panggil (" + INVOKE_COST + "g, min Lv " + MIN_LEVEL + ")",
        usedPrefix + "rpgbloodmoon ritual - Ritual gratis (5% chance, -30 stamina)",
        usedPrefix + "rpgbloodmoon info - Cek status",
        "",
        "Blood Moon bisa muncul natural (2% chance saat cek)",
        "Cooldown: 3 jam setelah selesai",
      ], "info"));
    }

    if (action === "info") {
      const buff = player.bloodMoonActive;
      const lines = ["STATUS BLOOD MOON", ""];

      if (buff && buff.expires > Date.now()) {
        const remaining = Math.round((buff.expires - Date.now()) / 60000);
        lines.push("BLOOD MOON AKTIF!");
        lines.push("Durasi: " + remaining + " menit lagi");
        lines.push("Bonus: 2x gold & exp semua aksi");
      } else {
        const lastEnd = player.bloodMoonEnd || 0;
        const cooldown = lastEnd + COOLDOWN_MS;
        if (Date.now() < cooldown) {
          const cd = Math.round((cooldown - Date.now()) / 60000);
          lines.push("Cooldown: " + cd + " menit");
        } else {
          lines.push("Tersedia!");
          lines.push("Invoke: " + usedPrefix + "rpgbloodmoon invoke");
          lines.push("Ritual: " + usedPrefix + "rpgbloodmoon ritual");
        }
      }

      const stats = player.bloodMoonStats || {};
      lines.push("");
      lines.push("Statistik:");
      lines.push("Total blood moon: " + (stats.total || 0));
      lines.push("Invoke: " + (stats.invoked || 0));
      lines.push("Ritual: " + (stats.ritualed || 0));
      lines.push("Natural: " + (stats.natural || 0));

      return m.reply(claraWrap("RPG Blood Moon", lines, "info"));
    }

    if (action === "invoke") {
      if ((player.level || 0) < MIN_LEVEL) {
        return m.reply(claraWrap("RPG Blood Moon", "Level belum cukup! Butuh: " + MIN_LEVEL, "warn"));
      }

      if ((player.gold || 0) < INVOKE_COST) {
        return m.reply(claraWrap("RPG Blood Moon", "Gold kurang! Butuh: " + INVOKE_COST, "warn"));
      }

      const lastEnd = player.bloodMoonEnd || 0;
      if (Date.now() < lastEnd + COOLDOWN_MS) {
        const cd = Math.round((lastEnd + COOLDOWN_MS - Date.now()) / 60000);
        return m.reply(claraWrap("RPG Blood Moon", "Cooldown: " + cd + " menit lagi", "warn"));
      }

      addGold(m, -INVOKE_COST);
      return activateBloodMoon(m, player, "invoke", usedPrefix);
    }

    if (action === "ritual") {
      if ((player.stamina || 100) < RITUAL_STAMINA) {
        return m.reply(claraWrap("RPG Blood Moon", "Stamina kurang! Butuh: " + RITUAL_STAMINA, "warn"));
      }

      const lastEnd = player.bloodMoonEnd || 0;
      if (Date.now() < lastEnd + COOLDOWN_MS) {
        const cd = Math.round((lastEnd + COOLDOWN_MS - Date.now()) / 60000);
        return m.reply(claraWrap("RPG Blood Moon", "Cooldown: " + cd + " menit lagi", "warn"));
      }

      player.stamina = Math.max(0, (player.stamina || 100) - RITUAL_STAMINA);

      // 5% chance
      if (Math.random() < RITUAL_CHANCE) {
        addExp(m, 100);
        return activateBloodMoon(m, player, "ritual", usedPrefix);
      } else {
        addExp(m, 50);
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Blood Moon", [
          "Ritual gagal! Bulan tetap normal.",
          "Stamina: -" + RITUAL_STAMINA,
          "Exp consolation: +50",
          "",
          "Coba lagi nanti!",
        ], "warn"));
      }
    }

    return m.reply(claraWrap("RPG Blood Moon", "Perintah: invoke, ritual, info", "warn"));
  } catch (e) {
    console.error("[RpgBloodMoon]", e);
    return m.reply(claraWrap("RPG Blood Moon", "Error: " + e.message, "error"));
  }
}

function activateBloodMoon(m, player, source, usedPrefix) {
  const now = Date.now();
  player.bloodMoonActive = {
    expires: now + BLOOD_MOON_DURATION,
    source,
  };
  player.bloodMoonEnd = now + BLOOD_MOON_DURATION;

  if (!player.bloodMoonStats) player.bloodMoonStats = {};
  player.bloodMoonStats.total = (player.bloodMoonStats.total || 0) + 1;
  if (source === "invoke") player.bloodMoonStats.invoked = (player.bloodMoonStats.invoked || 0) + 1;
  if (source === "ritual") player.bloodMoonStats.ritualed = (player.bloodMoonStats.ritualed || 0) + 1;
  if (source === "natural") player.bloodMoonStats.natural = (player.bloodMoonStats.natural || 0) + 1;

  savePlayer(m, player);

  const sourceText = source === "invoke" ? "DIPANGGIL (" + INVOKE_COST + "g)" : source === "ritual" ? "RITUAL BERHASIL!" : "BLOOD MOON ALAMI!";

  return m.reply(claraWrap("RPG Blood Moon", [
    "BLOOD MOON " + sourceText,
    "🌙🔴 BULAN MERAH MUNCUL! 🔴🌙",
    "",
    "DURASI: 10 MENIT",
    "BONUS: 2x gold & exp semua aksi RPG",
    "",
    "Manfaatkan sekarang!",
    "Cooldown berikutnya: 3 jam",
  ], "info"));
}

export { pluginConfig as config, handler };
