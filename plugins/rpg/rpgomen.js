// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Omen — Baca pertanda, prediksi luck untuk sesi berikutnya
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgomen",
  alias: ["omenrpg", "pertanda", "ramalanrpg", "pembacaomen", "omensign"],
  category: "rpg",
  description: "RPG Omen — Baca pertanda, prediksi & luck modifier untuk aksi berikutnya",
  usage: ".rpgomen read — Baca pertanda (gratis 1x/12jam)\n.rpgomen interpret <pilih> — Interpretasi tanda\n.rpgomen info — Statistik & omen aktif",
  example: ".rpgomen read\n.rpgomen interpret 2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

const READ_COOLDOWN = 12 * 60 * 60 * 1000;

const OMENS = [
  { id: "falcon", name: "Elang Terbang", emoji: "🦅", meaning: "Kesempatan besar menanti", luck: 1.5, type: "positive" },
  { id: "blackcat", name: "Kucing Hitam", emoji: "🐈‍⬛", meaning: "Hati-hati, sial mengintai", luck: 0.5, type: "negative" },
  { id: "rainbow", name: "Pelangi", emoji: "🌈", meaning: "Keberuntungan luar biasa", luck: 2.0, type: "great" },
  { id: "crow", name: "Gagak Berkicau", emoji: "🐦‍⬛", meaning: "Pesan dari alam gaib", luck: 1.2, type: "neutral" },
  { id: "fallingstar", name: "Bintang Jatuh", emoji: "🌠", meaning: "Impian akan terkabul", luck: 1.8, type: "great" },
  { id: "snake", name: "Ular Melingkar", emoji: "🐍", meaning: "Transformasi & perubahan", luck: 1.3, type: "positive" },
  { id: "brokenmirror", name: "Cermin Pecah", emoji: "🪞", meaning: "Kutukan 7 hari", luck: 0.3, type: "negative" },
  { id: "whitelotus", name: "Teratai Putih", emoji: "🪷", meaning: "Kesucian & berkah", luck: 1.6, type: "positive" },
  { id: "lightning", name: "Petir menyambar", emoji: "⚡", meaning: "Kekuatan tiba-tiba", luck: 1.4, type: "positive" },
  { id: "owl", name: "Burung Hantu", emoji: "🦉", meaning: "Kebijaksanaan datang", luck: 1.5, type: "positive" },
  { id: "deadtree", name: "Pohon Mati", emoji: "🌳", meaning: "Akhir dari sesuatu", luck: 0.7, type: "negative" },
  { id: "goldeneagle", name: "Elang Emas", emoji: "🦅", meaning: "LEGENDARIS: Rejeki besar", luck: 3.0, type: "legendary" },
];

const INTERPRETATIONS = [
  { id: 1, name: "Terima pertanda", desc: "Ikuti nasib alam" },
  { id: 2, name: "Menolak pertanda", desc: "Lawan nasib, butuh biaya" },
  { id: 3, name: "Simpan untuk nanti", desc: "Aktifkan di sesi berikutnya" },
];

const REJECT_COST = 2000;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Omen", [
        "PEMBACA PERTANDA",
        "Baca tanda alam untuk prediksi luck",
        "Luck modifier mempengaruhi aksi RPG berikutnya",
        "",
        "PERINTAH:",
        usedPrefix + "rpgomen read - Baca pertanda (1x/12jam)",
        usedPrefix + "rpgomen interpret <1-3> - Interpretasi",
        usedPrefix + "rpgomen info - Statistik & omen aktif",
        "",
        "Tanda:",
        "Positive: luck 1.2-1.6x (meningkatkan gold/exp)",
        "Negative: luck 0.3-0.7x (menurunkan gold/exp)",
        "Great: luck 1.8-2.0x (bonus besar)",
        "Legendary: luck 3.0x (sangat langka!)",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.omenStats || {};
      const omen = player.activeOmen;

      const lines = [
        "STATISTIK OMEN",
        "Total baca: " + (stats.reads || 0),
        "Positive: " + (stats.positive || 0),
        "Negative: " + (stats.negative || 0),
        "Great: " + (stats.great || 0),
        "Legendary: " + (stats.legendary || 0) + " RARE",
      ];

      if (omen) {
        const omenData = OMENS.find(o => o.id === omen.id);
        if (omenData) {
          lines.push("");
          lines.push("OMEN AKTIF:");
          lines.push(omenData.emoji + " " + omenData.name);
          lines.push("Luck: " + omenData.luck + "x | " + omenData.meaning);
          if (omen.used) lines.push("Sudah digunakan!");
        }
      } else {
        lines.push("");
        lines.push("Omen: Tidak ada");
      }

      const canRead = !player.lastOmenRead || Date.now() - player.lastOmenRead >= READ_COOLDOWN;
      lines.push("");
      lines.push(canRead ? "Baca tersedia! " + usedPrefix + "rpgomen read" : "Baca cooldown");

      return m.reply(claraWrap("RPG Omen", lines, "info"));
    }

    if (action === "read") {
      if (player.lastOmenRead && Date.now() - player.lastOmenRead < READ_COOLDOWN) {
        const remaining = Math.round((READ_COOLDOWN - (Date.now() - player.lastOmenRead)) / 3600000);
        return m.reply(claraWrap("RPG Omen", "Baca pertanda " + remaining + " jam lagi", "warn"));
      }

      // Roll omen (legendary 3% chance)
      const roll = Math.random();
      let omen;
      if (roll < 0.03) {
        omen = OMENS.find(o => o.type === "legendary");
      } else {
        const pool = OMENS.filter(o => o.type !== "legendary");
        omen = pool[Math.floor(Math.random() * pool.length)];
      }

      player.lastOmenRead = Date.now();
      player.activeOmen = { id: omen.id, used: false };

      if (!player.omenStats) player.omenStats = {};
      player.omenStats.reads = (player.omenStats.reads || 0) + 1;
      player.omenStats[omen.type] = (player.omenStats[omen.type] || 0) + 1;

      savePlayer(m, player);

      const lines = [
        "PERTANDA TERBACA!",
        omen.emoji + " " + omen.name,
        "",
        "Arti: " + omen.meaning,
        "Luck modifier: " + omen.luck + "x",
        "Tipe: " + omen.type.toUpperCase(),
        "",
        "INTERPRETASI:",
        "1. Terima - Aktifkan sekarang",
        "2. Tolak - Lawan nasib (" + REJECT_COST + "g)",
        "3. Simpan - Untuk sesi berikutnya",
        "",
        usedPrefix + "rpgomen interpret <1-3>",
      ];

      if (omen.type === "legendary") {
        lines.push("");
        lines.push("LEGENDARY OMEN! 👑");
      }

      return m.reply(claraWrap("RPG Omen", lines, omen.type === "negative" ? "warn" : "info"));
    }

    if (action === "interpret") {
      if (!player.activeOmen) {
        return m.reply(claraWrap("RPG Omen", "Tidak ada omen aktif. Baca: " + usedPrefix + "rpgomen read", "warn"));
      }
      if (player.activeOmen.used) {
        return m.reply(claraWrap("RPG Omen", "Omen sudah digunakan!", "warn"));
      }

      const choice = parseInt(args[1]);
      const omen = OMENS.find(o => o.id === player.activeOmen.id);

      if (choice === 1) {
        // Accept
        player.activeOmen.used = true;
        player.activeOmen.luck = omen.luck;

        // Apply immediate effect
        if (omen.luck >= 1) {
          const goldBonus = Math.round(500 * omen.luck);
          const expBonus = Math.round(200 * omen.luck);
          addGold(m, goldBonus);
          addExp(m, expBonus);
          savePlayer(m, player);
          return m.reply(claraWrap("RPG Omen", [
            "PERTANDA DITERIMA!",
            omen.emoji + " " + omen.name,
            "Luck: " + omen.luck + "x aktif untuk aksi berikutnya",
            "",
            "Gold: +" + goldBonus + " | Exp: +" + expBonus,
          ], "info"));
        } else {
          savePlayer(m, player);
          return m.reply(claraWrap("RPG Omen", [
            "PERTANDA DITERIMA...",
            omen.emoji + " " + omen.name,
            "Luck: " + omen.luck + "x aktif (sial!)",
            "Hati-hati di aksi berikutnya!",
          ], "warn"));
        }
      }

      if (choice === 2) {
        // Reject
        if ((player.gold || 0) < REJECT_COST) {
          return m.reply(claraWrap("RPG Omen", "Gold kurang untuk menolak! Butuh: " + REJECT_COST, "warn"));
        }

        addGold(m, -REJECT_COST);
        player.activeOmen.used = true;
        // Cancel negative luck or boost positive
        player.activeOmen.luck = 1.0;
        savePlayer(m, player);

        return m.reply(claraWrap("RPG Omen", [
          "PERTANDA DITOLAK!",
          omen.emoji + " " + omen.name + " ditolak",
          "Luck direset ke 1.0x (netral)",
          "Biaya: " + REJECT_COST + " gold",
        ], "info"));
      }

      if (choice === 3) {
        // Save for later
        player.activeOmen.saved = true;
        savePlayer(m, player);
        return m.reply(claraWrap("RPG Omen", [
          "OMEN DISIMPAN!",
          omen.emoji + " " + omen.name,
          "Akan aktif otomatis di aksi RPG berikutnya",
        ], "info"));
      }

      return m.reply(claraWrap("RPG Omen", "Pilih 1-3", "warn"));
    }

    return m.reply(claraWrap("RPG Omen", "Perintah: read, interpret, info", "warn"));
  } catch (e) {
    console.error("[RpgOmen]", e);
    return m.reply(claraWrap("RPG Omen", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
