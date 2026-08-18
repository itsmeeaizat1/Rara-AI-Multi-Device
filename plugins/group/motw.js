// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "motw",
  aliases: ["motw", "memberoftheweek"],
  category: "group",
  description: "Pilih member paling aktif minggu ini + badge",
  usage: ".motw | .motw auto <on|off> | .motw reset | .motw history",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.motw) db.data.motw = {};
    if (!db.data.motw[groupId]) {
      db.data.motw[groupId] = {
        weekStart: Date.now(),
        autoSelect: false,
        members: {},
        history: [],
        lastWinner: null,
      };
      await db.save();
    }

    const data = db.data.motw[groupId];
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    if (sub === "auto") {
      const toggle = (args[1] || "").toLowerCase();
      if (!["on", "off"].includes(toggle)) {
        return m.reply(`Cara: ${usedPrefix}motw auto on|off`);
      }
      data.autoSelect = toggle === "on";
      await db.save();
      return m.reply(claraWrap("Member of the Week", `Auto-select ${toggle === "on" ? "diaktifkan" : "dimatikan"}. Bot akan pilih member teraktif tiap Minggu.`));
    }

    if (sub === "reset") {
      data.members = {};
      data.weekStart = Date.now();
      await db.save();
      return m.reply(claraWrap("Member of the Week", "Data mingguan direset. Hitung ulang dari sekarang."));
    }

    if (sub === "history") {
      if (data.history.length === 0) {
        return m.reply(claraWrap("Member of the Week", "Belum ada riwayat pemenang."));
      }
      const hist = data.history.slice(-5).map((h, i) => {
        const date = new Date(h.timestamp).toLocaleDateString("id-ID");
        return `${i + 1}. @${h.jid.split("@")[0]} - ${h.messageCount} pesan (${date})`;
      }).join("\n");
      return m.reply(claraWrap("Member of the Week", `Riwayat Pemenang:\n\n${hist}`));
    }

    if (Date.now() - data.weekStart > WEEK_MS) {
      data.members = {};
      data.weekStart = Date.now();
      await db.save();
    }

    const sorted = Object.entries(data.members || {})
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0));

    if (sorted.length === 0) {
      return m.reply(claraWrap("Member of the Week", [
        "Belum ada data aktivitas minggu ini.",
        "",
        `Command:`,
        `${usedPrefix}motw - Lihat kandidat teratas`,
        `${usedPrefix}motw auto on - Auto-pilih tiap minggu`,
        `${usedPrefix}motw reset - Reset data`,
        `${usedPrefix}motw history - Riwayat pemenang`,
      ].join("\n")));
    }

    const winner = sorted[0];
    const winnerJid = winner[0];
    const winnerCount = winner[1].count || 0;

    const top5 = sorted.slice(0, 5).map(([jid, d], i) => {
      const medal = ["🥇", "🥈", "🥉", "4.", "5."][i];
      return `${medal} @${jid.split("@")[0]} - ${d.count || 0} pesan`;
    }).join("\n");

    return m.reply(claraWrap("Member of the Week", [
      `Kandidat Member of the Week:`,
      "",
      top5,
      "",
      `Pemenang sementara: @${winnerJid.split("@")[0]}`,
      `Total pesan: ${winnerCount}`,
      "",
      `Command:`,
      `${usedPrefix}motw auto on - Auto-announce tiap minggu`,
    ].join("\n")));
  } catch (e) {
    console.error("motw error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
