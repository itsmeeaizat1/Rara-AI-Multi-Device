// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Cek status hubungan

import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "cekpacar",
  alias: ["cekpasangan", "statuspacar", "statusjadian"],
  category: "fun",
  description: "Cek status hubungan seseorang",
  usage: ".cekpacar atau .cekpacar @tag",
  example: ".cekpacar",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function formatDurasi(ms) {
  if (!ms) return "Tidak diketahui";
  const hari = Math.floor(ms / 86400000);
  const jam = Math.floor((ms % 86400000) / 3600000);
  if (hari > 0) return `${hari} hari ${jam} jam`;
  if (jam > 0) return `${jam} jam`;
  const menit = Math.floor((ms % 3600000) / 60000);
  return `${menit} menit`;
}

async function handler(m, { sock }) {
  try {
    const db = getDatabase();

    let targetJid = m.sender;
    if (m.mentionedJid?.[0]) targetJid = m.mentionedJid[0];
    else if (m.quoted) targetJid = m.quoted.sender;

    let data = db.getUser(targetJid) || {};
    if (!data.fun) data.fun = {};

    const name = data.name || targetJid.split("@")[0];
    const now = Date.now();

    let msg = `╭──「 **ᴄᴇᴋ ᴘᴀᴄᴀʀ*\n\n`; 」
    msg += `  ┊ ➶ 👤 Nama: *${name}*\n`;

    if (data.fun.pasangan) {
      const partnerJid = data.fun.pasangan;
      const partner = db.getUser(partnerJid) || {};
      const partnerName = partner.name || partnerJid.split("@")[0];

      // Cek mutual
      if (partner.fun?.pasangan === targetJid) {
        msg += `  ┊ ➶ 💕 Status: *Berpacaran*\n`;
        msg += `  ┊ ➶ ❤️ Pasangan: *${partnerName}*\n`;

        if (data.fun.jadiPacar) {
          const durasi = now - data.fun.jadiPacar;
          msg += `  ┊ ➶ ⏰ Jadian: *${formatDurasi(durasi)}*\n`;
        }

        // Cek nikah
        if (data.fun.nikah === partnerJid && partner.fun?.nikah === targetJid) {
          msg += `  ┊ ➶ 💍 Status: *Sudah menikah*\n`;
          if (data.fun.nikahDate) {
            const durasiNikah = now - data.fun.nikahDate;
            msg += `  ┊ ➶ 📅 Nikah: *${formatDurasi(durasiNikah)}*\n`;
          }
        } else {
          msg += `  ┊ ➶ 💍 Status: *Belum menikah*\n`;
        }
      } else {
        // Tidak mutual (ghosted)
        msg += `  ┊ ➶ 💔 Status: *Ghosted* (pasangan tidak aktif)\n`;
      }
    } else if (data.fun.tembakTarget) {
      const target = db.getUser(data.fun.tembakTarget) || {};
      const targetName = target.name || data.fun.tembakTarget.split("@")[0];
      msg += `  ┊ ➶ 🏹 Status: *Menunggu jawaban*\n`;
      msg += `  ┊ ➶ 🎯 Nembak: *${targetName}*\n`;
    } else {
      msg += `  ┊ ➶ 💔 Status: *Jomblo*\n`;
    }

    // Stats
    if (data.fun.terimaCount || data.fun.tolakCount || data.fun.putusCount) {
      msg += `\n  📊 *Statistik:*\n`;
      if (data.fun.terimaCount) msg += `  ┊ ➶ Jadian: *${data.fun.terimaCount}x*\n`;
      if (data.fun.tolakCount) msg += `  ┊ ➶ Tolak: *${data.fun.tolakCount}x*\n`;
      if (data.fun.putusCount) msg += `  ┊ ➶ Putus: *${data.fun.putusCount}x*\n`;
      if (data.fun.tembakCount) msg += `  ┊ ➶ Tembak: *${data.fun.tembakCount}x*\n`;
    }

    // History
    if (data.fun.pacaranHistory && data.fun.pacaranHistory.length > 0) {
      const recent = data.fun.pacaranHistory.slice(-5).reverse();
      msg += `\n  📜 *Riwayat Terakhir:*\n`;
      for (const h of recent) {
        const date = new Date(h.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const partnerName = (db.getUser(h.partner) || {}).name || h.partner.split("@")[0];
        let icon = "💕";
        if (h.action === "putus") icon = "💔";
        else if (h.action === "ditolak" || h.action === "menolak") icon = "🙅";
        msg += `  ┊ ➶ ${icon} ${h.action} dengan ${partnerName} (${date})\n`;
      }
    }

    msg += `\n╰──────────❀`;

    await m.reply(msg);
    await m.react("🔍");
  } catch (e) {
    console.error("[cekpacar] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
