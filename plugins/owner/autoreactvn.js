// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoreactvn",
  alias: ["arvn", "autovn", "vnreply"],
  category: "owner",
  description: "Auto reply pesan dengan voice note dari folder assets/vn",
  usage: ".autoreactvn on/off\n.autoreactvn set <trigger1,trigger2,...> (reply VN)\n.autoreactvn del <trigger>\n.autoreactvn list\n.autoreactvn jeda <detik>\n.autoreactvn jedagrup <detik>",
  example: ".autoreactvn set ga mungkin,bohong,emang,serius,beneran",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VN_DIR = path.join(process.cwd(), "assets", "vn");

function ensureVnDir() {
  if (!fs.existsSync(VN_DIR)) {
    fs.mkdirSync(VN_DIR, { recursive: true });
  }
}

async function handler(m, { sock, args }) {
  if (!m.isOwner) {
    return m.reply(claraWrap("autoreactvn", "Fitur ini khusus owner!"));
  }

  const db = getDatabase();
  const action = (args[0] || "").toLowerCase();
  const triggers = db.setting("autoreactvnTriggers") || [];

  // ON
  if (action === "on") {
    db.setting("autoreactvnEnabled", true);

    // Auto-seed default triggers pakai VN yang udah ada di assets/vn/
    // kalau belum ada trigger sama sekali (biar gak "kirim on tapi gak ada yang kebalas")
    let seeded = 0;
    if (triggers.length === 0) {
      const defaultMap = [
        { file: "vn_hai_hai_juga.mp3", words: ["hai", "halo", "hallo", "hi"] },
        { file: "vn_masa_sih_kak.mp3", words: ["masa sih", "yakin", "serius", "beneran", "emang"] },
        { file: "vn_daftar_dulu_kak.mp3", words: ["daftar", "cara daftar", "gimana daftar"] },
      ];
      for (const entry of defaultMap) {
        const vnPath = path.join(VN_DIR, entry.file);
        if (!fs.existsSync(vnPath)) continue;
        const size = fs.statSync(vnPath).size;
        for (const word of entry.words) {
          if (!triggers.find(t => t.trigger === word)) {
            triggers.push({ trigger: word, vnFile: entry.file, size });
            seeded++;
          }
        }
      }
      if (seeded > 0) db.setting("autoreactvnTriggers", triggers);
    }

    await db.save();
    await m.react("🐣");

    let onTxt = "✅ AUTOREACTVN DIAKTIFKAN\n\nBot akan auto-reply dengan VN\nsaat user kirim kata trigger";
    if (seeded > 0) {
      onTxt += "\n\nTrigger default otomatis diset (" + seeded + "):\n";
      onTxt += triggers.slice(0, seeded).map((t, i) => "  " + (i + 1) + ". " + t.trigger).join("\n");
      onTxt += "\n\nCek: " + m.prefix + "autoreactvn list";
    }

    return m.reply(claraWrap("AutoReactVN", onTxt));
  }

  // OFF
  if (action === "off") {
    db.setting("autoreactvnEnabled", false);
    await db.save();
    return m.reply(
      claraWrap("AutoReactVN", [
        "❌ AUTOREACTVN DINONAKTIFKAN",
        "",
        "Bot tidak akan auto-reply VN",
      ].join("\n"))
    );
  }

  // SET: .autoreactvn set <trigger1,trigger2,...> (reply VN)
  if (action === "set") {
    const rawTriggers = args.slice(1).join(" ").trim();
    if (!rawTriggers) {
      return m.reply(
        "Format salah!\n\nKirim/reply VN dengan caption:\n" +
        "```" + m.prefix + "autoreactvn set <trigger>```\n\n" +
        "Contoh:\n" +
        "```" + m.prefix + "autoreactvn set hai```\n" +
        "```" + m.prefix + "autoreactvn set ga mungkin,bohong,emang```"
      );
    }

    // Parse triggers — support koma, titik koma, atau pipe
    const triggerList = rawTriggers
      .split(/[,;|]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    if (triggerList.length === 0) {
      return m.reply(claraWrap("autoreactvn", "Trigger tidak boleh kosong!"));
    }

    // Cek apakah ada media audio (VN)
    const isAudio =
      m.msg?.audioMessage ||
      m.msg?.pttMessage ||
      (m.quoted && (m.quoted.type === "audioMessage" || m.quoted.type === "pttMessage"));

    if (!isAudio) {
      let txt = "Tidak ada voice note!\n\nCara set:\n";
      txt += "1. Reply/kirim voice note (VN)\n";
      txt += "2. Caption: ```" + m.prefix + "autoreactvn set " + rawTriggers + "```\n\n";
      txt += "Trigger yang akan diset: " + triggerList.length + " kata\n";
      triggerList.forEach((t, i) => {
        txt += "  " + (i + 1) + ". " + t + "\n";
      });
      return m.reply(claraWrap("autoreactvn", txt));
    }

    // Download VN
    let buffer;
    try {
      buffer = m.quoted?.isMedia ? await m.quoted.download() : await m.download();
    } catch (e) {
      return m.reply("Gagal download VN: " + e.message);
    }

    if (!buffer || buffer.length === 0) {
      return m.reply(claraWrap("autoreactvn", "VN kosong, coba kirim ulang!"));
    }

    // Simpan VN ke assets/vn/
    ensureVnDir();
    const fileLabel = triggerList.length === 1 ? triggerList[0] : triggerList[0] + "_dst";
    const fileName = "vn_" + fileLabel.replace(/\s+/g, "_") + "_" + Date.now() + ".mp3";
    const filePath = path.join(VN_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // Simpan ke database — 1 VN file untuk semua trigger
    let added = 0;
    let updated = 0;

    for (const trigger of triggerList) {
      const existingIndex = triggers.findIndex(t => t.trigger === trigger);
      const newEntry = { trigger, vnFile: fileName, size: buffer.length };

      if (existingIndex !== -1) {
        // Update existing — hapus file lama kalau berbeda
        const oldFile = triggers[existingIndex].vnFile;
        if (oldFile && oldFile !== fileName) {
          const oldPath = path.join(VN_DIR, oldFile);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) { console.error('[autoreactvn.js]:', e.message); }
          }
        }
        triggers[existingIndex] = newEntry;
        updated++;
      } else {
        triggers.push(newEntry);
        added++;
      }
    }

    db.setting("autoreactvnTriggers", triggers);
    await db.save();

    await m.react("🐣");

    let resultTxt = "✅ VN TRIGGER DISET\n\n";
    resultTxt += "VN File: " + fileName + "\n";
    resultTxt += "Size: " + (buffer.length / 1024).toFixed(1) + " KB\n";
    resultTxt += "Triggers (" + triggerList.length + "):\n";
    triggerList.forEach((t, i) => {
      const tag = i < added ? " baru" : (i < added + updated ? " update" : "");
      resultTxt += "  " + (i + 1) + ". *" + t + "*" + tag + "\n";
    });
    resultTxt += "\nTotal triggers sekarang: " + triggers.length;

    return m.reply(claraWrap("AutoReactVN", resultTxt));
  }

  // DEL: .autoreactvn del <trigger>
  if (action === "del" || action === "rm") {
    const trigger = args.slice(1).join(" ").trim().toLowerCase();
    if (!trigger) {
      return m.reply("Masukkan trigger yang mau dihapus!\n\n```" + m.prefix + "autoreactvn del <trigger>```");
    }

    const index = triggers.findIndex(t => t.trigger === trigger);
    if (index === -1) {
      return m.reply("Trigger \"" + trigger + "\" tidak ditemukan!");
    }

    const vnFile = triggers[index].vnFile;
    if (vnFile) {
      const vnPath = path.join(VN_DIR, vnFile);
      if (fs.existsSync(vnPath)) {
        // Cek apakah file ini dipakai trigger lain
        const sharedCount = triggers.filter(t => t.vnFile === vnFile).length;
        if (sharedCount <= 1) {
          try { fs.unlinkSync(vnPath); } catch (e) { console.error('[autoreactvn.js]:', e.message); }
        }
      }
    }

    triggers.splice(index, 1);
    db.setting("autoreactvnTriggers", triggers);
    await db.save();

    return m.reply(
      claraWrap("AutoReactVN", [
        "🗑 TRIGGER DIHAPUS",
        "",
        "Trigger: " + trigger,
        "Sisa triggers: " + triggers.length,
      ].join("\n"))
    );
  }

  // JEDA PRIVATE: .autoreactvn jeda <detik>
  if (action === "jeda" || action === "cooldown") {
    const subArg = (args[1] || "").toLowerCase();

    if (!subArg) {
      const privMs = db.setting("autoreactvnJedaPrivate") ?? 3000;
      const grpMs = db.setting("autoreactvnJedaGrup") ?? 10000;
      return m.reply(
        "JEDA VN REPLY\n\n" +
        "Private: " + (privMs / 1000).toFixed(1) + " detik\n" +
        "Grup: " + (grpMs / 1000).toFixed(1) + " detik\n\n" +
        "Set jeda:\n" +
        "1. ```" + m.prefix + "autoreactvn jeda 5``` — jeda private\n" +
        "2. ```" + m.prefix + "autoreactvn jedagrup 15``` — jeda grup\n" +
        "Minimal 1 detik, gak bisa off"
      );
    }

    const seconds = parseInt(subArg);
    if (isNaN(seconds) || seconds < 1) {
      return m.reply("Jeda minimal 1 detik!\n\n```" + m.prefix + "autoreactvn jeda 5```");
    }

    db.setting("autoreactvnJedaPrivate", seconds * 1000);
    await db.save();
    await m.react("🐣");
    return m.reply(
      "✅ JEDA PRIVATE DISET\n\n" +
      "Private: " + seconds + " detik\n" +
      "Grup: " + ((db.setting("autoreactvnJedaGrup") ?? 10000) / 1000).toFixed(1) + " detik"
    );
  }

  // JEDA GRUP: .autoreactvn jedagrup <detik>
  if (action === "jedagrup" || action === "cooldowngrup") {
    const subArg = (args[1] || "").toLowerCase();

    if (!subArg) {
      const grpMs = db.setting("autoreactvnJedaGrup") ?? 10000;
      return m.reply(
        "Jeda Grup: " + (grpMs / 1000).toFixed(1) + " detik\n\n" +
        "Set: ```" + m.prefix + "autoreactvn jedagrup 15```"
      );
    }

    const seconds = parseInt(subArg);
    if (isNaN(seconds) || seconds < 1) {
      return m.reply("Jeda minimal 1 detik!\n\n```" + m.prefix + "autoreactvn jedagrup 15```");
    }

    db.setting("autoreactvnJedaGrup", seconds * 1000);
    await db.save();
    await m.react("🐣");
    return m.reply(
      "✅ JEDA GRUP DISET\n\n" +
      "Grup: " + seconds + " detik\n" +
      "Private: " + ((db.setting("autoreactvnJedaPrivate") ?? 3000) / 1000).toFixed(1) + " detik"
    );
  }

  // LIST
  if (action === "list" || action === "ls") {
    if (triggers.length === 0) {
      return m.reply(
        claraWrap("AutoReactVN", [
          "DAFTAR TRIGGER",
          "",
          "Status: " + (db.setting("autoreactvnEnabled") ? "✅ AKTIF" : "❌ NONAKTIF"),
          "Triggers: 0",
          "",
          "Belum ada trigger yang diset.",
          "Gunakan: " + m.prefix + "autoreactvn set <trigger> (reply VN)",
        ].join("\n"))
      );
    }

    const privMs = db.setting("autoreactvnJedaPrivate") ?? 3000;
    const grpMs = db.setting("autoreactvnJedaGrup") ?? 10000;
    const jedaTxt = "Private " + (privMs / 1000).toFixed(1) + "s | Grup " + (grpMs / 1000).toFixed(1) + "s";

    // Group by VN file
    const vnGroups = {};
    triggers.forEach(t => {
      if (!vnGroups[t.vnFile]) vnGroups[t.vnFile] = [];
      vnGroups[t.vnFile].push(t.trigger);
    });

    let txt = "DAFTAR VN TRIGGER\n\n";
    txt += "Status: " + (db.setting("autoreactvnEnabled") ? "✅ AKTIF" : "❌ NONAKTIF") + "\n";
    txt += "Total: " + triggers.length + " triggers\n";
    txt += "Jeda: " + jedaTxt + "\n\n";

    let vnIdx = 1;
    for (const [vnFile, trigList] of Object.entries(vnGroups)) {
      const sizeKB = (triggers.find(t => t.vnFile === vnFile)?.size || 0) / 1024;
      txt += vnIdx + ". VN: " + vnFile + " (" + sizeKB.toFixed(1) + " KB)\n";
      trigList.forEach((trig, i) => {
        txt += "   " + (i + 1) + ". *" + trig + "*\n";
      });
      txt += "\n";
      vnIdx++;
    }

    return m.reply(txt.trim());
  }

  // DEFAULT: show help
  let jedaStatus;
  const privMs = db.setting("autoreactvnJedaPrivate") ?? 3000;
  const grpMs = db.setting("autoreactvnJedaGrup") ?? 10000;
  jedaStatus = "PV " + (privMs / 1000).toFixed(0) + "s / GRP " + (grpMs / 1000).toFixed(0) + "s";

  let txt = "AUTOREACTVN\n\n";
  txt += "Auto-reply pesan dengan voice note\n\n";
  txt += "PERINTAH:\n";
  txt += "1. ```" + m.prefix + "autoreactvn on``` — Aktifkan\n";
  txt += "2. ```" + m.prefix + "autoreactvn off``` — Nonaktifkan\n";
  txt += "3. ```" + m.prefix + "autoreactvn set <trigger1,trigger2,...>``` — Set 1 VN untuk multiple trigger\n";
  txt += "4. ```" + m.prefix + "autoreactvn del <trigger>``` — Hapus trigger\n";
  txt += "5. ```" + m.prefix + "autoreactvn list``` — Lihat semua trigger\n";
  txt += "6. ```" + m.prefix + "autoreactvn jeda <detik>``` — Jeda private chat\n";
  txt += "7. ```" + m.prefix + "autoreactvn jedagrup <detik>``` — Jeda grup\n\n";
  txt += "CONTOH:\n";
  txt += "```" + m.prefix + "autoreactvn set hai``` — 1 trigger\n";
  txt += "```" + m.prefix + "autoreactvn set ga mungkin,bohong,emang,serius,beneran``` — 5 trigger 1 VN\n\n";
  txt += "Status: " + (db.setting("autoreactvnEnabled") ? "✅ AKTIF" : "❌ NONAKTIF");
  txt += " | Triggers: " + triggers.length;
  txt += " | Jeda: " + jedaStatus;

  return m.reply(claraWrap("autoreactvn", txt));
}

export { pluginConfig as config, handler };
