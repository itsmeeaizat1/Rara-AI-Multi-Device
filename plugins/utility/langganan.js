// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "langganan",
  alias: ["langganan", "subscription", "subtrack", "langganantrack"],
  category: "utility",
  description: "Tracker langganan & subscription - catat, pantau, reminder jatuh tempo",
  usage: ".langganan <add/list/info/edit/remove/total/markpaid/history>",
  example: ".langganan add Netflix | 186000 | monthly | 15",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Generate short ID
function genId() {
  return "SUB-" + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function formatRupiah(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function formatDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

// Parse cycle: weekly, monthly, yearly
function parseCycle(str) {
  const c = str.toLowerCase().trim();
  if (["weekly", "minggu", "mingguan", "7d"].includes(c)) return "weekly";
  if (["monthly", "bulan", "bulanan", "30d", "1m"].includes(c)) return "monthly";
  if (["yearly", "tahun", "tahunan", "365d", "1y"].includes(c)) return "yearly";
  return null;
}

function cycleDays(cycle) {
  if (cycle === "weekly") return 7;
  if (cycle === "monthly") return 30;
  if (cycle === "yearly") return 365;
  return 30;
}

function cycleLabel(cycle) {
  if (cycle === "weekly") return "Mingguan";
  if (cycle === "monthly") return "Bulanan";
  if (cycle === "yearly") return "Tahunan";
  return cycle;
}

// Calculate next due date from a base date and cycle
function nextDueDate(baseTs, cycle) {
  const days = cycleDays(cycle);
  const now = Date.now();
  let next = baseTs;
  while (next < now) {
    next += days * 86400000;
  }
  return next;
}

// Days until due
function daysUntil(ts) {
  return Math.ceil((ts - Date.now()) / 86400000);
}

// Get user subscriptions
function getSubs(db, sender) {
  const all = db.setting("subscriptions") || {};
  return all[sender] || [];
}

// Save user subscriptions
function saveSubs(db, sender, subs) {
  const all = db.setting("subscriptions") || {};
  all[sender] = subs;
  db.setting("subscriptions", all);
  db.save();
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const sender = m.sender || m.key?.participant || "";

    // --- ADD ---
    if (action === "add") {
      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 3) {
        return m.reply(
          prefix + "langganan add <nama> | <harga> | <cycle> | <tgl_jatuh_tempo>\n\n" +
          "Cycle: weekly / monthly / yearly\n" +
          "tgl_jatuh_tempo: tanggal 1-31 (untuk monthly) atau DD-MM (untuk yearly)\n\n" +
          "Contoh:\n" +
          prefix + "langganan add Netflix | 186000 | monthly | 15\n" +
          prefix + "langganan add Spotify | 27000 | monthly | 5\n" +
          prefix + "langganan add Domain | 350000 | yearly | 01-03",
          { title: "Langganan - Add" }
        );
      }

      const [name, priceStr, cycleStr, dueStr] = parts;
      const price = parseInt(priceStr.replace(/[^\d]/g, ""));
      if (isNaN(price) || price < 0) {
        return m.reply(claraWrap("Langganan", "Harga tidak valid! Minimal Rp0"));
      }

      const cycle = parseCycle(cycleStr);
      if (!cycle) {
        return m.reply(claraWrap("Langganan", "Cycle tidak valid! Pilih: weekly / monthly / yearly"));
      }

      // Parse due date
      let baseTs = Date.now();
      if (dueStr) {
        if (cycle === "monthly") {
          const day = parseInt(dueStr);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            const now = new Date();
            let d = new Date(now.getFullYear(), now.getMonth(), day);
            if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
            baseTs = d.getTime();
          }
        } else if (cycle === "yearly") {
          const dm = dueStr.split("-");
          if (dm.length === 2) {
            const day = parseInt(dm[0]);
            const month = parseInt(dm[1]) - 1;
            if (!isNaN(day) && !isNaN(month)) {
              const now = new Date();
              let d = new Date(now.getFullYear(), month, day);
              if (d < now) d = new Date(now.getFullYear() + 1, month, day);
              baseTs = d.getTime();
            }
          }
        } else if (cycle === "weekly") {
          // For weekly, just use today + 7 days
          baseTs = Date.now() + 7 * 86400000;
        }
      }

      const subs = getSubs(db, sender);
      const subId = genId();
      const sub = {
        id: subId,
        name,
        price,
        cycle,
        baseDate: baseTs,
        nextDue: nextDueDate(baseTs, cycle),
        paid: false,
        createdAt: Date.now(),
        history: [],
      };

      subs.push(sub);
      saveSubs(db, sender, subs);

      await m.react("🐣");
      return m.reply(claraWrap("Langganan",
        "Langganan ditambahkan!\n" +
        "Nama: *" + name + "*\n" +
        "Harga: *" + formatRupiah(price) + " / " + cycleLabel(cycle) + "*\n" +
        "Jatuh tempo: " + formatDate(sub.nextDue) + "\n" +
        "ID: `" + subId + "`"
      ));
    }

    // --- LIST ---
    if (action === "list") {
      const subs = getSubs(db, sender);
      if (subs.length === 0) {
        return m.reply(claraWrap("Langganan", "Belum ada langganan.\nTambah: " + prefix + "langganan add <nama> | <harga> | <cycle> | <tgl>"));
      }

      let lines = [];
      for (const sub of subs) {
        const next = nextDueDate(sub.baseDate, sub.cycle);
        const daysLeft = daysUntil(next);
        const status = sub.paid ? "Lunas" : daysLeft <= 0 ? "JATUH TEMPO" : daysLeft + " hari";
        const priceStr = formatRupiah(sub.price) + "/" + cycleLabel(sub.cycle).toLowerCase();
        lines.push(sub.id + " | " + sub.name + " | " + priceStr + " | " + formatDate(next) + " | " + status);
      }

      return m.reply(claraWrap("Daftar Langganan", lines.join("\n")));
    }

    // --- INFO ---
    if (action === "info") {
      const subId = args[1]?.toUpperCase();
      if (!subId) {
        return m.reply(claraWrap("Langganan", "Format: " + prefix + "langganan info <ID>"));
      }

      const subs = getSubs(db, sender);
      const sub = subs.find((s) => s.id === subId);
      if (!sub) {
        return m.reply(claraWrap("Langganan", "Langganan `" + subId + "` tidak ditemukan"));
      }

      const next = nextDueDate(sub.baseDate, sub.cycle);
      const daysLeft = daysUntil(next);
      const status = sub.paid ? "Lunas" : daysLeft <= 0 ? "JATUH TEMPO" : daysLeft + " hari lagi";

      let lines = [
        "Nama: *" + sub.name + "*",
        "ID: `" + sub.id + "`",
        "Harga: " + formatRupiah(sub.price) + " / " + cycleLabel(sub.cycle).toLowerCase(),
        "Jatuh Tempo: " + formatDate(next),
        "Status: " + status,
        "Dibuat: " + formatDate(sub.createdAt),
      ];

      if (sub.history.length > 0) {
        lines.push("");
        lines.push("Riwayat Pembayaran:");
        sub.history.slice(-5).forEach((h) => {
          lines.push(formatDate(h.date) + " - " + formatRupiah(h.amount) + " - " + (h.status || "paid"));
        });
      }

      return m.reply(claraWrap("Info Langganan", lines.join("\n")));
    }

    // --- EDIT ---
    if (action === "edit") {
      const subId = args[1]?.toUpperCase();
      if (!subId) {
        return m.reply(claraWrap("Langganan", "Format: " + prefix + "langganan edit <ID> | <field> | <nilai>\nField: name, price, cycle"));
      }

      const subs = getSubs(db, sender);
      const sub = subs.find((s) => s.id === subId);
      if (!sub) {
        return m.reply(claraWrap("Langganan", "Langganan `" + subId + "` tidak ditemukan"));
      }

      const editParts = args.slice(2).join(" ").split("|").map((s) => s.trim());
      if (editParts.length < 2) {
        return m.reply(claraWrap("Langganan", "Format: " + prefix + "langganan edit <ID> | <field> | <nilai>\nField: name, price, cycle"));
      }

      const [field, value] = editParts;
      if (field === "name") {
        sub.name = value;
      } else if (field === "price") {
        const newPrice = parseInt(value.replace(/[^\d]/g, ""));
        if (isNaN(newPrice)) return m.reply(claraWrap("Langganan", "Harga tidak valid"));
        sub.price = newPrice;
      } else if (field === "cycle") {
        const newCycle = parseCycle(value);
        if (!newCycle) return m.reply(claraWrap("Langganan", "Cycle tidak valid! Pilih: weekly / monthly / yearly"));
        sub.cycle = newCycle;
        sub.nextDue = nextDueDate(sub.baseDate, newCycle);
      } else {
        return m.reply(claraWrap("Langganan", "Field tidak valid! Pilih: name, price, cycle"));
      }

      saveSubs(db, sender, subs);
      await m.react("🐣");
      return m.reply(claraWrap("Langganan", "Langganan *" + sub.name + "* diperbarui!\nField: " + field + " -> " + value));
    }

    // --- REMOVE ---
    if (action === "remove") {
      const subId = args[1]?.toUpperCase();
      if (!subId) {
        return m.reply(claraWrap("Langganan", "Format: " + prefix + "langganan remove <ID>"));
      }

      const subs = getSubs(db, sender);
      const idx = subs.findIndex((s) => s.id === subId);
      if (idx === -1) {
        return m.reply(claraWrap("Langganan", "Langganan `" + subId + "` tidak ditemukan"));
      }

      const removed = subs[idx];
      subs.splice(idx, 1);
      saveSubs(db, sender, subs);

      await m.react("🐣");
      return m.reply(claraWrap("Langganan", "Langganan *" + removed.name + "* (`" + subId + "`) dihapus"));
    }

    // --- MARKPAID ---
    if (action === "markpaid") {
      const subId = args[1]?.toUpperCase();
      if (!subId) {
        return m.reply(claraWrap("Langganan", "Format: " + prefix + "langganan markpaid <ID>"));
      }

      const subs = getSubs(db, sender);
      const sub = subs.find((s) => s.id === subId);
      if (!sub) {
        return m.reply(claraWrap("Langganan", "Langganan `" + subId + "` tidak ditemukan"));
      }

      // Record payment in history
      sub.history.push({
        date: Date.now(),
        amount: sub.price,
        status: "paid",
      });

      // Advance to next cycle
      sub.baseDate = sub.baseDate + cycleDays(sub.cycle) * 86400000;
      sub.paid = true;
      sub.nextDue = nextDueDate(sub.baseDate, sub.cycle);

      // Reset paid status for next cycle
      sub.paid = false;

      saveSubs(db, sender, subs);

      await m.react("🐣");
      return m.reply(claraWrap("Langganan",
        "Pembayaran tercatat!\n" +
        "Nama: *" + sub.name + "*\n" +
        "Jumlah: *" + formatRupiah(sub.price) + "*\n" +
        "Jatuh tempo berikutnya: " + formatDate(sub.nextDue)
      ));
    }

    // --- TOTAL ---
    if (action === "total") {
      const subs = getSubs(db, sender);
      if (subs.length === 0) {
        return m.reply(claraWrap("Langganan", "Belum ada langganan."));
      }

      let monthlyTotal = 0;
      let yearlyTotal = 0;
      let weeklyTotal = 0;
      let count = subs.length;

      for (const sub of subs) {
        if (sub.cycle === "weekly") {
          weeklyTotal += sub.price;
          monthlyTotal += sub.price * 4.33;
          yearlyTotal += sub.price * 52;
        } else if (sub.cycle === "monthly") {
          monthlyTotal += sub.price;
          yearlyTotal += sub.price * 12;
        } else if (sub.cycle === "yearly") {
          yearlyTotal += sub.price;
          monthlyTotal += sub.price / 12;
        }
      }

      let lines = [
        "Total Langganan: " + count + " item",
        "",
        "Pengeluaran / Minggu: *" + formatRupiah(Math.round(weeklyTotal)) + "*",
        "Pengeluaran / Bulan: *" + formatRupiah(Math.round(monthlyTotal)) + "*",
        "Pengeluaran / Tahun: *" + formatRupiah(Math.round(yearlyTotal)) + "*",
      ];

      // List items sorted by price
      const sorted = [...subs].sort((a, b) => b.price - a.price);
      lines.push("");
      lines.push("Termahal:");
      sorted.slice(0, 3).forEach((s, i) => {
        lines.push((i + 1) + ". " + s.name + " - " + formatRupiah(s.price));
      });

      return m.reply(claraWrap("Total Langganan", lines.join("\n")));
    }

    // --- HISTORY ---
    if (action === "history") {
      const subId = args[1]?.toUpperCase();
      const subs = getSubs(db, sender);

      if (subId) {
        // History for specific subscription
        const sub = subs.find((s) => s.id === subId);
        if (!sub) {
          return m.reply(claraWrap("Langganan", "Langganan `" + subId + "` tidak ditemukan"));
        }
        if (sub.history.length === 0) {
          return m.reply(claraWrap("Langganan", "Belum ada riwayat pembayaran untuk *" + sub.name + "*"));
        }

        let lines = [];
        sub.history.forEach((h, i) => {
          lines.push(formatDate(h.date) + " | " + formatRupiah(h.amount) + " | " + (h.status || "paid"));
        });

        let totalPaid = sub.history.reduce((sum, h) => sum + h.amount, 0);
        lines.push("");
        lines.push("Total dibayar: *" + formatRupiah(totalPaid) + "*");

        return m.reply(claraWrap("Riwayat: " + sub.name, lines.join("\n")));
      } else {
        // History for all subscriptions
        let allPayments = [];
        for (const sub of subs) {
          for (const h of sub.history) {
            allPayments.push({ ...h, name: sub.name, id: sub.id });
          }
        }

        if (allPayments.length === 0) {
          return m.reply(claraWrap("Langganan", "Belum ada riwayat pembayaran. Tandai bayar dengan: " + prefix + "langganan markpaid <ID>"));
        }

        allPayments.sort((a, b) => b.date - a.date);
        let lines = [];
        allPayments.slice(0, 15).forEach((h) => {
          lines.push(formatDate(h.date) + " | " + h.name + " | " + formatRupiah(h.amount));
        });

        let totalPaid = allPayments.reduce((sum, h) => sum + h.amount, 0);
        lines.push("");
        lines.push("Total dibayar: *" + formatRupiah(totalPaid) + "*");

        return m.reply(claraWrap("Riwayat Pembayaran", lines.join("\n")));
      }
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "langganan add <nama> | <harga> | <cycle> | <tgl>\n" +
      prefix + "langganan list\n" +
      prefix + "langganan info <ID>\n" +
      prefix + "langganan edit <ID> | <field> | <nilai>\n" +
      prefix + "langganan remove <ID>\n" +
      prefix + "langganan markpaid <ID>\n" +
      prefix + "langganan total\n" +
      prefix + "langganan history [ID]\n\n" +
      "Cycle: weekly / monthly / yearly\n" +
      "Field edit: name, price, cycle",
      { title: "Langganan - Menu" }
    );
  } catch (e) {
    console.error("langganan error:", e);
    return m.reply(claraWrap("Langganan", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
