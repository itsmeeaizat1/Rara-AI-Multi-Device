// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoreactsticker",
  alias: ["ars", "autostickerreply", "stickerreact"],
  category: "owner",
  description: "Auto reply pesan grup dengan sticker random dari koleksi",
  usage: ".autoreactsticker on/off\n.autoreactsticker add (reply sticker)\n.autoreactsticker del <nomor>\n.autoreactsticker list\n.autoreactsticker jeda <detik>",
  example: ".autoreactsticker on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const STICKER_DIR = path.join(process.cwd(), "assets", "stickers");

function ensureDir() {
  if (!fs.existsSync(STICKER_DIR)) {
    fs.mkdirSync(STICKER_DIR, { recursive: true });
  }
}

async function handler(m, { sock, args }) {
  if (!m.isOwner) {
    return m.reply(claraWrap("AutoReactSticker", "Fitur ini khusus owner!"));
  }

  const db = getDatabase();
  const action = (args[0] || "").toLowerCase();
  const collection = db.setting("autoreactstickerCollection") || [];

  ensureDir();

  // ON
  if (action === "on") {
    db.setting("autoreactstickerEnabled", true);
    await db.save();
    await m.react("✅");

    let txt = "✅ AUTOREACT STICKER DIAKTIFKAN\n\n";
    txt += "Bot akan auto-reply pesan grup\n";
    txt += "dengan sticker random dari koleksi\n\n";
    txt += "Total sticker: " + collection.length + "\n";
    if (collection.length === 0) {
      txt += "\n⚠️ Belum ada sticker! Tambahkan:\n";
      txt += "Reply sticker + " + m.prefix + "autoreactsticker add";
    }
    return m.reply(claraWrap("AutoReactSticker", txt));
  }

  // OFF
  if (action === "off") {
    db.setting("autoreactstickerEnabled", false);
    await db.save();
    return m.reply(claraWrap("AutoReactSticker", [
      "❌ AUTOREACT STICKER DINONAKTIFKAN",
      "",
      "Bot tidak akan auto-reply sticker",
    ].join("\n")));
  }

  // ADD: reply sticker + .autoreactsticker add
  if (action === "add") {
    const isSticker =
      m.msg?.stickerMessage ||
      (m.quoted && m.quoted.type === "stickerMessage");

    if (!isSticker) {
      return m.reply(claraWrap("AutoReactSticker", [
        "Tidak ada sticker!",
        "",
        "Cara tambah:",
        "1. Reply sebuah sticker",
        "2. Ketik: " + m.prefix + "autoreactsticker add",
      ].join("\n")));
    }

    let buffer;
    try {
      buffer = m.quoted?.isMedia ? await m.quoted.download() : await m.download();
    } catch (e) {
      return m.reply("Gagal download sticker: " + e.message);
    }

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("AutoReactSticker", "Sticker kosong, coba lagi!"));
    }

    const fileName = "sticker_" + Date.now() + ".webp";
    const filePath = path.join(STICKER_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    collection.push({
      file: fileName,
      size: buffer.length,
      added: Date.now(),
    });

    db.setting("autoreactstickerCollection", collection);
    await db.save();
    await m.react("✅");

    return m.reply(claraWrap("AutoReactSticker", [
      "✅ STICKER DITAMBAHKAN",
      "",
      "File: " + fileName,
      "Size: " + (buffer.length / 1024).toFixed(1) + " KB",
      "Total koleksi: " + collection.length,
    ].join("\n")));
  }

  // DEL: .autoreactsticker del <nomor>
  if (action === "del" || action === "rm") {
    const num = parseInt(args[1] || "0");
    if (isNaN(num) || num < 1 || num > collection.length) {
      return m.reply(claraWrap("AutoReactSticker", [
        "Nomor tidak valid!",
        "",
        "Cek list: " + m.prefix + "autoreactsticker list",
      ].join("\n")));
    }

    const idx = num - 1;
    const entry = collection[idx];
    const filePath = path.join(STICKER_DIR, entry.file);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    collection.splice(idx, 1);
    db.setting("autoreactstickerCollection", collection);
    await db.save();

    return m.reply(claraWrap("AutoReactSticker", [
      "🗑 STICKER DIHAPUS",
      "",
      "Nomor: " + num,
      "Sisa: " + collection.length,
    ].join("\n")));
  }

  // LIST
  if (action === "list" || action === "ls") {
    if (collection.length === 0) {
      return m.reply(claraWrap("AutoReactSticker", [
        "Koleksi kosong!",
        "",
        "Tambahkan: reply sticker + " + m.prefix + "autoreactsticker add",
      ].join("\n")));
    }

    let txt = "DAFTAR STICKER (" + collection.length + ")\n\n";
    collection.forEach((s, i) => {
      txt += (i + 1) + ". " + s.file + " (" + (s.size / 1024).toFixed(1) + " KB)\n";
    });
    txt += "\nHapus: " + m.prefix + "autoreactsticker del <nomor>";
    return m.reply(claraWrap("AutoReactSticker", txt));
  }

  // JEDA
  if (action === "jeda" || action === "cooldown") {
    const subArg = (args[1] || "").toLowerCase();

    if (!subArg) {
      const privMs = db.setting("autoreactstickerJedaPrivate") ?? 5000;
      const grpMs = db.setting("autoreactstickerJedaGrup") ?? 15000;
      return m.reply(claraWrap("AutoReactSticker", [
        "JEDA STICKER REPLY",
        "",
        "Private: " + (privMs / 1000).toFixed(1) + " detik",
        "Grup: " + (grpMs / 1000).toFixed(1) + " detik",
        "",
        "Set jeda:",
        "1. " + m.prefix + "autoreactsticker jeda 10",
        "2. " + m.prefix + "autoreactsticker jedagrup 30",
      ].join("\n")));
    }

    const seconds = parseInt(subArg);
    if (isNaN(seconds) || seconds < 3) {
      return m.reply("Jeda minimal 3 detik!\n\n" + m.prefix + "autoreactsticker jeda 10");
    }

    db.setting("autoreactstickerJedaPrivate", seconds * 1000);
    await db.save();
    await m.react("✅");
    return m.reply(claraWrap("AutoReactSticker", [
      "✅ JEDA PRIVATE DISET",
      "",
      "Private: " + seconds + " detik",
      "Grup: " + ((db.setting("autoreactstickerJedaGrup") ?? 15000) / 1000).toFixed(1) + " detik",
    ].join("\n")));
  }

  // JEDA GRUP
  if (action === "jedagrup" || action === "cooldowngrup") {
    const subArg = (args[1] || "").toLowerCase();

    if (!subArg) {
      const grpMs = db.setting("autoreactstickerJedaGrup") ?? 15000;
      return m.reply(claraWrap("AutoReactSticker", [
        "Jeda Grup: " + (grpMs / 1000).toFixed(1) + " detik",
        "",
        "Set: " + m.prefix + "autoreactsticker jedagrup 30",
      ].join("\n")));
    }

    const seconds = parseInt(subArg);
    if (isNaN(seconds) || seconds < 3) {
      return m.reply("Jeda minimal 3 detik!\n\n" + m.prefix + "autoreactsticker jedagrup 30");
    }

    db.setting("autoreactstickerJedaGrup", seconds * 1000);
    await db.save();
    await m.react("✅");
    return m.reply(claraWrap("AutoReactSticker", [
      "✅ JEDA GRUP DISET",
      "",
      "Grup: " + seconds + " detik",
      "Private: " + ((db.setting("autoreactstickerJedaPrivate") ?? 5000) / 1000).toFixed(1) + " detik",
    ].join("\n")));
  }

  // CLEAR ALL
  if (action === "clear" || action === "reset") {
    for (const entry of collection) {
      const fp = path.join(STICKER_DIR, entry.file);
      if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch {}
      }
    }
    db.setting("autoreactstickerCollection", []);
    db.setting("autoreactstickerEnabled", false);
    await db.save();
    return m.reply(claraWrap("AutoReactSticker", [
      "🗑 SEMUA STICKER DIHAPUS",
      "",
      "Koleksi dikosongkan & fitur dimatikan",
    ].join("\n")));
  }

  // STATUS / HELP
  const enabled = db.setting("autoreactstickerEnabled") || false;
  const privMs = db.setting("autoreactstickerJedaPrivate") ?? 5000;
  const grpMs = db.setting("autoreactstickerJedaGrup") ?? 15000;

  return m.reply(claraWrap("AutoReactSticker", [
    "AUTO REACT STICKER",
    "",
    "Status: " + (enabled ? "✅ Aktif" : "❌ Nonaktif"),
    "Koleksi: " + collection.length + " sticker",
    "Jeda Private: " + (privMs / 1000).toFixed(1) + " detik",
    "Jeda Grup: " + (grpMs / 1000).toFixed(1) + " detik",
    "",
    "Perintah:",
    "1. " + m.prefix + "autoreactsticker on/off",
    "2. " + m.prefix + "autoreactsticker add (reply sticker)",
    "3. " + m.prefix + "autoreactsticker del <nomor>",
    "4. " + m.prefix + "autoreactsticker list",
    "5. " + m.prefix + "autoreactsticker jeda <detik>",
    "6. " + m.prefix + "autoreactsticker jedagrup <detik>",
    "7. " + m.prefix + "autoreactsticker clear",
  ].join("\n")));
}

export { pluginConfig as config, handler };
