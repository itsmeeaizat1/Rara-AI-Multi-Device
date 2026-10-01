// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Pengingat UKT/SPP
 * Fitur: Set deadline pembayaran + reminder otomatis H-7/3/1/0 +
 *        countdown live 🕒 pas ≤48 jam (engine: nova-ukt-reminder.js —
 *        checker nyala dari startup, persist, tahan restart)
 */
import { novaWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import {
  getRecord, setRecord, deleteRecord,
  remainingMs, daysUntil, formatDate, formatRupiah,
  fireUktTicker, startUktChecker,
} from "../../src/lib/nova-ukt-reminder.js";

const pluginConfig = {
  name: "pengingatukt",
  alias: ["pengingatukt", "ukt", "uktreminder"],
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

// Helper: parse tanggal DD/MM/YYYY atau DD-MM-YYYY (juga DD/MM → tahun ini)
function parseDate(str) {
  const today = new Date();
  let d, m, y;
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 2) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = today.getFullYear(); }
    else if (parts.length === 3) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
  } else if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 2) { d = parseInt(parts[0]); m = parseInt(parts[1]); y = today.getFullYear(); }
    else if (parts.length === 3) {
      if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); }
      else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
    }
  }
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null; // 32/13 ditolak
  return dt;
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;

  // checker nyala juga dari startup (restoreUkt) — di sini buat jaga2
  startUktChecker(sock);

  const db = getDatabase();

  // .pengingatukt set <tanggal> [jumlah]
  if (sub === "set" || sub === "atur") {
    const dateStr = args[1];
    const amount = parseInt(args[2]) || 0;

    if (!dateStr) {
      return m.reply( novaWrap("Pengingat UKT", [
        `Format: ${prefix}pengingatukt set <DD/MM/YYYY> [jumlah]`,
        ``,
        `Contoh:`,
        `${prefix}pengingatukt set 25/12/2026 5000000`,
        `${prefix}pengingatukt set 25/12/2026`,
      ].join("\n")), { commandName: "pengingatukt" });
    }

    const deadline = parseDate(dateStr);
    if (!deadline) {
      return m.reply( novaWrap("Pengingat UKT", "Format tanggal salah. Gunakan DD/MM/YYYY"), { commandName: "pengingatukt" });
    }

    const record = {
      sender,
      deadline: deadline.getTime(),
      amount,
      semester: args[3] || "Semester ini",
      setAt: Date.now(),
      reminded: [],
    };
    setRecord(db, sender, record);

    const days = daysUntil(deadline);
    const sisa = remainingMs(record);
    let status = "";
    if (days < 0) status = "🔴 SUDAH LEWAT";
    else if (days === 0) status = "🔴 HARI INI";
    else status = `${days} hari lagi`;

    const lines = [
      "✅ *Pengingat terpasang!*",
      "",
      `📅 Deadline: ${formatDate(deadline)}`,
      `💵 Jumlah: ${formatRupiah(amount)}`,
      `📚 ${record.semester}`,
      `Status: ${status}`,
      "",
      "Bot akan kasih pengingat di H-7, H-3, H-1, dan H-0.",
    ];
    if (days >= 0 && sisa <= 48 * 3600000) lines.push("", "🕒 *Countdown live menyusul di bawah* 👇");
    return m.reply( novaWrap("Pengingat UKT", lines.join("\n")) + "\n" + tipText(`Ketik ${prefix}pengingatukt cek untuk lihat`), { commandName: "pengingatukt" })
      .then(() => {
        if (days >= 0 && sisa > 0 && sisa <= 48 * 3600000) fireUktTicker(sock, sender, record);
      });
  }

  // .pengingatukt cek
  if (sub === "cek" || sub === "status" || sub === "lihat") {
    const record = getRecord(sender, db);
    if (!record) {
      return m.reply( novaWrap("Pengingat UKT", [
        `Belum ada pengingat UKT terpasang.`,
        `Ketik ${prefix}pengingatukt set <tanggal> untuk mulai`,
      ].join("\n")), { commandName: "pengingatukt" });
    }

    const deadline = new Date(record.deadline);
    const days = daysUntil(deadline);
    let status = "";
    if (days < 0) status = "🔴 SUDAH LEWAT (segera bayar!)";
    else if (days === 0) status = "🔴 HARI INI - BAYAR SEKARANG!";
    else if (days <= 7) status = `🟠 ${days} hari lagi - SEGERA BAYAR`;
    else status = `🟢 ${days} hari lagi`;

    return m.reply( novaWrap("Pengingat UKT - Status", [
      `📅 Deadline: ${formatDate(deadline)}`,
      `💵 Jumlah: ${formatRupiah(record.amount)}`,
      `📚 ${record.semester || "Semester ini"}`,
      `Status: ${status}`,
      `Dipasang: ${formatDate(new Date(record.setAt))}`,
      `Reminder dikirim: ${record.reminded?.length || 0}x`,
    ].join("\n")), { commandName: "pengingatukt" })
      .then(() => {
        const rem = remainingMs(record);
        if (rem > 0 && rem <= 48 * 3600000) fireUktTicker(sock, sender, record);
      });
  }

  // .pengingatukt hapus
  if (sub === "hapus" || sub === "stop" || sub === "cancel") {
    const ok = deleteRecord(db, sender); // ticker aktif otomatis batal (isCancelled)
    return m.reply( novaWrap("Pengingat UKT", ok ? "✅ Pengingat dihapus — countdown ikut mati." : "Tidak ada pengingat aktif."), { commandName: "pengingatukt" });
  }

  // Default: help
  const txt = novaWrap("Pengingat UKT/SPP", [
    `Pengingat pembayaran UKT/SPP untuk mahasiswa.`,
    ``,
    `Perintah:`,
    `1. ${prefix}pengingatukt set <DD/MM/YYYY> [jumlah] - Set deadline`,
    `2. ${prefix}pengingatukt cek - Cek status (+ countdown live 🕒 ≤48 jam)`,
    `3. ${prefix}pengingatukt hapus - Hapus pengingat`,
    ``,
    `Bot otomatis kirim pengingat di H-7, H-3, H-1, dan H-0.`,
    `H-1 & H-0: countdown live sampai deadline.`,
  ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}pengingatukt set 25/12/2026 5000000`);
  return m.reply( txt, { commandName: "pengingatukt" });
}

export { pluginConfig as config, handler };
