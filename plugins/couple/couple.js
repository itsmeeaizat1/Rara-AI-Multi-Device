// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Dashboard couple

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "couple",
  alias: ["couple"],
  category: "couple",
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

    const rows = [];
    rows.push(`│ • 👤 Nama : ${name}`);

    if (data.fun.pasangan) {
      const partnerJid = data.fun.pasangan;
      const partner = db.getUser(partnerJid) || {};
      const partnerName = partner.name || partnerJid.split("@")[0];

      if (partner.fun?.pasangan === targetJid) {
        rows.push(`│ • ❤️ Pasangan : ${partnerName}`);

        // Timeline
        if (data.fun.jadiPacar) {
          const pacarDurasi = now - data.fun.jadiPacar;
          rows.push(`│ • 💕 Pacaran : ${formatDurasi(pacarDurasi)}`);
        }

        if (data.fun.nikah === partnerJid && partner.fun?.nikah === targetJid) {
          rows.push(`│ • 💍 Status : Menikah`);
          if (data.fun.nikahDate) {
            const nikahDurasi = now - data.fun.nikahDate;
            rows.push(`│ • 📅 Nikah : ${formatDurasi(nikahDurasi)}`);
          }
        } else {
          rows.push(`│ • 💍 Status : Belum menikah`);
        }

        // Stats bersama
        const totalPacar = (data.fun.terimaCount || 0);
        const totalPutus = (data.fun.putusCount || 0);
        const totalTembak = (data.fun.tembakCount || 0);
        const totalLamar = (data.fun.lamarCount || 0);
        const totalCerai = (data.fun.ceraiCount || 0);

        rows.push("│");
        rows.push(`│ • 🏹 Total Tembak : ${totalTembak}x`);
        rows.push(`│ • 💕 Total Jadian : ${totalPacar}x`);
        rows.push(`│ • 💔 Total Putus : ${totalPutus}x`);
        rows.push(`│ • 💍 Total Lamar : ${totalLamar}x`);
        rows.push(`│ • 💔 Total Cerai : ${totalCerai}x`);
      } else {
        rows.push(`│ • 💔 Status : Ghosted (pasangan tidak aktif)`);
      }
    } else if (data.fun.tembakTarget) {
      const target = db.getUser(data.fun.tembakTarget) || {};
      const targetName = target.name || data.fun.tembakTarget.split("@")[0];
      rows.push(`│ • 🏹 Status : Menunggu jawaban`);
      rows.push(`│ • 🎯 Target : ${targetName}`);
    } else {
      rows.push(`│ • 💔 Status : Jomblo`);
    }

    // History
    if (data.fun.pacaranHistory && data.fun.pacaranHistory.length > 0) {
      const recent = data.fun.pacaranHistory.slice(-5).reverse();
      rows.push("│");
      rows.push(`│ • 📜 Riwayat Terakhir :`);
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
        rows.push(`│ • ${icon} ${h.action} dengan ${partnerName} (${date})`);
      }
    }

    await m.reply(raraGameBox({
      title: "couple", icon: "💑",
      flavor: `💑 *DASHBOARD HUBUNGAN KAK ${name.toUpperCase()}!*`,
      body: rows.join("\n"),
      cta: gameCTA("couple"),
    }));
    await m.react("🐣");
  } catch (e) {
    console.error("[couple] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
