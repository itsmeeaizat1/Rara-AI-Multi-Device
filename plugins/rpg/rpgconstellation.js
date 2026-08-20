// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Constellation — Sistem zodiak/bintang, buff berdasarkan rasi bintang
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgconstellation",
  alias: ["constellationrpg", "rasi", "zodiakrpg", "rpgzodiak", "rpgbintang"],
  category: "rpg",
  description: "RPG Constellation — Sistem rasi bintang untuk buff harian",
  usage: ".rpgconstellation — Lihat rasi bintang kamu\n.rpgconstellation align — Bersekutu dengan rasi (pilih)\n.rpgconstellation daily — Buff harian dari rasi\n.rpgconstellation list — Daftar semua rasi",
  example: ".rpgconstellation align\n.rpgconstellation daily",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const DAILY_COOLDOWN = 20 * 60 * 60 * 1000;

const CONSTELLATIONS = [
  { id: "aries", name: "Aries", emoji: "♈", dateRange: "21 Mar - 19 Apr", goldBonus: 0.15, expBonus: 0.05, special: "Bertambah 5% chance menang game", desc: "Berani & energik" },
  { id: "taurus", name: "Taurus", emoji: "♉", dateRange: "20 Apr - 20 Mei", goldBonus: 0.1, expBonus: 0.1, special: "Income pasif +5%", desc: "Tabah & ulet" },
  { id: "gemini", name: "Gemini", emoji: "♊", dateRange: "21 Mei - 20 Jun", goldBonus: 0.05, expBonus: 0.15, special: "Exp hunt +10%", desc: "Cepat & adaptif" },
  { id: "cancer", name: "Cancer", emoji: "♋", dateRange: "21 Jun - 22 Jul", goldBonus: 0.1, expBonus: 0.1, special: "HP recovery +20%", desc: "Penuh perhatian" },
  { id: "leo", name: "Leo", emoji: "♌", dateRange: "23 Jul - 22 Agu", goldBonus: 0.2, expBonus: 0.05, special: "Gold game +10%", desc: "Berkuasa & berani" },
  { id: "virgo", name: "Virgo", emoji: "♍", dateRange: "23 Agu - 22 Sep", goldBonus: 0.05, expBonus: 0.2, special: "Exp semua aksi +10%", desc: "Teliti & analitis" },
  { id: "libra", name: "Libra", emoji: "♎", dateRange: "23 Sep - 22 Okt", goldBonus: 0.12, expBonus: 0.12, special: "Balance: luck +5%", desc: "Seimbang & adil" },
  { id: "scorpio", name: "Scorpio", emoji: "♏", dateRange: "23 Okt - 21 Nov", goldBonus: 0.05, expBonus: 0.05, special: "Crit chance +15% hunt", desc: "Intens & misterius" },
  { id: "sagittarius", name: "Sagittarius", emoji: "♐", dateRange: "22 Nov - 21 Des", goldBonus: 0.15, expBonus: 0.15, special: "Stamina +10 max", desc: "Petualang & bebas" },
  { id: "capricorn", name: "Capricorn", emoji: "♑", dateRange: "22 Des - 19 Jan", goldBonus: 0.1, expBonus: 0.1, special: "Income bisnis +10%", desc: "Ambisius & disiplin" },
  { id: "aquarius", name: "Aquarius", emoji: "♒", dateRange: "20 Jan - 18 Feb", goldBonus: 0.08, expBonus: 0.18, special: "Exp bonus +12%", desc: "Inovatif & unik" },
  { id: "pisces", name: "Pisces", emoji: "♓", dateRange: "19 Feb - 20 Mar", goldBonus: 0.1, expBonus: 0.1, special: "Lucky draw +10%", desc: "Imajinatif & intuitif" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Constellation", [
        "SISTEM RASI BINTANG",
        "Bersekutu dengan rasi untuk buff harian",
        "12 rasi bintang, masing-masing punya bonus unik",
        "",
        "PERINTAH:",
        usedPrefix + "rpgconstellation - Lihat rasi kamu",
        usedPrefix + "rpgconstellation align - Pilih rasi",
        usedPrefix + "rpgconstellation daily - Buff harian (20 jam cooldown)",
        usedPrefix + "rpgconstellation list - Daftar semua rasi",
      ], "info"));
    }

    if (action === "list") {
      const lines = ["DAFTAR RASI BINTANG", ""];
      CONSTELLATIONS.forEach(c => {
        const aligned = player.constellation === c.id ? " [AKTIF]" : "";
        lines.push(c.emoji + " " + c.name + " (" + c.dateRange + ")" + aligned);
        lines.push("  " + c.desc + " | " + c.special);
      });
      return m.reply(claraWrap("RPG Constellation", lines, "info"));
    }

    if (action === "align") {
      if (args[1]) {
        const constId = args[1].toLowerCase();
        const constellation = CONSTELLATIONS.find(c => c.id === constId);

        if (!constellation) {
          return m.reply(claraWrap("RPG Constellation", "Rasi tidak ditemukan. Lihat: " + usedPrefix + "rpgconstellation list", "warn"));
        }

        player.constellation = constId;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Constellation", [
          "Bersekutu dengan rasi!",
          constellation.emoji + " " + constellation.name,
          constellation.desc,
          "",
          "Bonus: Gold +" + (constellation.goldBonus * 100) + "% | Exp +" + (constellation.expBonus * 100) + "%",
          "Special: " + constellation.special,
          "",
          "Buff harian: " + usedPrefix + "rpgconstellation daily",
        ], "info"));
      }

      // Show alignment options
      return m.reply(claraWrap("RPG Constellation", [
        "PILIH RASI BINTANG",
        "Setiap rasi punya bonus berbeda",
        "",
        "Pilih: " + usedPrefix + "rpgconstellation align <rasi>",
        "",
        CONSTELLATIONS.map(c => c.emoji + " " + c.id).join(" | "),
      ], "info"));
    }

    if (action === "daily") {
      if (!player.constellation) {
        return m.reply(claraWrap("RPG Constellation", [
          "Belum bersekutu dengan rasi!",
          "Pilih: " + usedPrefix + "rpgconstellation align <rasi>",
        ], "warn"));
      }

      if (player.lastConstellationDaily && Date.now() - player.lastConstellationDaily < DAILY_COOLDOWN) {
        const remaining = Math.round((DAILY_COOLDOWN - (Date.now() - player.lastConstellationDaily)) / 3600000);
        return m.reply(claraWrap("RPG Constellation", "Buff harian " + remaining + " jam lagi", "warn"));
      }

      const constellation = CONSTELLATIONS.find(c => c.id === player.constellation);
      const goldReward = 500 + Math.floor(Math.random() * 2000) * (1 + constellation.goldBonus);
      const expReward = 200 + Math.floor(Math.random() * 500) * (1 + constellation.expBonus);

      addGold(m, Math.round(goldReward));
      addExp(m, Math.round(expReward));
      player.lastConstellationDaily = Date.now();

      // Apply temporary constellation buff
      player.constellationBuff = {
        name: constellation.name,
        emoji: constellation.emoji,
        goldBonus: constellation.goldBonus,
        expBonus: constellation.expBonus,
        expires: Date.now() + 4 * 3600 * 1000, // 4 hours
      };

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Constellation", [
        "BUFF HARIAN DITERIMA!",
        constellation.emoji + " " + constellation.name,
        "",
        "Gold: +" + Math.round(goldReward),
        "Exp: +" + Math.round(expReward),
        "",
        "Buff aktif 4 jam:",
        "Gold +" + (constellation.goldBonus * 100) + "% | Exp +" + (constellation.expBonus * 100) + "%",
        "Special: " + constellation.special,
      ], "info"));
    }

    // Default: show player's constellation
    if (!player.constellation) {
      return m.reply(claraWrap("RPG Constellation", [
        "Belum bersekutu dengan rasi!",
        "Pilih: " + usedPrefix + "rpgconstellation align <rasi>",
        "Daftar: " + usedPrefix + "rpgconstellation list",
      ], "warn"));
    }

    const constellation = CONSTELLATIONS.find(c => c.id === player.constellation);
    const buff = player.constellationBuff;
    const canDaily = !player.lastConstellationDaily || Date.now() - player.lastConstellationDaily >= DAILY_COOLDOWN;

    const lines = [
      "RASI BINTANG KAMU",
      constellation.emoji + " " + constellation.name + " (" + constellation.dateRange + ")",
      constellation.desc,
      "",
      "Bonus pasif: Gold +" + (constellation.goldBonus * 100) + "% | Exp +" + (constellation.expBonus * 100) + "%",
      "Special: " + constellation.special,
    ];

    if (buff && buff.expires > Date.now()) {
      const remaining = Math.round((buff.expires - Date.now()) / 60000);
      lines.push("");
      lines.push("Buff harian aktif: " + remaining + " menit lagi");
    }

    lines.push("");
    lines.push(canDaily ? "Buff harian tersedia! " + usedPrefix + "rpgconstellation daily" : "Buff harian cooldown");

    return m.reply(claraWrap("RPG Constellation", lines, "info"));
  } catch (e) {
    console.error("[RpgConstellation]", e);
    return m.reply(claraWrap("RPG Constellation", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
