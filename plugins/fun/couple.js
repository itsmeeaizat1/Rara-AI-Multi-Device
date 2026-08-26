// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Dashboard couple

import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "couple",
  alias: ["couple"],
  category: "fun",
  description: "Dashboard hubungan couple",
  usage: ".couple atau .couple @tag",
  example: ".couple",
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

    let msg = `╭──「 *ᴄᴏᴜᴘʟᴇ ɪɴғᴏ* 」\n\n」`;
    msg += `│ ❏ 👤 Nama: *${name}*\n`;

    if (data.fun.pasangan) {
      const partnerJid = data.fun.pasangan;
      const partner = db.getUser(partnerJid) || {};
      const partnerName = partner.name || partnerJid.split("@")[0];

      if (partner.fun?.pasangan === targetJid) {
        msg += `│ ❏ ❤️ Pasangan: *${partnerName}*\n`;

        // Timeline
        if (data.fun.jadiPacar) {
          const pacarDurasi = now - data.fun.jadiPacar;
          msg += `│ ❏ 💕 Pacaran: *${formatDurasi(pacarDurasi)}*\n`;
        }

        if (data.fun.nikah === partnerJid && partner.fun?.nikah === targetJid) {
          msg += `│ ❏ 💍 Status: *Menikah*\n`;
          if (data.fun.nikahDate) {
            const nikahDurasi = now - data.fun.nikahDate;
            msg += `│ ❏ 📅 Nikah: *${formatDurasi(nikahDurasi)}*\n`;
          }
        } else {
          msg += `│ ❏ 💍 Status: *Belum menikah*\n`;
        }

        // Stats bersama
        msg += `\n  📊 *Statistik Hubungan:*\n`;
        const totalPacar = (data.fun.terimaCount || 0);
        const totalPutus = (data.fun.putusCount || 0);
        const totalTembak = (data.fun.tembakCount || 0);
        const totalLamar = (data.fun.lamarCount || 0);
        const totalCerai = (data.fun.ceraiCount || 0);

        msg += `│ ❏ 🏹 Total tembak: *${totalTembak}x*\n`;
        msg += `│ ❏ 💕 Total jadian: *${totalPacar}x*\n`;
        msg += `│ ❏ 💔 Total putus: *${totalPutus}x*\n`;
        msg += `│ ❏ 💍 Total lamar: *${totalLamar}x*\n`;
        msg += `│ ❏ 💔 Total cerai: *${totalCerai}x*\n`;
      } else {
        msg += `│ ❏ 💔 Status: *Ghosted* (pasangan tidak aktif)\n`;
      }
    } else if (data.fun.tembakTarget) {
      const target = db.getUser(data.fun.tembakTarget) || {};
      const targetName = target.name || data.fun.tembakTarget.split("@")[0];
      msg += `│ ❏ 🏹 Status: *Menunggu jawaban*\n`;
      msg += `│ ❏ 🎯 Target: *${targetName}*\n`;
    } else {
      msg += `│ ❏ 💔 Status: *Jomblo* \n`;
    }

    // History
    if (data.fun.pacaranHistory && data.fun.pacaranHistory.length > 0) {
      const recent = data.fun.pacaranHistory.slice(-5).reverse();
      msg += `\n  📜 *Riwayat:*\n`;
      for (const h of recent) {
        const date = new Date(h.date).toLocaleDateString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
        });
        const partnerName = (db.getUser(h.partner) || {}).name || h.partner.split("@")[0];
        let icon = "💕";
        if (h.action === "putus") icon = "💔";
        else if (h.action === "cerai") icon = "💔";
        else if (h.action === "nikah") icon = "💍";
        else if (h.action === "lamaran ditolak" || h.action === "menolak lamaran") icon = "🙅";
        else if (h.action === "ditolak" || h.action === "menolak") icon = "🙅";
        msg += `│ ❏ ${icon} ${h.action} dengan ${partnerName} (${date})\n`;
      }
    }

    msg += `\n╰──────────❀`;

    await m.reply(msg);
    await m.react("💑");
  } catch (e) {
    console.error("[couple] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
