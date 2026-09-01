// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// expedition.js — Expedition System (send party on timed missions)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "expedition",
  alias: ["expedition", "ekspedisi", "expeditions"],
  category: "rpg",
  description: "Sistem ekspedisi tim — kirim party dalam misi berdurasi untuk mendapatkan gold",
  usage: ".expedition (status/daftar lokasi)\n.expedition start <1-5>\n.expedition claim\n.expedition cancel",
  example: ".expedition start 1\n.expedition claim",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const LOCATIONS = [
  { id: 1, name: "Hutan Gelap", durationMs: 5 * 60 * 1000, durationStr: "5 menit", minGold: 200, maxGold: 500, emoji: "🌲" },
  { id: 2, name: "Pegunungan", durationMs: 15 * 60 * 1000, durationStr: "15 menit", minGold: 500, maxGold: 1500, emoji: "⛰️" },
  { id: 3, name: "Lautan", durationMs: 30 * 60 * 1000, durationStr: "30 menit", minGold: 1000, maxGold: 3000, emoji: "🌊" },
  { id: 4, name: "Padang Pasir", durationMs: 60 * 60 * 1000, durationStr: "1 jam", minGold: 2000, maxGold: 5000, emoji: "🏜️" },
  { id: 5, name: "Tanah Es", durationMs: 120 * 60 * 1000, durationStr: "2 jam", minGold: 5000, maxGold: 10000, emoji: "❄️" },
];

function formatTime(ms) {
  if (ms <= 0) return "0 detik";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const parts = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} detik`);
  return parts.join(" ");
}

async function handler(m, { sock }) {
  await m.react("🕒");
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const prefix = m.prefix || ".";
    const args = m.args || [];
    const subCmd = (args[0] || "").toLowerCase();

    let data = (await db.getPlayerData?.(sender, "expedition")) || {
      active: null,
      totalCompleted: 0,
      totalEarned: 0,
    };

    const now = Date.now();

    // Subcommand: CLAIM
    if (subCmd === "claim" || subCmd === "selesai") {
      if (!data.active) {
        await m.react("❌");
        return m.reply(
          claraWrap("expedition", `Kamu sedang tidak menjalankan ekspedisi apapun.\n\nGunakan *${prefix}expedition* untuk memilih lokasi ekspedisi.`, "error")
        );
      }

      const elapsed = now - data.active.startTime;
      if (elapsed < data.active.duration) {
        const remaining = data.active.duration - elapsed;
        await m.react("❌");
        return m.reply(
          claraWrap("expedition", `Ekspedisi di *${data.active.name}* belum selesai!\n\n⏳ Sisa Waktu (ETA): *${formatTime(remaining)}*`, "error")
        );
      }

      // Calculate reward
      const rewardGold = Math.floor(Math.random() * (data.active.maxGold - data.active.minGold + 1)) + data.active.minGold;
      
      data.totalCompleted = (data.totalCompleted || 0) + 1;
      data.totalEarned = (data.totalEarned || 0) + rewardGold;
      const completedLoc = data.active.name;
      data.active = null;

      await db.setPlayerData?.(sender, "expedition", data);
      try { await db.addGold?.(sender, rewardGold); } catch {}

      let text = "";
      text += `🎉 Party kamu telah kembali dari *${completedLoc}*!\n`;
      text += `
`;
      text += `💰 Reward Gold : +${rewardGold.toLocaleString()} Gold\n`;
      text += `📊 Total Ekspedisi : ${data.totalCompleted}x\n`;
      text += `🏆 Total Pendapatan : ${data.totalEarned.toLocaleString()} Gold\n`;
      
      await m.react("🐣");
      return m.reply(text);
    }

    // Subcommand: CANCEL
    if (subCmd === "cancel" || subCmd === "batal") {
      if (!data.active) {
        await m.react("❌");
        return m.reply(claraWrap("expedition", "Tidak ada ekspedisi aktif yang bisa dibatalkan.", "error"));
      }
      data.active = null;
      await db.setPlayerData?.(sender, "expedition", data);
      await m.react("🐣");
      return m.reply(claraWrap("expedition", "Ekspedisi berhasil dibatalkan.", "guide"));
    }

    // Subcommand: START
    if (subCmd === "start" || subCmd === "mulai") {
      if (data.active) {
        const elapsed = now - data.active.startTime;
        const remaining = Math.max(0, data.active.duration - elapsed);
        await m.react("❌");
        return m.reply(
          claraWrap(
            "expedition",
            `Kamu hanya bisa menjalankan 1 ekspedisi dalam satu waktu!\n\n📌 *Ekspedisi Aktif*: ${data.active.name}\n⏳ *Sisa Waktu*: ${formatTime(remaining)}\n\nKlaim hasil dengan *${prefix}expedition claim* jika sudah selesai.`,
            "error"
          )
        );
      }

      const locArg = args[1];
      let loc = null;
      if (locArg && !isNaN(locArg)) {
        const idx = parseInt(locArg);
        loc = LOCATIONS.find((l) => l.id === idx);
      } else if (locArg) {
        const search = args.slice(1).join(" ").toLowerCase();
        loc = LOCATIONS.find((l) => l.name.toLowerCase().includes(search));
      }

      if (!loc) {
        let errText = `Lokasi ekspedisi tidak ditemukan!\n\nPilih nomor 1-5:\n`;
        LOCATIONS.forEach((l) => {
          errText += `${l.id}. ${l.emoji} ${l.name} (${l.durationStr})\n`;
        });
        errText += `\nContoh: *${prefix}expedition start 1*`;
        await m.react("❌");
        return m.reply(claraWrap("expedition", errText, "error"));
      }

      data.active = {
        id: loc.id,
        name: loc.name,
        emoji: loc.emoji,
        startTime: now,
        duration: loc.durationMs,
        minGold: loc.minGold,
        maxGold: loc.maxGold,
      };

      await db.setPlayerData?.(sender, "expedition", data);

      let text = "";
      text += `${loc.emoji} Lokasi : *${loc.name}*\n`;
      text += `⏱️ Durasi : ${loc.durationStr}\n`;
      text += `💰 Est. Reward : ${loc.minGold} - ${loc.maxGold} Gold\n`;
      text += `🕒 Selesai pada ETA : ${formatTime(loc.durationMs)}\n`;
      text += `
`;
      text += `💡 Ketik *${prefix}expedition* untuk cek status.\n`;
      text += `💡 Ketik *${prefix}expedition claim* setelah waktu habis.\n`;
      
      await m.react("🐣");
      return m.reply(text);
    }

    // Default: Check status or show location list
    if (data.active) {
      const elapsed = now - data.active.startTime;
      const isDone = elapsed >= data.active.duration;
      const remaining = Math.max(0, data.active.duration - elapsed);

      let text = "";
      text += `${data.active.emoji} Lokasi : *${data.active.name}*\n`;
      text += `💰 Est. Reward : ${data.active.minGold.toLocaleString()} - ${data.active.maxGold.toLocaleString()} Gold\n`;
      text += `⏳ Sisa Waktu : *${isDone ? "SIAP DIKLAIM! 🎉" : formatTime(remaining)}*\n`;
      text += `
`;
      if (isDone) {
        text += `✨ Ketik *${prefix}expedition claim* untuk mengambil hadiah!\n`;
      } else {
        text += `ℹ️ Tunggu hingga timer selesai untuk klaim reward.\n`;
      }
      
      await m.react("🐣");
      return m.reply(text);
    }

    // No active expedition: show locations menu
    let menu = "";
    menu += `Kirim party kamu untuk menjelajahi wilayah!\n`;
    menu += `
`;
    LOCATIONS.forEach((l) => {
      menu += `*${l.id}. ${l.emoji} ${l.name}*\n`;
      menu += `⏱️ Durasi : ${l.durationStr}\n`;
      menu += `💰 Potensi : ${l.minGold.toLocaleString()} - ${l.maxGold.toLocaleString()} Gold\n`;
    });
    menu += `
`;
    menu += `📌 Cara Memulai:\n`;
    menu += `Ketik *${prefix}expedition start <1-5>*\n`;
    menu += `Contoh: *${prefix}expedition start 1*\n`;
    
    await m.react("🐣");
    return m.reply(menu);
  } catch (err) {
    await m.react("❌");
    return m.reply(claraWrap("expedition", `Terjadi kesalahan: ${err.message}`, "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
