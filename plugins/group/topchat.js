// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// topchat — Top chat member di grup (data LIVE dari rara-activity-tracker,
// hook handler.js — 12 Sep 2026 fix: dulu baca chatStats yang recordernya gak ada = selalu kosong)
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getLeaderboard, getWeeklyStats } from "../../src/lib/rara-activity-tracker.js";

const pluginConfig = {
  name: "topchat",
  alias: ["topchat"],
  category: "group",
  description: "Lihat statistik chat member di grup (minggu ini)",
  usage: ".topchat",
  example: ".topchat",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const board = getLeaderboard(m.chat, 10);
  const stats = getWeeklyStats(m.chat);

  if (!board.length || stats.totalMessages === 0) {
    return m.reply(raraWrap("Total Chat", [
      "Belum ada data chat di grup ini.",
      "Data tercatat otomatis setiap member chat — coba lagi nanti.",
    ].join("\n")));
  }

  let txt = `📊 *total chat*\nBerikut ini adalah jumlah pesan yang dikirim oleh member di grup ini (minggu ini):\n\n`;
  for (const u of board) {
    const name = (u.name || u.jid.split("@")[0]).slice(0, 20);
    const medal = u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : u.rank === 3 ? "🥉" : "▸";
    txt += `${medal} ${name} — *${(u.messageCount || 0).toLocaleString("id-ID")}* pesan (${u.points}pts)\n`;
  }
  txt += `\n*Total Pesan: ${stats.totalMessages.toLocaleString("id-ID")}* | *Member Aktif: ${stats.activeMembers}*`;
  txt += `\n*Periode:* ${new Date(stats.weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - hari ini`;
  const mentions = board.map((u) => u.jid);
  return m.reply(txt, { mentions });
}

export { pluginConfig as config, handler };
