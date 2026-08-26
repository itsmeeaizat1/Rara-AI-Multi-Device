// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hutang",
  alias: ["hutang"],
  category: "utility",
  description: "Tracker hutang & piutang personal - catat, pantau, lunasi",
  usage: ".hutang <add/piutang/list/lunas/info/remove/total/history>",
  example: ".hutang add Budi | 50000 | bayar kos | 30-08-2026",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function genId() {
  return "HTG-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function formatRupiah(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function formatDate(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function parseDate(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])).getTime();
}

function daysUntil(ts) {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

// Get user debts
function getDebts(db, sender) {
  const all = db.setting("hutang") || {};
  return all[sender] || [];
}

function saveDebts(db, sender, debts) {
  const all = db.setting("hutang") || {};
  all[sender] = debts;
  db.setting("hutang", all);
  db.save();
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const sender = m.sender || m.key?.participant || "";

    // --- ADD HUTANG (you owe someone) ---
    if (action === "add" || action === "baru") {
      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 2) {
        return m.reply(
          prefix + "hutang add <nama> | <jumlah> | <keterangan> | <jatuh_tempo>\n\n" +
          "Jatuh tempo format: DD-MM-YYYY (opsional)\n\n" +
          "Contoh:\n" +
          prefix + "hutang add Budi | 50000 | bayar kos\n" +
          prefix + "hutang add Toko Listrik | 150000 | beli kabel | 30-08-2026",
          { title: "Hutang - Add" }
        );
      }

      const [person, amountStr, desc, dueStr] = parts;
      const amount = parseInt(amountStr.replace(/[^\d]/g, ""));
      if (isNaN(amount) || amount <= 0) {
        return m.reply(claraWrap("Hutang", "Jumlah tidak valid!"));
      }

      const dueDate = dueStr ? parseDate(dueStr) : null;
      if (dueStr && !dueDate) {
        return m.reply(claraWrap("Hutang", "Format tanggal salah! Gunakan: DD-MM-YYYY\nContoh: 30-08-2026"));
      }

      const debts = getDebts(db, sender);
      const id = genId();
      const debt = {
        id,
        type: "hutang",
        person,
        amount,
        desc: desc || "-",
        dueDate,
        createdAt: Date.now(),
        settled: false,
        settledAt: null,
      };

      debts.push(debt);
      saveDebts(db, sender, debts);

      await m.react("🐣");
      let lines = [
        "Hutang dicatat!",
        "Kepada: *" + person + "*",
        "Jumlah: *" + formatRupiah(amount) + "*",
        "Keterangan: " + (desc || "-"),
      ];
      if (dueDate) {
        lines.push("Jatuh tempo: " + formatDate(dueDate));
        const days = daysUntil(dueDate);
        if (days !== null) {
          lines.push(days <= 0 ? "Status: *ᴊᴀᴛᴜʜ ᴛᴇᴍᴘᴏ*" : "Sisa: " + days + " hari");
        }
      }
      lines.push("ID: `" + id + "`");

      return m.reply(claraWrap("Hutang Baru", lines.join("\n")));
    }

    // --- ADD PIUTANG (someone owes you) ---
    if (action === "piutang" || action === "tagih") {
      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 2) {
        return m.reply(
          prefix + "hutang piutang <nama> | <jumlah> | <keterangan> | <jatuh_tempo>\n\n" +
          "Contoh:\n" +
          prefix + "hutang piutang Andi | 100000 | pinjam紧急\n" +
          prefix + "hutang piutang Sari | 75000 | beli makan | 25-08-2026",
          { title: "Piutang - Add" }
        );
      }

      const [person, amountStr, desc, dueStr] = parts;
      const amount = parseInt(amountStr.replace(/[^\d]/g, ""));
      if (isNaN(amount) || amount <= 0) {
        return m.reply(claraWrap("Piutang", "Jumlah tidak valid!"));
      }

      const dueDate = dueStr ? parseDate(dueStr) : null;
      if (dueStr && !dueDate) {
        return m.reply(claraWrap("Piutang", "Format tanggal salah! DD-MM-YYYY"));
      }

      const debts = getDebts(db, sender);
      const id = genId();
      const debt = {
        id,
        type: "piutang",
        person,
        amount,
        desc: desc || "-",
        dueDate,
        createdAt: Date.now(),
        settled: false,
        settledAt: null,
      };

      debts.push(debt);
      saveDebts(db, sender, debts);

      await m.react("🐣");
      let lines = [
        "Piutang dicatat!",
        "Dari: *" + person + "*",
        "Jumlah: *" + formatRupiah(amount) + "*",
        "Keterangan: " + (desc || "-"),
      ];
      if (dueDate) {
        lines.push("Jatuh tempo: " + formatDate(dueDate));
        const days = daysUntil(dueDate);
        if (days !== null) {
          lines.push(days <= 0 ? "Status: *ᴊᴀᴛᴜʜ ᴛᴇᴍᴘᴏ*" : "Sisa: " + days + " hari");
        }
      }
      lines.push("ID: `" + id + "`");

      return m.reply(claraWrap("Piutang Baru", lines.join("\n")));
    }

    // --- LIST ---
    if (action === "list") {
      const debts = getDebts(db, sender);
      const active = debts.filter((d) => !d.settled);

      if (active.length === 0) {
        return m.reply(claraWrap("Hutang", "Tidak ada hutang/piutang aktif.\nTambah: " + prefix + "hutang add <nama> | <jumlah> | <keterangan>"));
      }

      let hutangLines = [];
      let piutangLines = [];

      active.forEach((d) => {
        let status = "";
        if (d.dueDate) {
          const days = daysUntil(d.dueDate);
          if (days <= 0) status = " [JATUH TEMPO!]";
          else if (days <= 3) status = " [" + days + " hari]";
        }
        const line = d.id + " | " + d.person + " | " + formatRupiah(d.amount) + " | " + d.desc + status;
        if (d.type === "hutang") hutangLines.push(line);
        else piutangLines.push(line);
      });

      let lines = [];
      if (hutangLines.length > 0) {
        lines.push("HUTANG (kamu ngutang):");
        hutangLines.forEach((l) => lines.push("  " + l));
      }
      if (piutangLines.length > 0) {
        lines.push("");
        lines.push("PIUTANG (orang utang kamu):");
        piutangLines.forEach((l) => lines.push("  " + l));
      }

      const totalHutang = active.filter((d) => d.type === "hutang").reduce((s, d) => s + d.amount, 0);
      const totalPiutang = active.filter((d) => d.type === "piutang").reduce((s, d) => s + d.amount, 0);
      lines.push("");
      lines.push("Total Hutang: *" + formatRupiah(totalHutang) + "*");
      lines.push("Total Piutang: *" + formatRupiah(totalPiutang) + "*");
      const net = totalPiutang - totalHutang;
      lines.push("Saldo Bersih: " + (net >= 0 ? "+" : "") + formatRupiah(net));

      return m.reply(claraWrap("Daftar Hutang & Piutang", lines.join("\n")));
    }

    // --- LUNAS ---
    if (action === "lunas" || action === "bayar" || action === "settle") {
      const id = args[1]?.toUpperCase();
      if (!id) {
        return m.reply(claraWrap("Hutang", "Format: " + prefix + "hutang lunas <ID>"));
      }

      const debts = getDebts(db, sender);
      const debt = debts.find((d) => d.id === id);
      if (!debt) {
        return m.reply(claraWrap("Hutang", "Record `" + id + "` tidak ditemukan"));
      }
      if (debt.settled) {
        return m.reply(claraWrap("Hutang", "Record `" + id + "` sudah lunas"));
      }

      debt.settled = true;
      debt.settledAt = Date.now();
      saveDebts(db, sender, debts);

      await m.react("🐣");
      const typeLabel = debt.type === "hutang" ? "Hutang ke" : "Piutang dari";
      return m.reply(claraWrap("Lunas",
        "Berhasil dilunasi!\n" +
        typeLabel + ": *" + debt.person + "*\n" +
        "Jumlah: *" + formatRupiah(debt.amount) + "*\n" +
        "Keterangan: " + debt.desc + "\n" +
        "Tanggal lunas: " + formatDate(debt.settledAt)
      ));
    }

    // --- INFO ---
    if (action === "info") {
      const id = args[1]?.toUpperCase();
      if (!id) {
        return m.reply(claraWrap("Hutang", "Format: " + prefix + "hutang info <ID>"));
      }

      const debts = getDebts(db, sender);
      const debt = debts.find((d) => d.id === id);
      if (!debt) {
        return m.reply(claraWrap("Hutang", "Record `" + id + "` tidak ditemukan"));
      }

      const typeLabel = debt.type === "hutang" ? "Hutang ke" : "Piutang dari";
      let lines = [
        typeLabel + ": *" + debt.person + "*",
        "ID: `" + debt.id + "`",
        "Jumlah: *" + formatRupiah(debt.amount) + "*",
        "Keterangan: " + debt.desc,
        "Dibuat: " + formatDate(debt.createdAt),
        "Status: " + (debt.settled ? "*ʟᴜɴᴀꜱ*" : "Belum lunas"),
      ];

      if (debt.dueDate) {
        lines.push("Jatuh tempo: " + formatDate(debt.dueDate));
        if (!debt.settled) {
          const days = daysUntil(debt.dueDate);
          if (days !== null) {
            lines.push(days <= 0 ? "*ᴊᴀᴛᴜʜ ᴛᴇᴍᴘᴏ*" : "Sisa: " + days + " hari");
          }
        }
      }

      if (debt.settled && debt.settledAt) {
        lines.push("Lunas pada: " + formatDate(debt.settledAt));
      }

      return m.reply(claraWrap("Info Hutang", lines.join("\n")));
    }

    // --- REMOVE ---
    if (action === "remove" || action === "hapus" || action === "del") {
      const id = args[1]?.toUpperCase();
      if (!id) {
        return m.reply(claraWrap("Hutang", "Format: " + prefix + "hutang remove <ID>"));
      }

      const debts = getDebts(db, sender);
      const idx = debts.findIndex((d) => d.id === id);
      if (idx === -1) {
        return m.reply(claraWrap("Hutang", "Record `" + id + "` tidak ditemukan"));
      }

      const removed = debts[idx];
      debts.splice(idx, 1);
      saveDebts(db, sender, debts);

      await m.react("🐣");
      return m.reply(claraWrap("Hutang", "Record *" + removed.person + "* (" + formatRupiah(removed.amount) + ") dihapus"));
    }

    // --- TOTAL ---
    if (action === "total" || action === "summary") {
      const debts = getDebts(db, sender);
      const active = debts.filter((d) => !d.settled);
      const settled = debts.filter((d) => d.settled);

      const totalHutang = active.filter((d) => d.type === "hutang").reduce((s, d) => s + d.amount, 0);
      const totalPiutang = active.filter((d) => d.type === "piutang").reduce((s, d) => s + d.amount, 0);
      const net = totalPiutang - totalHutang;

      // Count overdue
      const now = Date.now();
      const overdueHutang = active.filter((d) => d.type === "hutang" && d.dueDate && d.dueDate < now);
      const overduePiutang = active.filter((d) => d.type === "piutang" && d.dueDate && d.dueDate < now);

      // By person breakdown
      const byPerson = {};
      active.forEach((d) => {
        const key = d.person + "|" + d.type;
        if (!byPerson[key]) byPerson[key] = { person: d.person, type: d.type, total: 0, count: 0 };
        byPerson[key].total += d.amount;
        byPerson[key].count++;
      });

      let lines = [
        "Total Hutang: *" + formatRupiah(totalHutang) + "*",
        "Total Piutang: *" + formatRupiah(totalPiutang) + "*",
        "Saldo Bersih: " + (net >= 0 ? "+" : "") + "*" + formatRupiah(net) + "*",
        "",
        "Hutang jatuh tempo: " + overdueHutang.length + " item",
        "Piutang jatuh tempo: " + overduePiutang.length + " item",
        "Sudah lunas: " + settled.length + " record",
        "",
        "Rincian per Orang:",
      ];

      const personEntries = Object.values(byPerson).sort((a, b) => b.total - a.total);
      personEntries.slice(0, 10).forEach((p) => {
        const label = p.type === "hutang" ? "ke" : "dari";
        lines.push(p.person + " (" + label + ") - " + formatRupiah(p.total) + " (" + p.count + "x)");
      });

      return m.reply(claraWrap("Ringkasan Hutang", lines.join("\n")));
    }

    // --- HISTORY ---
    if (action === "history" || action === "riwayat") {
      const debts = getDebts(db, sender);
      const settled = debts.filter((d) => d.settled);

      if (settled.length === 0) {
        return m.reply(claraWrap("Hutang", "Belum ada riwayat pelunasan."));
      }

      settled.sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0));

      let lines = [];
      settled.slice(0, 15).forEach((d) => {
        const label = d.type === "hutang" ? "ke" : "dari";
        lines.push(formatDate(d.settledAt) + " | " + label + " " + d.person + " | " + formatRupiah(d.amount));
      });

      const totalSettled = settled.reduce((s, d) => s + d.amount, 0);
      lines.push("");
      lines.push("Total dilunasi: *" + formatRupiah(totalSettled) + "*");

      return m.reply(claraWrap("Riwayat Pelunasan", lines.join("\n")));
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "hutang add <nama> | <jumlah> | <keterangan> | <tgl>\n" +
      prefix + "hutang piutang <nama> | <jumlah> | <keterangan> | <tgl>\n" +
      prefix + "hutang list\n" +
      prefix + "hutang info <ID>\n" +
      prefix + "hutang lunas <ID>\n" +
      prefix + "hutang remove <ID>\n" +
      prefix + "hutang total\n" +
      prefix + "hutang history\n\n" +
      "Tanggal format: DD-MM-YYYY (opsional)",
      { title: "Hutang - Menu" }
    );
  } catch (e) {
    console.error("hutang error:", e);
    return m.reply(claraWrap("Hutang", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
