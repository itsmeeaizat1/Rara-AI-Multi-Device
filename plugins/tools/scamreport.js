// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "scamreport",
  alias: ["laporscam", "cekscam", "laporpenipu"],
  category: "tools",
  description: "Lapor nomor penipu & cek nomor sebelum transaksi (database komunitas)",
  usage: ".scamreport <nomor> <laporan> | .scamreport cek <nomor> | .scamreport list",
  example: ".scamreport 6281234567890 Penipu kiriman gak dikirim",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

function normalizeNumber(num) {
  let cleaned = num.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (!cleaned.startsWith("62") && cleaned.length >= 8) cleaned = "62" + cleaned;
  return cleaned;
}

async function handler(m, { sock }) {
  const db = await getDatabase();
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();
  const sender = m.key.participant || m.sender;

  if (!db.data.scamReports) {
    db.data.scamReports = { numbers: {}, totalReports: 0 };
  }
  const scamDB = db.data.scamReports;

  // ===== HELP =====
  if (!sub || sub === "help" || sub === "menu") {
    return sendReplyWithNav(sock, m, claraWrap("Scam Report", [
      "Lapor & cek nomor penipu — database komunitas",
      "",
      "CARA PAKAI:",
      m.prefix + "scamreport <nomor> <laporan> — Lapor nomor penipu",
      m.prefix + "scamreport cek <nomor> — Cek apakah nomor dilaporkan",
      m.prefix + "scamreport list — Top nomor paling banyak dilapor",
      m.prefix + "scamreport myreports — Lihat laporan kamu",
      "",
      "CONTOH:",
      m.prefix + "scamreport 6281234567890 Kiriman gak dikirim",
      m.prefix + "scamreport cek 081234567890",
      "",
      "Bantu komunitas: lapor nomor penipu biar orang lain gak kena!",
    ]), "scamreport");
  }

  // ===== CEK NOMOR =====
  if (sub === "cek" || sub === "check") {
    const num = normalizeNumber(args[1] || "");
    if (!num || num.length < 8) {
      return m.reply(claraWrap("Scam Report", "Nomor tidak valid!\nContoh: .scamreport cek 6281234567890"));
    }

    const report = scamDB.numbers[num];
    if (!report) {
      return m.reply(claraWrap("Scam Report", [
        "Nomor: " + num,
        "Status: BELUM DILAPORKAN",
        "",
        "Nomor ini belum ada laporan penipuan.",
        "Tetap hati-hati — belum dilapor bukan berarti aman 100%.",
      ], "success"));
    }

    let lines = [
      "Nomor: " + num,
      "Total laporan: " + report.count + "x",
      "Status: *DILAPORKAN PENIPU*",
      "",
      "Laporan terbaru:",
    ];

    report.reports.slice(-5).forEach((r, i) => {
      lines.push((i + 1) + ". " + r.text);
      lines.push("   Oleh: " + r.reporterName + " | " + new Date(r.date).toLocaleDateString("id-ID"));
      lines.push("");
    });

    lines.push("Hati-hati! Nomor ini sudah dilaporkan " + report.count + "x.");

    return m.reply(claraWrap("Scam Report", lines, "warn"));
  }

  // ===== LIST TOP SCAMMERS =====
  if (sub === "list" || sub === "top") {
    const numbers = Object.entries(scamDB.numbers).sort((a, b) => b[1].count - a[1].count);
    if (numbers.length === 0) {
      return m.reply(claraWrap("Scam Report", "Belum ada laporan. Jadilah yang pertama lapor!\n" + m.prefix + "scamreport <nomor> <laporan>"));
    }

    let lines = [
      "Top nomor penipu paling banyak dilapor:",
      "Total laporan: " + scamDB.totalReports + "x",
      "",
    ];

    numbers.slice(0, 10).forEach(([num, data], i) => {
      lines.push((i + 1) + ". " + num + " — " + data.count + "x lapor");
      if (data.reports[0]) lines.push("   " + data.reports[0].text);
      lines.push("");
    });

    if (numbers.length > 10) {
      lines.push("Menampilkan 10 dari " + numbers.length + " nomor.");
    }

    return m.reply(claraWrap("Scam Report", lines));
  }

  // ===== MY REPORTS =====
  if (sub === "myreports" || sub === "mine") {
    const myReports = [];
    Object.entries(scamDB.numbers).forEach(([num, data]) => {
      data.reports.forEach((r) => {
        if (r.reporter === sender) myReports.push({ num, text: r.text, date: r.date });
      });
    });

    if (myReports.length === 0) {
      return m.reply(claraWrap("Scam Report", "Kamu belum pernah lapor nomor penipu."));
    }

    let lines = ["Laporan kamu (" + myReports.length + "):", ""];
    myReports.forEach((r, i) => {
      lines.push((i + 1) + ". " + r.num);
      lines.push("   " + r.text);
      lines.push("   " + new Date(r.date).toLocaleDateString("id-ID"));
      lines.push("");
    });

    return m.reply(claraWrap("Scam Report", lines));
  }

  // ===== REPORT SCAM =====
  const num = normalizeNumber(sub);
  const reportText = args.slice(1).join(" ").trim();

  if (!num || num.length < 8) {
    return m.reply(claraWrap("Scam Report", "Nomor tidak valid!\nContoh: .scamreport 6281234567890 Penipu"));
  }
  if (!reportText || reportText.length < 3) {
    return m.reply(claraWrap("Scam Report", "Jelaskan penipuannya!\nContoh: .scamreport 6281234567890 Kiriman gak dikirim"));
  }

  // Cek apakah sudah pernah lapor nomor ini
  if (!scamDB.numbers[num]) {
    scamDB.numbers[num] = { count: 0, reports: [], firstReported: Date.now() };
  }

  const alreadyReported = scamDB.numbers[num].reports.some((r) => r.reporter === sender);
  if (alreadyReported) {
    return m.reply(claraWrap("Scam Report", "Kamu sudah pernah lapor nomor ini!"));
  }

  scamDB.numbers[num].count++;
  scamDB.numbers[num].reports.push({
    reporter: sender,
    reporterName: m.pushName || sender.split("@")[0],
    text: reportText.slice(0, 200),
    date: Date.now(),
  });
  scamDB.totalReports = (scamDB.totalReports || 0) + 1;
  await db.save();

  return m.reply(claraWrap("Scam Report", [
    "Laporan tersimpan!",
    "",
    "Nomor: " + num,
    "Total laporan: " + scamDB.numbers[num].count + "x",
    "Laporan: " + reportText.slice(0, 200),
    "",
    "Terima kasih sudah bantu komunitas!",
  ], "success"));
}

export { pluginConfig as config, handler };
