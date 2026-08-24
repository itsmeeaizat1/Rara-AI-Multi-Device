// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antiflood",
  alias: ["antifloodgc", "floodprotect", "antibanjir"],
  category: "group",
  description: "Deteksi banjir pesan (flood) — kirim pesan terus-menerus dalam waktu singkat",
  usage: ".antiflood on [limit] [detik] | .antiflood off | .antiflood status | .antiflood action <warn/kick/delete>",
  example: ".antiflood on 10 5\n.antiflood action kick",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Flood tracker: groupId -> { jid -> { count, firstMsg, warned } }
const floodTracker = {};

export function checkFlood(m, sock, db) {
  const groupId = m.key.remoteJid;
  const sender = m.key.participant || m.sender;
  const cfg = db.data?.groups?.[groupId]?.antiflood;
  if (!cfg || !cfg.enabled) return;

  const limit = cfg.limit || 10;
  const windowSec = cfg.window || 5;
  const now = Date.now();

  if (!floodTracker[groupId]) floodTracker[groupId] = {};
  if (!floodTracker[groupId][sender]) floodTracker[groupId][sender] = { count: 0, firstMsg: now, warned: false };

  const tracker = floodTracker[groupId][sender];
  const elapsed = (now - tracker.firstMsg) / 1000;

  // Reset kalau udah lewat window
  if (elapsed > windowSec) {
    tracker.count = 1;
    tracker.firstMsg = now;
    tracker.warned = false;
    return;
  }

  tracker.count++;

  // Flood detected
  if (tracker.count >= limit) {
    const action = cfg.action || "warn";
    tracker.count = 0;
    tracker.firstMsg = now;

    if (action === "delete") {
      try { sock.sendMessage(groupId, { delete: m.key }); } catch (e) { console.error('[antiflood.js]:', e.message); }
    }

    if (action === "kick") {
      try {
        sock.groupParticipantsUpdate(groupId, [sender], "remove");
      } catch (e) { console.error('[antiflood.js]:', e.message); }
    }

    if (action === "warn" || action === "delete") {
      const warnCount = (cfg.warns?.[sender] || 0) + 1;
      if (!cfg.warns) cfg.warns = {};
      cfg.warns[sender] = warnCount;
      db.save();

      const maxWarn = cfg.maxWarn || 3;
      if (warnCount >= maxWarn && cfg.action !== "kick") {
        try {
          sock.groupParticipantsUpdate(groupId, [sender], "remove");
          delete cfg.warns[sender];
          db.save();
          sock.sendMessage(groupId, {
            text: claraWrap("Anti Flood", [
              "@" + sender.split("@")[0] + " dikeluarkan karena flood!",
              "Total warning: " + warnCount + "/" + maxWarn,
              "Limit: " + limit + " pesan dalam " + windowSec + " detik",
            ], "warn"),
            mentions: [sender],
          });
        } catch (e) { console.error('[antiflood.js]:', e.message); }
      } else {
        sock.sendMessage(groupId, {
          text: claraWrap("Anti Flood", [
            "FLOOD TERDETEKSI!",
            "@" + sender.split("@")[0] + " kirim " + tracker.count + " pesan dalam " + elapsed.toFixed(1) + " detik",
            "Warning: " + warnCount + "/" + maxWarn,
            "Action: " + action.toUpperCase(),
            "Kalau sampe " + maxWarn + "x warning = kick!",
          ], "warn"),
          mentions: [sender],
        });
      }
    }
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.groups) db.data.groups = {};
    if (!db.data.groups[groupId]) db.data.groups[groupId] = {};
    const groupCfg = db.data.groups[groupId];

    if (!groupCfg.antiflood) {
      groupCfg.antiflood = { enabled: false, limit: 10, window: 5, action: "warn", maxWarn: 3, warns: {} };
      await db.save();
    }
    const cfg = groupCfg.antiflood;

    // ON
    if (sub === "on" || sub === "aktif") {
      const limitArg = parseInt(args[1]);
      const windowArg = parseInt(args[2]);
      cfg.enabled = true;
      if (limitArg && limitArg >= 3 && limitArg <= 50) cfg.limit = limitArg;
      if (windowArg && windowArg >= 2 && windowArg <= 60) cfg.window = windowArg;
      await db.save();

      return m.reply(claraWrap("Anti Flood", [
        "Anti Flood DIAKTIFKAN!",
        "",
        "Limit: " + cfg.limit + " pesan dalam " + cfg.window + " detik",
        "Action: " + (cfg.action || "warn").toUpperCase(),
        "Max warning: " + (cfg.maxWarn || 3),
        "",
        "Member yang kirim " + cfg.limit + "+ pesan dalam " + cfg.window + " detik = flood!",
        "Ketik .antiflood action <warn/kick/delete> untuk ubah aksi",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      // Clear tracker
      if (floodTracker[groupId]) delete floodTracker[groupId];

      return m.reply(claraWrap("Anti Flood", "Anti Flood DIMATIKAN.\nKetik .antiflood on untuk aktifkan lagi."));
    }

    // ACTION
    if (sub === "action" || sub === "aksi") {
      const action = (args[1] || "").toLowerCase();
      if (!["warn", "kick", "delete"].includes(action)) {
        return m.reply(claraWrap("Anti Flood", "Pilih: warn, kick, atau delete\nContoh: .antiflood action kick"));
      }
      cfg.action = action;
      await db.save();

      return m.reply(claraWrap("Anti Flood", "Action diubah ke: *" + action.toUpperCase() + "*", "success"));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const warnedUsers = Object.entries(cfg.warns || {});
      let warnList = "Tidak ada";
      if (warnedUsers.length > 0) {
        warnList = warnedUsers.map(([jid, count]) => "@" + jid.split("@")[0] + " (" + count + "x)").join("\n");
      }

      return m.reply(claraWrap("Anti Flood", [
        "Status: " + (cfg.enabled ? "*ᴀᴋᴛɪꜰ*" : "Nonaktif"),
        "Limit: " + (cfg.limit || 10) + " pesan",
        "Window: " + (cfg.window || 5) + " detik",
        "Action: " + (cfg.action || "warn").toUpperCase(),
        "Max warning: " + (cfg.maxWarn || 3),
        "",
        "Member yang kena warning:",
        warnList,
        "",
        "Reset warning: .antiflood reset",
      ]));
    }

    // RESET
    if (sub === "reset") {
      cfg.warns = {};
      await db.save();
      if (floodTracker[groupId]) delete floodTracker[groupId];
      return m.reply(claraWrap("Anti Flood", "Semua warning flood direset.", "success"));
    }

    // HELP
    return m.reply( claraWrap("Anti Flood", [
      "Deteksi banjir pesan (flood) di grup",
      "",
      "Bedanya sama antispam: antiflood fokus ke KECEPATAN pesan",
      "(X pesan dalam Y detik), bukan total volume",
      "",
      "CARA PAKAI:",
      usedPrefix + "antiflood on [limit] [detik] — Aktifkan",
      usedPrefix + "antiflood off — Matikan",
      usedPrefix + "antiflood action <warn/kick/delete> — Ubah aksi",
      usedPrefix + "antiflood status — Lihat status",
      usedPrefix + "antiflood reset — Reset semua warning",
      "",
      "CONTOH:",
      usedPrefix + "antiflood on (default: 10 pesan/5 detik)",
      usedPrefix + "antiflood on 5 3 (5 pesan dalam 3 detik = flood)",
      usedPrefix + "antiflood action kick",
    ]), "antiflood");
  } catch (e) {
    console.error("[Anti Flood]", e);
    m.reply(claraWrap("Anti Flood", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
