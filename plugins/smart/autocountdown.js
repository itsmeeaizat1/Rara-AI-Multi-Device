// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autocountdown",
  alias: ["autocountdown"],
  category: "smart",
  description: "Auto countdown event - notify H-7, H-3, H-1, H-day",
  usage: ".autocountdown <command>",
  example: ".autocountdown add Reuni Akbar 2026-12-20",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const NOTIFY_DAYS = [7, 3, 1, 0];

function getConfig(db, gid) {
  const all = db.setting("autocountdown") || {};
  return all[gid] || { events: [], notified: {} };
}

function saveConfig(db, gid, data) {
  const all = db.setting("autocountdown") || {};
  all[gid] = data;
  db.setting("autocountdown", all);
  db.save();
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00+07:00");
  const now = new Date();
  return Math.ceil((target - now) / 86400000);
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "add" || sub === "tambah") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Auto Countdown", "Khusus owner."));
      return { handled: true };
    }
    const dateStr = (args[args.length - 1] || "").trim();
    const name = args.slice(2, -1).join(" ").trim();
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      await m.reply(novaWrap("Auto Countdown", "Format: " + prefix + "autocountdown add <nama> <YYYY-MM-DD>\n💡 *Contoh:* " + prefix + "autocountdown add Reuni Akbar 2026-12-20"));
      return { handled: true };
    }
    cfg.events.push({ name, date: dateStr, id: Date.now(), addedBy: m.sender });
    if (!cfg.notified[gid]) cfg.notified = {};
    saveConfig(db, gid, cfg);
    const days = daysUntil(dateStr);
    await m.reply(novaWrap("Auto Countdown", [
      "Event ditambahkan!",
      "Nama: " + name,
      "Tanggal: " + dateStr,
      "Hari lagi: " + (days > 0 ? days : "sudah lewat"),
      "",
      "Auto-notify: H-7, H-3, H-1, H-day",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "del" || sub === "hapus") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Auto Countdown", "Khusus owner."));
      return { handled: true };
    }
    const idx = parseInt(args[2] || "0", 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= cfg.events.length) {
      await m.reply(novaError("AutoCountdown", "Nomor gak valid nih"));
      return { handled: true };
    }
    const removed = cfg.events.splice(idx, 1)[0];
    saveConfig(db, gid, cfg);
    await m.reply(novaWrap("Auto Countdown", "Event dihapus: " + removed.name));
    return { handled: true };
  }

  if (sub === "list" || sub === "cek" || !sub) {
    if (cfg.events.length === 0) {
      await m.reply(novaWrap("Auto Countdown", [
        "Belum ada event.",
        "",
        prefix + "autocountdown add <nama> <YYYY-MM-DD>",
        prefix + "autocountdown list",
        prefix + "autocountdown del <nomor>",
      ].join("\n")));
      return { handled: true };
    }
    const list = cfg.events.map((e, i) => {
      const days = daysUntil(e.date);
      const status = days > 0 ? days + " hari lagi" : days === 0 ? "HARI INI!" : "lewat";
      return (i + 1) + ". " + e.name + "\n   " + e.date + " (" + status + ")";
    }).join("\n\n");
    await m.reply(novaWrap("Auto Countdown", "Event list:\n\n" + list));
    return { handled: true };
  }

  if (sub === "test" || sub === "ceknotify") {
    if (!m.isOwner) {
      await m.reply(novaWrap("Auto Countdown", "Khusus owner."));
      return { handled: true };
    }
    if (cfg.events.length === 0) {
      await m.reply(novaWrap("Auto Countdown", "Belum ada event."));
      return { handled: true };
    }
    const e = cfg.events[0];
    const days = daysUntil(e.date);
    await m.reply(novaWrap("Auto Countdown Test", "Event: " + e.name + "\nTanggal: " + e.date + "\nHari lagi: " + (days > 0 ? days : days === 0 ? "HARI INI" : "lewat") + "\n\nNotify akan kirim di: H-7, H-3, H-1, H-day"));
    return { handled: true };
  }

  await m.reply(novaWrap("Auto Countdown", "Ketik " + prefix + "autocountdown list."));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig, daysUntil, NOTIFY_DAYS };
