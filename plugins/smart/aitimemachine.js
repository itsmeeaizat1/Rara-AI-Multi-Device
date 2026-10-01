// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aitimemachine",
  alias: ["aitimemachine", "timemachine"],
  category: "smart",
  description: "On this day - inget momen penting grup",
  usage: ".timemachine <command>",
  example: ".timemachine add 100 member",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getTimeline(db, gid) {
  const all = db.setting("aitimemachine") || {};
  return all[gid] || [];
}

function saveTimeline(db, gid, events) {
  const all = db.setting("aitimemachine") || {};
  all[gid] = events;
  db.setting("aitimemachine", all);
  db.save();
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function daysSince(ts) {
  const diff = Date.now() - ts;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== ADD
  if (sub === "add" || sub === "tambah") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(raraWrap("Time Machine", "Khusus admin/owner."));
      return { handled: true };
    }
    const event = args.slice(2).join(" ").trim();
    if (!event) {
      await m.reply(raraWrap("Time Machine", "Format: " + prefix + "timemachine add <momen>\n💡 *Contoh:* " + prefix + "timemachine add Grup capai 100 member"));
      return { handled: true };
    }
    const events = getTimeline(db, gid);
    events.push({ text: event, ts: Date.now(), by: m.sender });
    saveTimeline(db, gid, events);
    await m.reply(raraWrap("Time Machine", "Momen tersimpan: " + event + "\nTanggal: " + formatDate(Date.now())));
    return { handled: true };
  }

  // ==================== REMEMBER (show all)
  if (sub === "list" || sub === "remember" || sub === "all") {
    const events = getTimeline(db, gid);
    if (events.length === 0) {
      await m.reply(raraWrap("Time Machine", "Belum ada momen tersimpan. Ketik " + prefix + "timemachine add <momen>."));
      return { handled: true };
    }
    const sorted = events.sort((a, b) => b.ts - a.ts);
    const list = sorted.map((e, i) => {
      const hari = daysSince(e.ts);
      return (i + 1) + ". " + formatDate(e.ts) + " (" + hari + " hari lalu)\n   " + e.text;
    }).join("\n\n");
    await m.reply(raraWrap("Time Machine", "Timeline Grup:\n\n" + list));
    return { handled: true };
  }

  // ==================== ON THIS DAY
  if (sub === "today" || sub === "hariini" || !sub) {
    const events = getTimeline(db, gid);
    if (events.length === 0) {
      await m.reply(raraWrap("Time Machine", [
        "Belum ada momen tersimpan.",
        "",
        "Cara pakai:",
        prefix + "timemachine add <momen>",
        prefix + "timemachine list - lihat semua",
        prefix + "timemachine today - hari ini",
      ].join("\n")));
      return { handled: true };
    }
    const now = new Date();
    const todayEvents = events.filter(e => {
      const d = new Date(e.ts);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() !== now.getFullYear();
    });
    if (todayEvents.length === 0) {
      const recent = events.sort((a, b) => b.ts - a.ts).slice(0, 3);
      const list = recent.map(e => formatDate(e.ts) + " (" + daysSince(e.ts) + " hari lalu): " + e.text).join("\n");
      await m.reply(raraWrap("Time Machine", "Tidak ada momen di tanggal ini tahun lalu.\n\nMomen terbaru:\n" + list));
      return { handled: true };
    }
    const list = todayEvents.map(e => formatDate(e.ts) + ": " + e.text).join("\n");
    await m.reply(raraWrap("Time Machine - On This Day", "Pada hari ini tahun lalu:\n" + list));
    return { handled: true };
  }

  // ==================== DELETE
  if (sub === "hapus" || sub === "delete") {
    if (!m.isAdmin && !m.isOwner) {
      await m.reply(raraWrap("Time Machine", "Khusus admin/owner."));
      return { handled: true };
    }
    const idx = parseInt(args[2] || "0", 10) - 1;
    const events = getTimeline(db, gid);
    if (isNaN(idx) || idx < 0 || idx >= events.length) {
      await m.reply(raraError("AITimeMachine", "Nomor gak valid nih! Ketik " + prefix + "timemachine list"));
      return { handled: true };
    }
    const removed = events.splice(idx, 1)[0];
    saveTimeline(db, gid, events);
    await m.reply(raraWrap("Time Machine", "Momen dihapus: " + removed.text));
    return { handled: true };
  }

  await m.reply(raraWrap("Time Machine", "Ketik " + prefix + "timemachine list atau " + prefix + "timemachine today."));
  return { handled: true };
}

export { pluginConfig as config, handler };
