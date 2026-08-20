// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "pengingatukt",
  alias: ["ukt", "uktreminder", "reminderukt", "bayarukt", "pengingatspp"],
  category: "education",
  description: "Pengingat pembayaran UKT/SPP - set deadline & reminder otomatis",
  usage: ".pengingatukt <command>",
  example: ".pengingatukt set 25/08/2026 5000000\n.pengingatukt cek\n.pengingatukt hapus",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// In-memory store: sender -> { deadline, amount, semester, reminders: [] }
const uktStore = new Map();

function parseDate(str) {
  const today = new Date();
  let d, m, y;
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 2) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = today.getFullYear(); }
    else if (parts.length === 3) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
  } else if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); }
      else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
    }
  }
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function daysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatRupiah(n) {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;

  // .pengingatukt set <tanggal> [jumlah]
  if (sub === "set" || sub === "atur") {
    const dateStr = args[1];
    const amount = parseInt(args[2]) || 0;

    if (!dateStr) {
      return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT", [
        `Format: ${prefix}pengingatukt set <DD/MM/YYYY> [jumlah]`,
        ``,
        `Contoh:`,
        `${prefix}pengingatukt set 25/08/2026 5000000`,
        `${prefix}pengingatukt set 25/08/2026`,
      ].join("\n")), { commandName: "pengingatukt" });
    }

    const deadline = parseDate(dateStr);
    if (!deadline) {
      return sendReplyWithNav(m, sock, claraWrap("Error", "Format tanggal salah. Gunakan DD/MM/YYYY"), { commandName: "pengingatukt" });
    }

    const record = {
      sender,
      deadline: deadline.getTime(),
      amount,
      semester: args[3] || "Semester ini",
      setAt: Date.now(),
    };
    uktStore.set(sender, record);

    const days = daysUntil(deadline);
    let status = "";
    if (days < 0) status = "SUDAH LEWAT";
    else if (days === 0) status = "HARI INI";
    else status = `${days} hari lagi`;

    return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT - Terpasang", [
      `Deadline: ${formatDate(deadline)}`,
      `Jumlah: ${formatRupiah(amount)}`,
      `Status: ${status}`,
      ``,
      `Bot akan kasih pengingat di chat ini.`,
    ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pengingatukt cek untuk lihat`), { commandName: "pengingatukt" });
  }

  // .pengingatukt cek
  if (sub === "cek" || sub === "status" || sub === "lihat") {
    const record = uktStore.get(sender);
    if (!record) {
      return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT", [
        `Belum ada pengingat UKT terpasang.`,
        `Ketik ${prefix}pengingatukt set <tanggal> untuk mulai`,
      ].join("\n")), { commandName: "pengingatukt" });
    }

    const deadline = new Date(record.deadline);
    const days = daysUntil(deadline);
    let status = "";
    if (days < 0) status = "SUDAH LEWAT (segera bayar!)";
    else if (days === 0) status = "HARI INI - BAYAR SEKARANG!";
    else if (days <= 7) status = `${days} hari lagi - SEGERA BAYAR`;
    else status = `${days} hari lagi`;

    return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT - Status", [
      `Deadline: ${formatDate(deadline)}`,
      `Jumlah: ${formatRupiah(record.amount)}`,
      `Status: ${status}`,
      `Dipasang: ${formatDate(new Date(record.setAt))}`,
    ].join("\n")), { commandName: "pengingatukt" });
  }

  // .pengingatukt hapus
  if (sub === "hapus" || sub === "stop" || sub === "cancel") {
    if (!uktStore.has(sender)) {
      return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT", "Tidak ada pengingat aktif."), { commandName: "pengingatukt" });
    }
    uktStore.delete(sender);
    return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT", "Pengingat dihapus."), { commandName: "pengingatukt" });
  }

  // Default: help
  const txt = claraWrap("Pengingat UKT/SPP", [
    `Pengingat pembayaran UKT/SPP untuk mahasiswa.`,
    ``,
    `Perintah:`,
    `1. ${prefix}pengingatukt set <DD/MM/YYYY> [jumlah] - Set deadline`,
    `2. ${prefix}pengingatukt cek - Cek status deadline`,
    `3. ${prefix}pengingatukt hapus - Hapus pengingat`,
  ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}pengingatukt set 25/08/2026 5000000`);
  return sendReplyWithNav(m, sock, txt, { commandName: "pengingatukt" });
}

export { pluginConfig as config, handler };
