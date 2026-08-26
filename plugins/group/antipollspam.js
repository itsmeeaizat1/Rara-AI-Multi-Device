// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antipollspam",
  alias: ["antipollspam"],
  category: "group",
  description: "Blokir spam poll di grup — batasi jumlah poll per member dalam waktu tertentu",
  usage: ".antipollspam on [limit] [menit] | .antipollspam off | .antipollspam status",
  example: ".antipollspam on 2 30",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Poll tracker: groupId -> { jid -> { count, firstPoll } }
const pollTracker = {};

export function checkPollSpam(m, sock, db) {
  const groupId = m.key.remoteJid;
  const cfg = db.data?.groups?.[groupId]?.antipollspam;
  if (!cfg || !cfg.enabled) return;

  // Cek apakah pesan ini poll
  const isPoll = m.message?.pollCreationMessage || m.message?.pollCreationMessageV2 || m.message?.pollCreationMessageV3;
  if (!isPoll) return;

  const sender = m.key.participant || m.sender;
  const now = Date.now();
  const limit = cfg.limit || 2;
  const windowMs = (cfg.window || 30) * 60 * 1000;

  if (!pollTracker[groupId]) pollTracker[groupId] = {};
  if (!pollTracker[groupId][sender]) pollTracker[groupId][sender] = { count: 0, firstPoll: now };

  const tracker = pollTracker[groupId][sender];
  const elapsed = now - tracker.firstPoll;

  // Reset kalau lewat window
  if (elapsed > windowMs) {
    tracker.count = 1;
    tracker.firstPoll = now;
    return;
  }

  tracker.count++;

  // Poll spam detected
  if (tracker.count > limit) {
    const action = cfg.action || "delete";

    if (action === "delete") {
      try { sock.sendMessage(groupId, { delete: m.key }); } catch (e) { console.error('[antipollspam.js]:', e.message); }
    }

    if (action === "warn" || action === "kick") {
      if (!cfg.warns) cfg.warns = {};
      cfg.warns[sender] = (cfg.warns[sender] || 0) + 1;
      const warnCount = cfg.warns[sender];
      db.save();

      if (action === "kick" || (action === "warn" && warnCount >= (cfg.maxWarn || 3))) {
        try {
          sock.groupParticipantsUpdate(groupId, [sender], "remove");
          delete cfg.warns[sender];
          db.save();
        } catch (e) { console.error('[antipollspam.js]:', e.message); }
      }

      sock.sendMessage(groupId, {
        text: claraWrap("Anti Poll Spam", [
          "POLL SPAM TERDETEKSI!",
          "@" + sender.split("@")[0] + " buat " + tracker.count + " poll dalam " + Math.round(elapsed / 60000) + " menit",
          "Limit: " + limit + " poll per " + (cfg.window || 30) + " menit",
          "Warning: " + warnCount + "/" + (cfg.maxWarn || 3),
        ], "warn"),
        mentions: [sender],
      });
    } else if (action === "delete") {
      sock.sendMessage(groupId, {
        text: claraWrap("Anti Poll Spam", [
          "Poll dari @" + sender.split("@")[0] + " dihapus (spam poll)",
          "Limit: " + limit + " poll per " + (cfg.window || 30) + " menit",
        ], "warn"),
        mentions: [sender],
      });
    }

    tracker.count = 0;
    tracker.firstPoll = now;
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

    if (!groupCfg.antipollspam) {
      groupCfg.antipollspam = { enabled: false, limit: 2, window: 30, action: "delete", maxWarn: 3, warns: {} };
      await db.save();
    }
    const cfg = groupCfg.antipollspam;

    // ON
    if (sub === "on" || sub === "aktif") {
      const limitArg = parseInt(args[1]);
      const windowArg = parseInt(args[2]);
      cfg.enabled = true;
      if (limitArg && limitArg >= 1 && limitArg <= 20) cfg.limit = limitArg;
      if (windowArg && windowArg >= 5 && windowArg <= 1440) cfg.window = windowArg;
      await db.save();

      return m.reply(claraWrap("Anti Poll Spam", [
        "Anti Poll Spam DIAKTIFKAN!",
        "",
        "Limit: " + cfg.limit + " poll per " + cfg.window + " menit",
        "Action: " + (cfg.action || "delete").toUpperCase(),
        "",
        "Member yang buat lebih dari " + cfg.limit + " poll dalam " + cfg.window + " menit = spam!",
        "Ketik .antipollspam action <delete/warn/kick> untuk ubah aksi",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      if (pollTracker[groupId]) delete pollTracker[groupId];
      return m.reply(claraWrap("Anti Poll Spam", "Anti Poll Spam DIMATIKAN.\nKetik .antipollspam on untuk aktifkan lagi."));
    }

    // ACTION
    if (sub === "action" || sub === "aksi") {
      const action = (args[1] || "").toLowerCase();
      if (!["delete", "warn", "kick"].includes(action)) {
        return m.reply(claraWrap("Anti Poll Spam", "Pilih: delete, warn, atau kick"));
      }
      cfg.action = action;
      await db.save();
      return m.reply(claraWrap("Anti Poll Spam", "Action diubah ke: *" + action.toUpperCase() + "*", "success"));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const warnedUsers = Object.entries(cfg.warns || {});
      let warnList = "Tidak ada";
      if (warnedUsers.length > 0) {
        warnList = warnedUsers.map(([jid, count]) => "@" + jid.split("@")[0] + " (" + count + "x)").join("\n");
      }

      return m.reply(claraWrap("Anti Poll Spam", [
        "Status: " + (cfg.enabled ? "*AKTIF*" : "Nonaktif"),
        "Limit: " + cfg.limit + " poll per " + cfg.window + " menit",
        "Action: " + (cfg.action || "delete").toUpperCase(),
        "Max warning: " + (cfg.maxWarn || 3),
        "",
        "Member yang kena warning:",
        warnList,
        "",
        "Reset warning: .antipollspam reset",
      ]));
    }

    // RESET
    if (sub === "reset") {
      cfg.warns = {};
      await db.save();
      if (pollTracker[groupId]) delete pollTracker[groupId];
      return m.reply(claraWrap("Anti Poll Spam", "Semua warning direset.", "success"));
    }

    // HELP
    return m.reply( claraWrap("Anti Poll Spam", [
      "Blokir spam poll di grup",
      "",
      "Batas jumlah poll yang boleh dibuat per member dalam waktu tertentu",
      "",
      "CARA PAKAI:",
      usedPrefix + "antipollspam on [limit] [menit] — Aktifkan",
      usedPrefix + "antipollspam off — Matikan",
      usedPrefix + "antipollspam action <delete/warn/kick> — Ubah aksi",
      usedPrefix + "antipollspam status — Lihat status",
      usedPrefix + "antipollspam reset — Reset warning",
      "",
      "CONTOH:",
      usedPrefix + "antipollspam on (default: 2 poll/30 menit)",
      usedPrefix + "antipollspam on 1 60 (1 poll per jam)",
      usedPrefix + "antipollspam action kick",
    ]), "antipollspam");
  } catch (e) {
    console.error("[Anti Poll Spam]", e);
    m.reply(claraWrap("Anti Poll Spam", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
