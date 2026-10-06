// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "blacklistscammer",
  alias: ["blacklistscammer", "scammerblacklist"],
  category: "group",
  description: "Registry penipu/scammer - catat, cek, pantau nomor penipu",
  usage: ".blacklistscammer <add/cek/list/info/remove/stats>",
  example: ".blacklistscammer add 08123456789 | judi online | screenshot bukti",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Normalize phone number: strip @, +, spaces, dashes; keep digits only
function normalizeNumber(input) {
  let num = String(input || "").replace(/[@\s+\-]/g, "");
  // Convert 08xxx to 628xxx
  if (num.startsWith("08")) num = "62" + num.substring(1);
  // Strip leading 0 if starts with 0
  if (num.startsWith("0")) num = "62" + num.substring(1);
  return num;
}

function formatPhone(num) {
  // Format 628xxx to +62 8xxx
  if (num.startsWith("62")) return "+" + num;
  return num;
}

function formatDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

// Get blacklist data from db
function getBlacklist(db) {
  return db.setting("blacklist") || {};
}

function saveBlacklist(db, data) {
  db.setting("blacklist", data);
  db.save();
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "help";
    const db = getDatabase();

    // --- ADD ---
    if (action === "add") {
      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 2) {
        return m.reply(
          raraWrap("blacklistscammer", prefix + "blacklistscammer add <nomor> | <alasan> | <bukti>\n\n" +
          "Contoh:\n" +
          prefix + "blacklistscammer add 08123456789 | judi online | link grup judi\n" +
          prefix + "blacklistscammer add 08123456789 | pinjol ilegal\n\n" +
          "Bukti opsional. Nomor bisa 08xxx, 628xxx, atau @nomor", "guide"),
          { title: "Blacklist - Add" }
        );
      }

      const [numberInput, reason, proof] = parts;
      const number = normalizeNumber(numberInput);

      if (number.length < 8 || !/^\d+$/.test(number)) {
        return m.reply(raraWrap("Blacklist", "Nomor tidak valid!"));
      }

      const blacklist = getBlacklist(db);

      // Initialize if not exists
      if (!blacklist[number]) {
        blacklist[number] = {
          number,
          reports: [],
          firstReported: Date.now(),
          lastReported: Date.now(),
          verified: false,
        };
      }

      // Check if same reporter already reported
      const existingReport = blacklist[number].reports.find(
        (r) => r.reporter === m.sender
      );
      if (existingReport) {
        return m.reply(raraWrap("Blacklist", "Kamu sudah pernah report nomor ini!\nTotal report: " + blacklist[number].reports.length));
      }

      // Add report
      blacklist[number].reports.push({
        reporter: m.sender,
        reason,
        proof: proof || "-",
        date: Date.now(),
        groupId: m.chat || "",
      });

      blacklist[number].lastReported = Date.now();

      // Auto-verify if 3+ reports from different users
      if (blacklist[number].reports.length >= 3) {
        blacklist[number].verified = true;
      }

      saveBlacklist(db, blacklist);

      const reportCount = blacklist[number].reports.length;
      const verifiedTag = blacklist[number].verified ? " [VERIFIED]" : "";
      return m.reply(raraWrap("Blacklist" + verifiedTag,
        "Report tercatat!\n" +
        "Nomor: " + formatPhone(number) + "\n" +
        "Alasan: *" + reason + "*\n" +
        "Bukti: " + (proof || "-") + "\n" +
        "Total report: " + reportCount + "\n" +
        "Status: " + (blacklist[number].verified ? "*verified* (3+ report)" : "Pending verification")
      ));
    }

    // --- CEK ---
    if (action === "cek") {
      const numberInput = args[1];
      if (!numberInput) {
        return m.reply(raraWrap("Blacklist", "Format: " + prefix + "blacklistscammer cek <nomor>\n💡 *Contoh:* " + prefix + "blacklistscammer cek 08123456789"));
      }

      const number = normalizeNumber(numberInput);
      const blacklist = getBlacklist(db);
      const entry = blacklist[number];

      if (!entry) {
        return m.reply(raraWrap("Aman", "Nomor " + formatPhone(number) + " tidak ada di blacklist.\nBelum ada laporan penipuan."));
      }

      const verifiedTag = entry.verified ? " [VERIFIED]" : "";
      let lines = [
        "Nomor: *" + formatPhone(number) + "*",
        "Total Report: " + entry.reports.length,
        "Status: " + (entry.verified ? "*verified*" : "Pending"),
        "Pertama dilaporkan: " + formatDate(entry.firstReported),
        "Terakhir dilaporkan: " + formatDate(entry.lastReported),
      ];

      // Show last 3 reasons
      lines.push("");
      lines.push("Laporan terakhir:");
      entry.reports.slice(-3).forEach((r, i) => {
        lines.push((i + 1) + ". " + r.reason + " - @" + r.reporter.split("@")[0]);
      });

      if (entry.verified) {
        lines.push("");
        lines.push("PERINGATAN: Nomor ini sudah diverifikasi (3+ laporan). Hati-hati transaksi!");
      }

      return m.reply(raraWrap("Blacklist" + verifiedTag, lines.join("\n")));
    }

    // --- LIST ---
    if (action === "list") {
      const blacklist = getBlacklist(db);
      const entries = Object.values(blacklist);

      if (entries.length === 0) {
        return m.reply(raraWrap("Blacklist", "Belum ada nomor di blacklist.\nTambah: " + prefix + "blacklistscammer add <nomor> | <alasan>"));
      }

      // Sort by report count (most reported first)
      entries.sort((a, b) => b.reports.length - a.reports.length);

      let lines = [];
      entries.slice(0, 20).forEach((entry, i) => {
        const verified = entry.verified ? " [V]" : "";
        lines.push(
          (i + 1) + ". " + formatPhone(entry.number) + " | " +
          entry.reports.length + " report" + verified + " | " +
          entry.reports[0].reason.substring(0, 30)
        );
      });

      const totalVerified = entries.filter((e) => e.verified).length;
      lines.push("");
      lines.push("Total: " + entries.length + " nomor (" + totalVerified + " verified)");

      return m.reply(raraWrap("Daftar Blacklist", lines.join("\n")));
    }

    // --- INFO ---
    if (action === "info") {
      const numberInput = args[1];
      if (!numberInput) {
        return m.reply(raraWrap("Blacklist", "Format: " + prefix + "blacklistscammer info <nomor>"));
      }

      const number = normalizeNumber(numberInput);
      const blacklist = getBlacklist(db);
      const entry = blacklist[number];

      if (!entry) {
        return m.reply(raraWrap("Blacklist", "Nomor " + formatPhone(number) + " tidak ada di blacklist"));
      }

      let lines = [
        "Nomor: *" + formatPhone(number) + "*",
        "Status: " + (entry.verified ? "*verified*" : "Pending"),
        "Total Report: " + entry.reports.length,
        "Pertama: " + formatDate(entry.firstReported),
        "Terakhir: " + formatDate(entry.lastReported),
        "",
        "Semua Laporan:",
      ];

      entry.reports.forEach((r, i) => {
        lines.push((i + 1) + ". @" + r.reporter.split("@")[0]);
        lines.push("   Alasan: " + r.reason);
        lines.push("   Bukti: " + r.proof);
        lines.push("   Tanggal: " + formatDate(r.date));
      });

      return m.reply(raraWrap("Info Blacklist", lines.join("\n")));
    }

    // --- REMOVE (owner/admin only) ---
    if (action === "remove") {
      const isOwner = m.isOwner || m.sender === botConfig.owner?.[0];
      if (!isOwner) {
        // Check if group admin
        const gid = m.chat || "";
        if (gid.endsWith("@g.us")) {
          const groupMeta = await sock.groupMetadata(gid).catch(() => null);
          const isGroupAdmin = groupMeta?.participants?.some(
            (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
          );
          if (!isGroupAdmin) {
            return m.reply(raraWrap("Blacklist", "Hanya owner atau admin grup yg bisa hapus blacklist"));
          }
        } else {
          return m.reply(raraWrap("Blacklist", "Hanya owner yg bisa hapus blacklist via private chat"));
        }
      }

      const numberInput = args[1];
      if (!numberInput) {
        return m.reply(raraWrap("Blacklist", "Format: " + prefix + "blacklistscammer remove <nomor>"));
      }

      const number = normalizeNumber(numberInput);
      const blacklist = getBlacklist(db);

      if (!blacklist[number]) {
        return m.reply(raraWrap("Blacklist", "Nomor " + formatPhone(number) + " tidak ada di blacklist"));
      }

      delete blacklist[number];
      saveBlacklist(db, blacklist);
      return m.reply(raraWrap("Blacklist", "Nomor " + formatPhone(number) + " dihapus dari blacklist"));
    }

    // --- STATS ---
    if (action === "stats") {
      const blacklist = getBlacklist(db);
      const entries = Object.values(blacklist);

      if (entries.length === 0) {
        return m.reply(raraWrap("Blacklist", "Belum ada data blacklist."));
      }

      const totalReports = entries.reduce((sum, e) => sum + e.reports.length, 0);
      const verifiedCount = entries.filter((e) => e.verified).length;
      const pendingCount = entries.length - verifiedCount;

      // Most common reasons
      const reasonCount = {};
      entries.forEach((e) => {
        e.reports.forEach((r) => {
          const key = r.reason.toLowerCase().trim();
          reasonCount[key] = (reasonCount[key] || 0) + 1;
        });
      });
      const topReasons = Object.entries(reasonCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      let lines = [
        "Total Nomor: " + entries.length,
        "Total Laporan: " + totalReports,
        "Verified: " + verifiedCount,
        "Pending: " + pendingCount,
        "",
        "Kategori Terbanyak:",
      ];

      topReasons.forEach(([reason, count], i) => {
        lines.push((i + 1) + ". " + reason + " (" + count + "x)");
      });

      return m.reply(raraWrap("Statistik Blacklist", lines.join("\n")));
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "blacklistscammer add <nomor> | <alasan> | <bukti>\n" +
      prefix + "blacklistscammer cek <nomor>\n" +
      prefix + "blacklistscammer list\n" +
      prefix + "blacklistscammer info <nomor>\n" +
      prefix + "blacklistscammer remove <nomor> (owner/admin)\n" +
      prefix + "blacklistscammer stats\n\n" +
      "Auto-verified jika 3+ laporan dari user berbeda",
      { title: "Blacklist - Menu" }
    );
  } catch (e) {
    console.error("blacklist error:", e);
    return m.reply(raraWrap("Blacklist", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
