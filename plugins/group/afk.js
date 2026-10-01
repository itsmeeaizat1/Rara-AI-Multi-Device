// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .afk v2 — interaktif (request owner 13 Sep 2026: "di .afk g ada wktu
// kpan user mulai afk dan wktu brapa lama user afknya gt"):
// kartu lengkap jam mulai + durasi + alasan + nama, persist di db
// (selamat restart), subcommand cek/list/off, auto jawab yang mention.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  getAfkUser, setAfkUser, removeAfkUser, isUserAfk, loadAfkMap,
  formatWib, formatDuration,
} from "../../src/lib/rara-afk.js";
import { runLiveTicker } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: 'afk',
  alias: ["afk"],
  category: 'group',
  description: 'Set status AFK interaktif — bot jawab otomatis yang mention kamu',
  usage: '.afk <alasan> | .afk cek <reply/@user> | .afk list | .afk off',
  example: '.afk lagi makan',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
}

async function handler(m, { sock }) {
  const sub = String(m.args?.[0] || "").toLowerCase();
  const num = m.sender.split("@")[0];
  const label = m.pushName || `@${num}`;

  // ── .afk cek <reply/@user> — liat status AFK orang lain ──
  if (sub === "cek" || sub === "status") {
    let target = null;
    if (Array.isArray(m.mentionedJid) && m.mentionedJid.length) target = m.mentionedJid[0];
    if (!target && m.quoted?.sender) target = m.quoted.sender;
    if (!target) {
      return m.reply(raraWrap("Cek AFK", [
        "Cek status AFK orang lain:",
        "• Reply pesan dia + `.afk cek`",
        "• Atau tag dia + `.afk cek @user`",
      ].join("\n"), "guide"));
    }
    const info = getAfkUser(target);
    if (!info) {
      return m.reply(raraWrap("Cek AFK", [
        `\`@${target.split("@")[0]}\` gak lagi AFK — dia lagi ada di sini.`,
      ].join("\n")), { mentions: [target] });
    }
    const tnum = target.split("@")[0];
    // 🔹 LIVE TICKER (13 Sep): durasi AFK nge-tick hidup di kartu — bukan
    // angka beku. Kartu di-edit tiap detik ±12 dtk lalu settle final.
    const card = (durasiMs) => raraWrap("Cek AFK", [
      `👤 Nama : ${info.name || "@" + tnum}`,
      `⏰ Mulai : ${formatWib(info.since)}`,
      `⏱️ Durasi : ${formatDuration(durasiMs)}`,
      `📝 Alasan : ${info.reason || "-"}`,
      ``,
      `🕒 _durasi ke-update tiap detik selagi timer jalan_`,
    ].join("\n"));
    return runLiveTicker({
      sock, chat: m.chat, m,
      mode: "up", sinceTs: Number(info.since), upRunMs: Number(process.env.NOVAFK_TICKER_MS) || 12000,
      initialCard: card(Date.now() - info.since),
      tickCard: (st) => card(st.elapsedMs),
      finalCard: (st) => raraWrap("Cek AFK", [
        `👤 Nama : ${info.name || "@" + tnum}`,
        `⏰ Mulai : ${formatWib(info.since)}`,
        `⏱️ Durasi : ${formatDuration(st.elapsedMs)} (dan terus berjalan)`,
        `📝 Alasan : ${info.reason || "-"}`,
      ].join("\n")),
    }).then(() => { try { sock.sendMessage(m.chat, { mentions: [target] }); } catch {} });
  }

  // ── .afk list — siapa aja yang lagi AFK ──
  if (sub === "list" || sub === "daftar") {
    const map = loadAfkMap();
    const now = Date.now();
    const rows = Object.entries(map).map(([jid, info]) => {
      const n = info.name || "@" + jid.split("@")[0];
      return `• ${n} — ${formatWib(info.since)} (${formatDuration(now - info.since)})`;
    });
    if (!rows.length) {
      return m.reply(raraWrap("Daftar AFK", "Belum ada yang AFK sekarang — semua lagi online!", "info"));
    }
    return m.reply(raraWrap("Daftar AFK", [
      `${rows.length} orang lagi AFK:`,
      ``,
      ...rows,
    ].join("\n")));
  }

  // ── .afk off — batalin AFK sendiri ──
  if (sub === "off" || sub === "stop" || sub === "batal") {
    const old = removeAfkUser(m.sender);
    if (!old) {
      return m.reply(raraWrap("AFK", "Kamu emang gak lagi AFK — santai.", "info"));
    }
    return m.reply(raraWrap("AFK Dibatalkan", [
      `\`AFK kamu dibatalkan\``,
      `⏰ Tadi mulai : ${formatWib(old.since)}`,
      `⏱️ Durasi : ${formatDuration(Date.now() - old.since)}`,
    ].join("\n"), "success"), { mentions: [m.sender] });
  }

  // ── .afk <alasan> — set / perbarui ──
  const reason = (m.text || "Tanpa alasan").trim() || "Tanpa alasan";
  const { entry, prev } = setAfkUser(m.sender, { reason, name: label, chat: m.chat });

  if (prev) {
    return m.reply(raraWrap("AFK Diperbarui", [
      `👤 Nama : ${label}`,
      `📝 Alasan Baru : ${reason}`,
      `⏰ Mulai Baru : ${formatWib(entry.since)}`,
      `⏱️ AFK kamu tadi udah : ${formatDuration(entry.since - prev.since)}`,
      ``,
      `_Alasan lama: ${prev.reason}_`,
    ].join("\n")), { mentions: [m.sender] });
  }

  // 🔹 LIVE TICKER (13 Sep): kartu AFK aktif nunjukin durasi yang nge-tick
  // hidup ±12 dtk — keliatan timer-nya jalan beneran, bukan kartu beku.
  const setCard = (durasiMs) => raraWrap("AFK Aktif", [
    `👤 Nama : ${label}`,
    `📝 Alasan : ${reason}`,
    `⏰ Mulai : ${formatWib(entry.since)}`,
    `⏱️ Durasi : ${formatDuration(durasiMs)}`,
    ``,
    `_Aku otomatis jawab siapa pun yang ngingetin kamu, dan ucapin selamat datang kembali pas kamu balakang._`,
  ].join("\n"), "success");
  return runLiveTicker({
    sock, chat: m.chat, m,
    mode: "up", sinceTs: Number(entry.since), upRunMs: Number(process.env.NOVAFK_TICKER_MS) || 12000,
    initialCard: setCard(0),
    tickCard: (st) => setCard(st.elapsedMs),
  }).then(() => { try { sock.sendMessage(m.chat, { mentions: [m.sender] }); } catch {} });
}

export { pluginConfig as config, handler, getAfkUser, setAfkUser, removeAfkUser, isUserAfk }
