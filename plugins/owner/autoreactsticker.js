// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoreactsticker",
  alias: ["ars", "autostickerreply", "stickerreact", "setautostiker"],
  category: "owner",
  description: "Auto reply pesan dengan sticker — random koleksi & trigger-based",
  usage:
    ".autoreactsticker on/off\n" +
    ".autoreactsticker add (reply sticker → tambah ke random pool)\n" +
    ".autoreactsticker set <trigger> (reply sticker → bind trigger)\n" +
    ".autoreactsticker del <nomor>\n" +
    ".autoreactsticker deltrigger <trigger>\n" +
    ".autoreactsticker list\n" +
    ".autoreactsticker jeda <detik>",
  example: ".autoreactsticker set yahaha (reply sticker)",
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
  const triggers = db.setting("autoreactstickerTriggers") || [];

  ensureDir();

  // ON
  if (action === "on") {
    db.setting("autoreactstickerEnabled", true);
    await db.save();
    await m.react("✅");

    let txt = "✅ AUTOREACT STICKER DIAKTIFKAN\n\n";
    txt += "Bot akan auto-reply pesan dengan sticker\n\n";
    txt += "Random pool: " + collection.length + " sticker\n";
    txt += "Trigger-based: " + triggers.length + " trigger\n";
    if (collection.length === 0 && triggers.length === 0) {
      txt += "\n⚠️ Belum ada sticker!\n";
      txt += "Tambah: reply sticker + " + m.prefix + "autoreactsticker add\n";
      txt += "Atau set trigger: reply sticker + " + m.prefix + "autoreactsticker set <kata>";
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

  // SET TRIGGER: reply sticker + .autoreactsticker set <trigger1,trigger2,...>
  if (action === "set") {
    const rawTriggers = args.slice(1).join(" ").trim();
    if (!rawTriggers) {
      return m.reply(claraWrap("AutoReactSticker", [
        "Format salah!",
        "",
        "Reply sticker dengan caption:",
        m.prefix + "autoreactsticker set <trigger>",
        "",
        "Contoh:",
        m.prefix + "autoreactsticker set yahaha",
        m.prefix + "autoreactsticker set wkwk,lol,haha",
      ].join("\n")));
    }

    const triggerList = rawTriggers
      .split(/[,;|]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (triggerList.length === 0) {
      return m.reply(claraWrap("AutoReactSticker", "Trigger tidak boleh kosong!"));
    }

    // Cek apakah ada sticker yang di-reply
    const isSticker =
      m.msg?.stickerMessage ||
      (m.quoted && m.quoted.type === "stickerMessage");

    if (!isSticker) {
      let txt = "Tidak ada sticker!\n\nCara set trigger:\n";
      txt += "1. Reply sebuah sticker\n";
      txt += "2. Ketik: " + m.prefix + "autoreactsticker set " + rawTriggers + "\n\n";
      txt += "Trigger yang akan diset: " + triggerList.length + " kata\n";
      triggerList.forEach((t, i) => {
        txt += "  " + (i + 1) + ". " + t + "\n";
      });
      return m.reply(claraWrap("AutoReactSticker", txt));
    }

    // Download sticker
    let buffer;
    try {
      buffer = m.quoted?.isMedia ? await m.quoted.download() : await m.download();
    } catch (e) {
      return m.reply("Gagal download sticker: " + e.message);
    }

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("AutoReactSticker", "Sticker kosong, coba lagi!"));
    }

    // Simpan sticker ke assets/stickers/
    ensureDir();
    const fileLabel = triggerList.length === 1 ? triggerList[0] : triggerList[0] + "_dst";
    const fileName = "sticker_" + fileLabel.replace(/\s+/g, "_") + "_" + Date.now() + ".webp";
    const filePath = path.join(STICKER_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // Simpan ke database — 1 sticker file untuk semua trigger
    let added = 0;
    let updated = 0;

    for (const trigger of triggerList) {
      const existingIndex = triggers.findIndex((t) => t.trigger === trigger);
      const newEntry = { trigger, stickerFile: fileName, size: buffer.length };

      if (existingIndex !== -1) {
        // Update existing — hapus file lama kalau berbeda
        const oldFile = triggers[existingIndex].stickerFile;
        if (oldFile && oldFile !== fileName) {
          const oldPath = path.join(STICKER_DIR, oldFile);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch {}
          }
        }
        triggers[existingIndex] = newEntry;
        updated++;
      } else {
        triggers.push(newEntry);
        added++;
      }
    }

    db.setting("autoreactstickerTriggers", triggers);
    await db.save();
    await m.react("✅");

    let resultTxt = "✅ STICKER TRIGGER DISET\n\n";
    resultTxt += "Sticker: " + fileName + "\n";
    resultTxt += "Size: " + (buffer.length / 1024).toFixed(1) + " KB\n";
    resultTxt += "Triggers (" + triggerList.length + "):\n";
    triggerList.forEach((t, i) => {
      const tag = i < added ? " baru" : (i < added + updated ? " update" : "");
      resultTxt += "  " + (i + 1) + ". *" + t + "*" + tag + "\n";
    });
    resultTxt += "\nTotal triggers: " + triggers.length;

    return m.reply(claraWrap("AutoReactSticker", resultTxt));
  }

  // DEL TRIGGER: .autoreactsticker deltrigger <trigger>
  if (action === "deltrigger" || action === "rmttrigger") {
    const trigger = args.slice(1).join(" ").trim().toLowerCase();
    if (!trigger) {
      return m.reply("Masukkan trigger yang mau dihapus!\n\n" + m.prefix + "autoreactsticker deltrigger <trigger>");
    }

    const index = triggers.findIndex((t) => t.trigger === trigger);
    if (index === -1) {
      return m.reply("Trigger \"" + trigger + "\" tidak ditemukan!");
    }

    const stickerFile = triggers[index].stickerFile;
    if (stickerFile) {
      const sPath = path.join(STICKER_DIR, stickerFile);
      if (fs.existsSync(sPath)) {
        // Cek apakah file dipakai trigger lain
        const sharedCount = triggers.filter((t) => t.stickerFile === stickerFile).length;
        if (sharedCount <= 1) {
          try { fs.unlinkSync(sPath); } catch {}
        }
      }
    }

    triggers.splice(index, 1);
    db.setting("autoreactstickerTriggers", triggers);
    await db.save();

    return m.reply(claraWrap("AutoReactSticker", [
      "🗑 TRIGGER DIHAPUS",
      "",
      "Trigger: " + trigger,
      "Sisa triggers: " + triggers.length,
    ].join("\n")));
  }

  // ADD: reply sticker + .autoreactsticker add (random pool)
  if (action === "add") {
    const isSticker =
      m.msg?.stickerMessage ||
      (m.quoted && m.quoted.type === "stickerMessage");

    if (!isSticker) {
      return m.reply(claraWrap("AutoReactSticker", [
        "Tidak ada sticker!",
        "",
        "Cara tambah ke random pool:",
        "1. Reply sebuah sticker",
        "2. Ketik: " + m.prefix + "autoreactsticker add",
        "",
        "Untuk set trigger (balas kata spesifik):",
        m.prefix + "autoreactsticker set <trigger>",
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
      "✅ STICKER DITAMBAHKAN KE RANDOM POOL",
      "",
      "File: " + fileName,
      "Size: " + (buffer.length / 1024).toFixed(1) + " KB",
      "Total random pool: " + collection.length,
    ].join("\n")));
  }

  // DEL: .autoreactsticker del <nomor> (hapus dari random pool)
  if (action === "del" || action === "rm") {
    const subArg = (args[1] || "").toLowerCase();

    // Kalau "trigger" ikut, redirect ke deltrigger
    if (subArg === "trigger" && args[2]) {
      const trigger = args.slice(2).join(" ").trim().toLowerCase();
      const index = triggers.findIndex((t) => t.trigger === trigger);
      if (index === -1) {
        return m.reply("Trigger \"" + trigger + "\" tidak ditemukan!");
      }
      const stickerFile = triggers[index].stickerFile;
      if (stickerFile) {
        const sPath = path.join(STICKER_DIR, stickerFile);
        if (fs.existsSync(sPath)) {
          const sharedCount = triggers.filter((t) => t.stickerFile === stickerFile).length;
          if (sharedCount <= 1) {
            try { fs.unlinkSync(sPath); } catch {}
          }
        }
      }
      triggers.splice(index, 1);
      db.setting("autoreactstickerTriggers", triggers);
      await db.save();
      return m.reply(claraWrap("AutoReactSticker", [
        "🗑 TRIGGER DIHAPUS",
        "",
        "Trigger: " + trigger,
        "Sisa: " + triggers.length,
      ].join("\n")));
    }

    // Hapus dari random pool by nomor
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
      "🗑 STICKER DIHAPUS (random pool)",
      "",
      "Nomor: " + num,
      "Sisa: " + collection.length,
    ].join("\n")));
  }

  // LIST
  if (action === "list" || action === "ls") {
    let txt = "AUTOREACT STICKER\n\n";

    // Random pool
    txt += "*Random Pool* (" + collection.length + ")\n";
    if (collection.length === 0) {
      txt += "  Kosong\n";
    } else {
      collection.forEach((s, i) => {
        txt += "  " + (i + 1) + ". " + s.file + " (" + (s.size / 1024).toFixed(1) + " KB)\n";
      });
    }

    // Triggers
    txt += "\n*Trigger-Based* (" + triggers.length + ")\n";
    if (triggers.length === 0) {
      txt += "  Kosong\n";
    } else {
      triggers.forEach((t, i) => {
        txt += "  " + (i + 1) + ". \"" + t.trigger + "\" → " + t.stickerFile + "\n";
      });
    }

    txt += "\nHapus random: " + m.prefix + "autoreactsticker del <nomor>\n";
    txt += "Hapus trigger: " + m.prefix + "autoreactsticker deltrigger <kata>";

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

  // COLLECT: auto-koleksi semua sticker di grup
  if (action === "autosave" || action === "autosave_favorit") {
    const subArg = (args[1] || "").toLowerCase();
    if (!subArg || !["on", "off"].includes(subArg)) {
      const collectStatus = db.setting("autoreactstickerAutosave") || false;
      return m.reply(claraWrap("AutoReactSticker", [
        "AUTOSAVE FAVORIT STIKER",
        "",
        "Status: " + (collectStatus ? "✅ Aktif" : "❌ Nonaktif"),
        "Koleksi saat ini: " + collection.length + " sticker",
        "",
        "Saat ON, bot otomatis simpan stiker",
        "baru yang user kirim di grup",
        "",
        "Set:",
        "1. " + m.prefix + ".autoreactsticker autosave on",
        "2. " + m.prefix + ".autoreactsticker autosave off",
      ].join("\n")));
    }
    db.setting("autoreactstickerAutosave", subArg === "on");
    await db.save();
    await m.react("✅");
    return m.reply(claraWrap("AutoReactSticker", [
      subArg === "on" ? "✅ AUTOSAVE FAVORIT DIAKTIFKAN" : "❌ AUTOSAVE FAVORIT DINONAKTIFKAN",
      "",
      subArg === "on" ? "Bot otomatis simpan stiker baru yg dikirim di grup" : "Bot berhenti simpan stiker otomatis",
      "Koleksi saat ini: " + collection.length + " sticker",
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
    for (const entry of triggers) {
      // Hanya hapus file yang tidak shared
      const sharedCount = triggers.filter((t) => t.stickerFile === entry.stickerFile).length;
      if (sharedCount <= 1) {
        const fp = path.join(STICKER_DIR, entry.stickerFile);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch {}
        }
      }
    }
    db.setting("autoreactstickerCollection", []);
    db.setting("autoreactstickerTriggers", []);
    db.setting("autoreactstickerEnabled", false);
    await db.save();
    return m.reply(claraWrap("AutoReactSticker", [
      "🗑 SEMUA STICKER & TRIGGER DIHAPUS",
      "",
      "Koleksi & trigger dikosongkan, fitur dimatikan",
    ].join("\n")));
  }

  // STATUS / HELP
  const enabled = db.setting("autoreactstickerEnabled") || false;
  const privMs = db.setting("autoreactstickerJedaPrivate") ?? 5000;
  const grpMs = db.setting("autoreactstickerJedaGrup") ?? 15000;

  const collectStatus = db.setting("autoreactstickerAutosave") || false;
  return m.reply(claraWrap("AutoReactSticker", [
    "AUTO REACT STICKER",
    "",
    "Status: " + (enabled ? "✅ Aktif" : "❌ Nonaktif"),
    "Autosave: " + (collectStatus ? "✅ Aktif" : "❌ Nonaktif"),
    "Random pool: " + collection.length + " sticker",
    "Trigger-based: " + triggers.length + " trigger",
    "Jeda Private: " + (privMs / 1000).toFixed(1) + " detik",
    "Jeda Grup: " + (grpMs / 1000).toFixed(1) + " detik",
    "",
    "Perintah:",
    "1. " + m.prefix + "autoreactsticker on/off",
    "2. " + m.prefix + ".autoreactsticker autosave on/off",
    "3. " + m.prefix + "autoreactsticker add (reply sticker → random pool)",
    "4. " + m.prefix + "autoreactsticker set <trigger> (reply sticker)",
    "5. " + m.prefix + "autoreactsticker del <nomor>",
    "6. " + m.prefix + "autoreactsticker deltrigger <kata>",
    "7. " + m.prefix + "autoreactsticker list",
    "8. " + m.prefix + "autoreactsticker jeda <detik>",
    "9. " + m.prefix + "autoreactsticker jedagrup <detik>",
    "10. " + m.prefix + "autoreactsticker clear",
  ].join("\n")));
}

export { pluginConfig as config, handler };
