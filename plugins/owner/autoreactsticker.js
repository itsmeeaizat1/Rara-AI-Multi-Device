// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";

const pluginConfig = {
  name: "autoreactsticker",
  alias: ["ars", "autostickerreply", "stickerreact", "setautostiker"],
  category: "owner",
  description: "Auto reply pesan dengan sticker — manual trigger, AI Vision auto-tag, & saveall",
  usage:
    ".autoreactsticker on/off\n" +
    ".autoreactsticker set <trigger> (reply sticker → bind manual)\n" +
    ".autoreactsticker autosave on/off (AI Vision auto-tag)\n" +
    ".autoreactsticker saveall on/off (simpan semua tanpa AI)\n" +
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

/**
 * AI Vision: analisis stiker → return array trigger words
 */
async function aiVisionTagSticker(buffer) {
  const geminiKey = getApiKey("gemini");
  if (!geminiKey) return [];

  try {
    const base64 = buffer.toString("base64");
    const prompt =
      "Lihat stiker WhatsApp ini. Berikan 3-5 kata trigger dalam bahasa Indonesia " +
      "yang cocok untuk stiker ini (kata yang orang biasa ketik di chat yang relate dengan stiker ini). " +
      "Hanya jawab dengan kata-kata dipisah koma, tanpa penjelasan. " +
      "Contoh: wkwk, haha, lucu, pusing, marah, sedih, love, siap, ok";

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { data: base64, mimeType: "image/webp" } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
        }),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const triggers = text
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length >= 2 && t.length <= 20)
      .slice(0, 5);

    return triggers;
  } catch {
    return [];
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

    const autosave = db.setting("autoreactstickerAutosave") || false;
    const saveall = db.setting("autoreactstickerSaveall") || false;

    let txt = "✅ AUTOREACT STICKER DIAKTIFKAN\n\n";
    txt += "Random pool: " + collection.length + " sticker\n";
    txt += "Trigger-based: " + triggers.length + " trigger\n";
    txt += "AI Vision autosave: " + (autosave ? "✅" : "❌") + "\n";
    txt += "Saveall: " + (saveall ? "✅" : "❌") + "\n";
    if (collection.length === 0 && triggers.length === 0) {
      txt += "\n⚠️ Belum ada sticker!\n";
      txt += "Manual: reply sticker + " + m.prefix + "autoreactsticker set <kata>\n";
      txt += "AI Vision: " + m.prefix + "autoreactsticker autosave on\n";
      txt += "Raw collect: " + m.prefix + "autoreactsticker saveall on";
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

  // AUTOSAVE (AI Vision auto-tag): .autoreactsticker autosave on/off
  if (action === "autosave") {
    const subArg = (args[1] || "").toLowerCase();
    if (!subArg || !["on", "off"].includes(subArg)) {
      const status = db.setting("autoreactstickerAutosave") || false;
      const hasGemini = hasApiKey("gemini");
      return m.reply(claraWrap("AutoReactSticker", [
        "AUTOSAVE — AI VISION AUTO-TAG",
        "",
        "Status: " + (status ? "✅ Aktif" : "❌ Nonaktif"),
        "Gemini API: " + (hasGemini ? "✅ Terpasang" : "❌ Belum set (.setkey gemini)"),
        "Koleksi: " + collection.length + " sticker",
        "",
        "Saat ON, bot lihat stiker pakai AI Vision,",
        "auto-assign trigger kata, lalu simpan.",
        "",
        "Set:",
        "1. " + m.prefix + ".autoreactsticker autosave on",
        "2. " + m.prefix + ".autoreactsticker autosave off",
      ].join("\n")));
    }

    if (subArg === "on" && !hasApiKey("gemini")) {
      return m.reply(claraWrap("AutoReactSticker", [
        "⚠️ Gemini API Key belum diset!",
        "",
        "AI Vision butuh Gemini API key.",
        "Set: " + m.prefix + ".setkey gemini <key>",
        "Dapatkan: https://aistudio.google.com/apikey",
      ].join("\n")));
    }

    db.setting("autoreactstickerAutosave", subArg === "on");
    // Kalau autosave on, matikan saveall
    if (subArg === "on") {
      db.setting("autoreactstickerSaveall", false);
    }
    await db.save();
    await m.react("✅");
    return m.reply(claraWrap("AutoReactSticker", [
      subArg === "on"
        ? "✅ AUTOSAVE AI VISION DIAKTIFKAN"
        : "❌ AUTOSAVE AI VISION DINONAKTIFKAN",
      "",
      subArg === "on"
        ? "Bot lihat stiker pakai AI Vision,\nauto-assign trigger, lalu simpen\nSaveall dimatikan (diambil alih AI)"
        : "Bot berhenti auto-tag stiker",
      "",
      "Koleksi: " + collection.length + " sticker",
    ].join("\n")));
  }

  // SAVEALL (raw collect tanpa AI): .autoreactsticker saveall on/off
  if (action === "saveall") {
    const subArg = (args[1] || "").toLowerCase();
    if (!subArg || !["on", "off"].includes(subArg)) {
      const status = db.setting("autoreactstickerSaveall") || false;
      return m.reply(claraWrap("AutoReactSticker", [
        "SAVEALL — RAW COLLECT",
        "",
        "Status: " + (status ? "✅ Aktif" : "❌ Nonaktif"),
        "Koleksi: " + collection.length + " sticker",
        "",
        "Saat ON, bot simpen SEMUA stiker yang",
        "user kirim di grup ke random pool (tanpa AI)",
        "",
        "Set:",
        "1. " + m.prefix + ".autoreactsticker saveall on",
        "2. " + m.prefix + ".autoreactsticker saveall off",
      ].join("\n")));
    }

    db.setting("autoreactstickerSaveall", subArg === "on");
    // Kalau saveall on, matikan autosave
    if (subArg === "on") {
      db.setting("autoreactstickerAutosave", false);
    }
    await db.save();
    await m.react("✅");
    return m.reply(claraWrap("AutoReactSticker", [
      subArg === "on"
        ? "✅ SAVEALL DIAKTIFKAN"
        : "❌ SAVEALL DINONAKTIFKAN",
      "",
      subArg === "on"
        ? "Bot simpen semua stiker ke random pool (tanpa AI)\nAutosave AI Vision dimatikan"
        : "Bot berhenti simpan stiker otomatis",
      "",
      "Koleksi: " + collection.length + " sticker",
    ].join("\n")));
  }

  // SET TRIGGER: reply sticker + .autoreactsticker set <trigger>
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

    let buffer;
    try {
      buffer = m.quoted?.isMedia ? await m.quoted.download() : await m.download();
    } catch (e) {
      return m.reply("Gagal download sticker: " + e.message);
    }

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("AutoReactSticker", "Sticker kosong, coba lagi!"));
    }

    ensureDir();
    const fileLabel = triggerList.length === 1 ? triggerList[0] : triggerList[0] + "_dst";
    const fileName = "sticker_" + fileLabel.replace(/\s+/g, "_") + "_" + Date.now() + ".webp";
    const filePath = path.join(STICKER_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    let added = 0;
    let updated = 0;

    for (const trigger of triggerList) {
      const existingIndex = triggers.findIndex((t) => t.trigger === trigger);
      const newEntry = { trigger, stickerFile: fileName, size: buffer.length };

      if (existingIndex !== -1) {
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

  // DEL TRIGGER
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

  // ADD: reply sticker + .autoreactsticker add (manual random pool)
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

  // DEL: .autoreactsticker del <nomor>
  if (action === "del" || action === "rm") {
    const subArg = (args[1] || "").toLowerCase();

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

    txt += "*Random Pool* (" + collection.length + ")\n";
    if (collection.length === 0) {
      txt += "  Kosong\n";
    } else {
      collection.forEach((s, i) => {
        const src = s.source === "ai-vision" ? " [AI]" : (s.source === "saveall" ? " [RAW]" : "");
        txt += "  " + (i + 1) + ". " + s.file + " (" + (s.size / 1024).toFixed(1) + " KB)" + src + "\n";
      });
    }

    txt += "\n*Trigger-Based* (" + triggers.length + ")\n";
    if (triggers.length === 0) {
      txt += "  Kosong\n";
    } else {
      triggers.forEach((t, i) => {
        const tag = t.source === "ai-vision" ? " [AI]" : "";
        txt += "  " + (i + 1) + ". \"" + t.trigger + "\"" + tag + " → " + t.stickerFile + "\n";
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

  // CLEAR ALL
  if (action === "clear" || action === "reset") {
    for (const entry of collection) {
      const fp = path.join(STICKER_DIR, entry.file);
      if (fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch {}
      }
    }
    for (const entry of triggers) {
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
    db.setting("autoreactstickerAutosave", false);
    db.setting("autoreactstickerSaveall", false);
    await db.save();
    return m.reply(claraWrap("AutoReactSticker", [
      "🗑 SEMUA STICKER & TRIGGER DIHAPUS",
      "",
      "Koleksi & trigger dikosongkan, fitur dimatikan",
    ].join("\n")));
  }

  // STATUS / HELP
  const enabled = db.setting("autoreactstickerEnabled") || false;
  const autosaveStatus = db.setting("autoreactstickerAutosave") || false;
  const saveallStatus = db.setting("autoreactstickerSaveall") || false;
  const privMs = db.setting("autoreactstickerJedaPrivate") ?? 5000;
  const grpMs = db.setting("autoreactstickerJedaGrup") ?? 15000;

  return m.reply(claraWrap("AutoReactSticker", [
    "AUTO REACT STICKER",
    "",
    "Status: " + (enabled ? "✅ Aktif" : "❌ Nonaktif"),
    "AI Vision autosave: " + (autosaveStatus ? "✅ Aktif" : "❌ Nonaktif"),
    "Saveall (raw): " + (saveallStatus ? "✅ Aktif" : "❌ Nonaktif"),
    "Random pool: " + collection.length + " sticker",
    "Trigger-based: " + triggers.length + " trigger",
    "Jeda Private: " + (privMs / 1000).toFixed(1) + " detik",
    "Jeda Grup: " + (grpMs / 1000).toFixed(1) + " detik",
    "",
    "Perintah:",
    "1. " + m.prefix + "autoreactsticker on/off",
    "2. " + m.prefix + "autoreactsticker set <trigger> (reply sticker)",
    "3. " + m.prefix + "autoreactsticker autosave on/off (AI Vision)",
    "4. " + m.prefix + "autoreactsticker saveall on/off (raw collect)",
    "5. " + m.prefix + "autoreactsticker add (reply sticker → random pool)",
    "6. " + m.prefix + "autoreactsticker del <nomor>",
    "7. " + m.prefix + "autoreactsticker deltrigger <kata>",
    "8. " + m.prefix + "autoreactsticker list",
    "9. " + m.prefix + "autoreactsticker jeda <detik>",
    "10. " + m.prefix + "autoreactsticker jedagrup <detik>",
    "11. " + m.prefix + "autoreactsticker clear",
  ].join("\n")));
}

export { pluginConfig as config, handler, aiVisionTagSticker };
