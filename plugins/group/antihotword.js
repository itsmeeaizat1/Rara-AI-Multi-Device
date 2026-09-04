// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antihotword",
  alias: ["antihotword"],
  category: "group",
  description: "Deteksi kata/hot word khusus di grup — alert admin saat keyword muncul",
  usage: ".antihotword on | .antihotword off | .antihotword add <kata> | .antihotword del <kata> | .antihotword list",
  example: ".antihotword add judi\n.antihotword add pinjam",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

import { novaWarning } from "../../src/lib/nova-group-protection.js";

export async function checkHotWord(m, sock, db) {
  const groupId = m.key.remoteJid;
  const cfg = db.data?.groups?.[groupId]?.antihotword;
  if (!cfg || !cfg.enabled || !cfg.words || cfg.words.length === 0) return;

  const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
  if (!text) return;

  const textLower = text.toLowerCase();
  const sender = m.key.participant || m.sender;
  const now = Date.now();

  // Cek setiap hot word
  for (const word of cfg.words) {
    if (textLower.includes(word.toLowerCase())) {
      const action = cfg.action || "alert";

      // Log detection
      if (!cfg.log) cfg.log = [];
      cfg.log.push({ word, sender, text: text.slice(0, 100), time: now });
      if (cfg.log.length > 50) cfg.log = cfg.log.slice(-50);
      cfg.totalDetected = (cfg.totalDetected || 0) + 1;

      if (action === "delete") {
        try { sock.sendMessage(groupId, { delete: m.key }); } catch (e) { console.error('[antihotword.js]:', e.message); }
      }

      if (action === "alert" || action === "warn") {
        // Mention admin
        let metadata;
        let adminMentions = [];
        try {
          metadata = await sock.groupMetadata(groupId);
          adminMentions = metadata.participants.filter((p) => p.admin).map((p) => p.id);
        } catch (e) { console.error('[antihotword.js]:', e.message); }

        sock.sendMessage(groupId, {
          text: novaWarning("ANTI HOT WORD — PERINGATAN", [
            ["Pengirim", "@" + sender.split("@")[0]],
            ["Pelanggaran", "Hot word terdeteksi"],
            ["Terdeteksi", word],
            ["Total deteksi", String(cfg.totalDetected)],
            ["Tindakan", action === "warn" ? "Peringatan dicatat" : "Admin diminta cek pesan ini"],
            ["Potongan pesan", text.slice(0, 80)],
          ], "Kata sensitif tidak diperbolehkan di grup ini."),
          mentions: [sender, ...adminMentions],
        });
      }

      db.save();
      break; // 1 deteksi per pesan
    }
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    const groupCfg = db.data.groups[groupId];

    if (!groupCfg.antihotword) {
      groupCfg.antihotword = { enabled: false, words: [], action: "alert", totalDetected: 0, log: [] };
      await db.save();
    }
    const cfg = groupCfg.antihotword;

    // ON
    if (sub === "on" || sub === "aktif") {
      cfg.enabled = true;
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", [
        "Anti Hot Word DIAKTIFKAN!",
        "",
        "Action: " + (cfg.action || "alert").toUpperCase(),
        "Total keyword: " + (cfg.words?.length || 0),
        "",
        "Tambah keyword: .antihotword add <kata>",
        "Ketik .antihotword action <alert/warn/delete> untuk ubah aksi",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", "Anti Hot Word DIMATIKAN.\nKetik .antihotword on untuk aktifkan lagi."));
    }

    // ADD
    if (sub === "add" || sub === "tambah") {
      const word = args.slice(1).join(" ").trim().toLowerCase();
      if (!word) return m.reply(claraWrap("Anti Hot Word", "Masukkan kata!\n💡 *Contoh:* .antihotword add judi"));
      if (!cfg.words) cfg.words = [];
      if (cfg.words.includes(word)) return m.reply(claraWrap("Anti Hot Word", "Kata '" + word + "' sudah ada di daftar."));
      cfg.words.push(word);
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", "Kata '" + word + "' ditambahkan!\nTotal keyword: " + cfg.words.length, "success"));
    }

    // DEL
    if (sub === "del" || sub === "hapus" || sub === "remove") {
      const word = args.slice(1).join(" ").trim().toLowerCase();
      if (!word) return m.reply(claraWrap("Anti Hot Word", "Masukkan kata!\n💡 *Contoh:* .antihotword del judi"));
      if (!cfg.words) cfg.words = [];
      const idx = cfg.words.indexOf(word);
      if (idx === -1) return m.reply(claraWrap("Anti Hot Word", "Kata '" + word + "' tidak ditemukan."));
      cfg.words.splice(idx, 1);
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", "Kata '" + word + "' dihapus!\nTotal keyword: " + cfg.words.length, "success"));
    }

    // LIST
    if (sub === "list" || sub === "daftar") {
      if (!cfg.words || cfg.words.length === 0) {
        return m.reply(claraWrap("Anti Hot Word", "Belum ada keyword. Tambah: .antihotword add <kata>"));
      }
      let lines = ["Daftar Hot Word (" + cfg.words.length + "):", ""];
      cfg.words.forEach((w, i) => lines.push((i + 1) + ". " + w));
      lines.push("", "Total deteksi: " + (cfg.totalDetected || 0));
      return m.reply(claraWrap("Anti Hot Word", lines));
    }

    // ACTION
    if (sub === "action" || sub === "aksi") {
      const action = (args[1] || "").toLowerCase();
      if (!["alert", "warn", "delete"].includes(action)) {
        return m.reply(claraWrap("Anti Hot Word", "Pilih: alert, warn, atau delete\nalert = mention admin\nwarn = catat warning\ndelete = hapus pesan"));
      }
      cfg.action = action;
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", "Action diubah ke: *" + action.toUpperCase() + "*", "success"));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      return m.reply(claraWrap("Anti Hot Word", [
        "Status: " + (cfg.enabled ? "*AKTIF*" : "Nonaktif"),
        "Action: " + (cfg.action || "alert").toUpperCase(),
        "Total keyword: " + (cfg.words?.length || 0),
        "Total deteksi: " + (cfg.totalDetected || 0),
        "",
        "Ketik .antihotword list untuk lihat semua keyword",
        "Ketik .antihotword log untuk lihat riwayat deteksi",
      ]));
    }

    // LOG
    if (sub === "log" || sub === "riwayat") {
      const logs = cfg.log || [];
      if (logs.length === 0) {
        return m.reply(claraWrap("Anti Hot Word", "Belum ada riwayat deteksi."));
      }
      let lines = ["Riwayat deteksi (" + logs.length + " terakhir):", ""];
      logs.slice(-10).reverse().forEach((l, i) => {
        lines.push((i + 1) + ". Kata: " + l.word);
        lines.push("   Oleh: @" + l.sender.split("@")[0]);
        lines.push("   Pesan: " + l.text.slice(0, 50));
        lines.push("   " + new Date(l.time).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }));
        lines.push("");
      });
      return m.reply(claraWrap("Anti Hot Word", lines));
    }

    // RESET
    if (sub === "reset") {
      cfg.log = [];
      cfg.totalDetected = 0;
      if (cfg.warns) cfg.warns = {};
      await db.save();
      return m.reply(claraWrap("Anti Hot Word", "Log dan counter direset.", "success"));
    }

    // HELP
    return m.reply( claraWrap("Anti Hot Word", [
      "Deteksi kata/hot word khusus di grup",
      "",
      "Berguna untuk: pantau kata sensitif, waspadai penipuan, dll",
      "",
      "CARA PAKAI:",
      usedPrefix + "antihotword on — Aktifkan",
      usedPrefix + "antihotword off — Matikan",
      usedPrefix + "antihotword add <kata> — Tambah keyword",
      usedPrefix + "antihotword del <kata> — Hapus keyword",
      usedPrefix + "antihotword list — Lihat semua keyword",
      usedPrefix + "antihotword action <alert/warn/delete> — Ubah aksi",
      usedPrefix + "antihotword status — Lihat status",
      usedPrefix + "antihotword log — Lihat riwayat deteksi",
      usedPrefix + "antihotword reset — Reset log",
      "",
      "CONTOH:",
      usedPrefix + "antihotword add judi",
      usedPrefix + "antihotword add pinjam",
      usedPrefix + "antihotword action delete",
    ]), "antihotword");
  } catch (e) {
    console.error("[Anti Hot Word]", e);
    m.reply(claraWrap("Anti Hot Word", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
