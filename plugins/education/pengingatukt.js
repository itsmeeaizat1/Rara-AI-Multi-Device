// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Pengingat UKT/SPP — set deadline + reminder otomatis ke user
// Fix: pakai database (bukan Map), ada setInterval untuk cek deadline
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

// Helper: parse tanggal DD/MM/YYYY atau DD-MM-YYYY
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

function formatRupiah(n) {
  if (!n) return "Tidak diset";
  return "Rp " + n.toLocaleString("id-ID");
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

// Ambil simpan data UKT dari database
function getUktStore(db) {
  if (!db.setting("uktReminders")) db.setSetting("uktReminders", {});
  return db.setting("uktReminders");
}

function saveUktStore(db, store) {
  db.setSetting("uktReminders", store);
  db.save();
}

// Background checker — jalankan tiap 1 jam
let checkerStarted = false;
function startChecker(sock) {
  if (checkerStarted) return;
  checkerStarted = true;
  
  setInterval(async () => {
    try {
      const db = getDatabase();
      const store = getUktStore(db);
      const now = Date.now();
      let changed = false;
      
      for (const [sender, record] of Object.entries(store)) {
        if (!record || !record.deadline) continue;
        const daysLeft = daysUntil(new Date(record.deadline));
        
        // Kirim reminder di H-7, H-3, H-1, H-0
        const reminderDays = [7, 3, 1, 0];
        if (reminderDays.includes(daysLeft) && !record.reminded?.includes(daysLeft)) {
          let urgency = "";
          if (daysLeft === 0) urgency = "HARI INI - BAYAR SEKARANG!";
          else if (daysLeft === 1) urgency = "BESOK - siapkan pembayaran!";
          else if (daysLeft === 3) urgency = `${daysLeft} hari lagi`;
          else urgency = `${daysLeft} hari lagi`;
          
          const msg = claraWrap("Pengingat UKT/SPP", [
            `Deadline: ${formatDate(new Date(record.deadline))}`,
            `Jumlah: ${formatRupiah(record.amount)}`,
            `Status: ${urgency}`,
            ``,
            `Jangan lupa bayar tepat waktu ya!`,
          ].join("\n"));
          
          try {
            await sock.sendMessage(sender, { text: msg });
          } catch (e) {
            console.error("[pengingatukt] send reminder:", e.message);
          }
          
          // Tandai sudah direminder
          if (!record.reminded) record.reminded = [];
          record.reminded.push(daysLeft);
          changed = true;
        }
        
        // Hapus yang udah lewat 30 hari
        if (daysLeft < -30) {
          delete store[sender];
          changed = true;
        }
      }
      
      if (changed) saveUktStore(db, store);
    } catch (e) {
      console.error("[pengingatukt] checker:", e.message);
    }
  }, 60 * 60 * 1000); // tiap 1 jam
}

async function handler(m, { sock, args, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || ".";
  const sub = (args[0] || "").toLowerCase();
  const sender = m.sender || m.key?.participant || m.key?.remoteJid;

  // Start background checker
  startChecker(sock);

  const db = getDatabase();
  const store = getUktStore(db);

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
      reminded: [],
    };
    store[sender] = record;
    saveUktStore(db, store);

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
      `Bot akan kasih pengingat di H-7, H-3, H-1, dan H-0.`,
    ].join("\n")) + "\n" + tipText(`Ketik ${prefix}pengingatukt cek untuk lihat`), { commandName: "pengingatukt" });
  }

  // .pengingatukt cek
  if (sub === "cek" || sub === "status" || sub === "lihat") {
    const record = store[sender];
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
      `Reminder dikirim: ${record.reminded?.length || 0}x`,
    ].join("\n")), { commandName: "pengingatukt" });
  }

  // .pengingatukt hapus
  if (sub === "hapus" || sub === "stop" || sub === "cancel") {
    if (!store[sender]) {
      return sendReplyWithNav(m, sock, claraWrap("Pengingat UKT", "Tidak ada pengingat aktif."), { commandName: "pengingatukt" });
    }
    delete store[sender];
    saveUktStore(db, store);
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
    ``,
    `Bot otomatis kirim pengingat di H-7, H-3, H-1, dan H-0.`,
  ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}pengingatukt set 25/08/2026 5000000`);
  return sendReplyWithNav(m, sock, txt, { commandName: "pengingatukt" });
}

export { pluginConfig as config, handler };
