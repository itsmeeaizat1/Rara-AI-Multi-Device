// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "futureme",
  alias: ["futureme"],
  category: "smart",
  description: "Letter to future self - tulis surat untuk diri di masa depan",
  usage: ".futureme <command>",
  example: ".futureme write 7d Halo diriku di masa depan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const DURATIONS = {
  "1d": 1, "1w": 7, "2w": 14, "1m": 30, "3m": 90, "6m": 180, "1y": 365,
};

function getConfig(db, gid) {
  const all = db.setting("futureme") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("futureme") || {};
  all[gid] = data;
  db.setting("futureme", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (!cfg[m.sender]) {
    cfg[m.sender] = { letters: [], counter: 0 };
  }
  const udata = cfg[m.sender];

  if (sub === "write" || sub === "tulis" || sub === "buat") {
    const duration = (args[2] || "").toLowerCase();
    const text = args.slice(3).join(" ").trim();

    if (!duration || !DURATIONS[duration]) {
      await m.reply(novaWrap("FutureMe", "Format: " + prefix + "futureme write <durasi> <pesan>\nDurasi: 1d, 1w, 2w, 1m, 3m, 6m, 1y\n💡 *Contoh:* " + prefix + "futureme write 1m Semangat ya diriku!"));
      return { handled: true };
    }
    if (!text || text.length < 10) {
      await m.reply(novaWrap("FutureMe", "Pesan minimal 10 karakter. Tulis surat untuk diri kamu di masa depan."));
      return { handled: true };
    }
    if (text.length > 1000) {
      await m.reply(novaWrap("FutureMe", "Maksimal 1000 karakter."));
      return { handled: true };
    }

    udata.counter++;
    const days = DURATIONS[duration];
    const deliverAt = Date.now() + (days * 86400000);
    const deliverDate = new Date(deliverAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });

    udata.letters.push({
      id: udata.counter,
      text,
      days,
      createdAt: Date.now(),
      deliverAt,
      delivered: false,
      createdDate: new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
    });
    saveConfig(db, gid, cfg);

    await m.reply(novaWrap("FutureMe", [
      "Surat disimpan!",
      "",
      "Dari: " + new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      "Sampai: " + deliverDate + " (" + days + " hari lagi)",
      "",
      "Surat akan dikirim ke kamu via DM tepat waktu.",
      "ID: #" + udata.counter,
      "",
      prefix + "futureme list - lihat surat pending",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar" || sub === "pending") {
    const pending = udata.letters.filter(l => !l.delivered);
    if (pending.length === 0) {
      await m.reply(novaWrap("FutureMe", "Tidak ada surat pending.\n" + prefix + "futureme write <durasi> <pesan> untuk buat."));
      return { handled: true };
    }
    const list = pending.map(l => {
      const daysLeft = Math.ceil((l.deliverAt - Date.now()) / 86400000);
      return "#" + l.id + " - " + l.createdDate + " -> " + new Date(l.deliverAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) + " (" + daysLeft + " hari lagi)\n   " + l.text.slice(0, 60) + (l.text.length > 60 ? "..." : "");
    }).join("\n");
    await m.reply(novaWrap("FutureMe - Pending", "Surat pending (" + pending.length + "):\n\n" + list));
    return { handled: true };
  }

  if (sub === "read" || sub === "baca") {
    const delivered = udata.letters.filter(l => l.delivered);
    if (delivered.length === 0) {
      await m.reply(novaWrap("FutureMe", "Belum ada surat yang sudah sampai."));
      return { handled: true };
    }
    const id = parseInt(args[2] || "0", 10);
    const letter = delivered.find(l => l.id === id) || delivered[delivered.length - 1];
    if (!letter) {
      await m.reply(novaWrap("FutureMe", "Surat tidak ditemukan."));
      return { handled: true };
    }
    await m.reply(novaWrap("FutureMe #" + letter.id, [
      "Ditulis: " + letter.createdDate,
      "Sampai: " + new Date(letter.deliverAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      "Durasi: " + letter.days + " hari",
      "",
      letter.text,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "cancel" || sub === "hapus" || sub === "batal") {
    const id = parseInt(args[2] || "0", 10);
    const idx = udata.letters.findIndex(l => l.id === id && !l.delivered);
    if (idx === -1) {
      await m.reply(novaWrap("FutureMe", "Surat tidak ditemukan atau sudah terkirim."));
      return { handled: true };
    }
    udata.letters.splice(idx, 1);
    saveConfig(db, gid, cfg);
    await m.reply(novaWrap("FutureMe", "Surat #" + id + " dibatalkan."));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    const total = udata.letters.length;
    const pending = udata.letters.filter(l => !l.delivered).length;
    const delivered = total - pending;
    await m.reply(novaWrap("FutureMe", [
      "LETTER TO FUTURE SELF",
      "",
      "Total surat: " + total,
      "Pending: " + pending,
      "Terkirim: " + delivered,
      "",
      prefix + "futureme write <durasi> <pesan> - tulis surat",
      prefix + "futureme list - lihat pending",
      prefix + "futureme read [id] - baca surat terkirim",
      prefix + "futureme cancel <id> - batalkan",
      "",
      "Durasi: 1d, 1w, 2w, 1m, 3m, 6m, 1y",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(novaWrap("FutureMe", [
    "LETTER TO FUTURE SELF",
    "",
    prefix + "futureme write <durasi> <pesan> - tulis surat",
    prefix + "futureme list - surat pending",
    prefix + "futureme read [id] - baca surat terkirim",
    prefix + "futureme cancel <id> - batalkan",
    "",
    "Durasi: 1d=1hari, 1w=1minggu, 1m=1bulan, 6m, 1y=1tahun",
    "",
    "Tulis surat untuk diri kamu di masa depan!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
