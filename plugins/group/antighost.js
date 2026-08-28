// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "antighost",
  alias: ["antighost"],
  category: "group",
  description: "Deteksi member ghost/lurker yang gak pernah chat di grup",
  usage: ".antighost on [hari] | .antighost off | .antighost status | .antighost scan | .antighost kick",
  example: ".antighost on 7",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isAdmin: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// Track last activity: groupId -> { jid -> timestamp }
const activityTracker = {};

export function trackActivity(m, sock, db) {
  const groupId = m.key.remoteJid;
  const sender = m.key.participant || m.sender;
  const now = Date.now();

  if (!activityTracker[groupId]) activityTracker[groupId] = {};
  activityTracker[groupId][sender] = now;
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

    if (!groupCfg.antighost) {
      groupCfg.antighost = { enabled: false, inactiveDays: 7, action: "warn", lastScan: null };
      await db.save();
    }
    const cfg = groupCfg.antighost;

    // ON
    if (sub === "on" || sub === "aktif") {
      const daysArg = parseInt(args[1]);
      cfg.enabled = true;
      if (daysArg && daysArg >= 1 && daysArg <= 90) cfg.inactiveDays = daysArg;
      await db.save();

      return m.reply(claraWrap("Anti Ghost", [
        "Anti Ghost DIAKTIFKAN!",
        "",
        "Threshold: " + cfg.inactiveDays + " hari tidak chat",
        "Action: " + (cfg.action || "warn").toUpperCase(),
        "",
        "Member yang gak chat " + cfg.inactiveDays + " hari = ghost!",
        "Ketik .antighost scan untuk cek sekarang",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      return m.reply(claraWrap("Anti Ghost", "Anti Ghost DIMATIKAN.\nKetik .antighost on untuk aktifkan lagi."));
    }

    // ACTION
    if (sub === "action" || sub === "aksi") {
      const action = (args[1] || "").toLowerCase();
      if (!["warn", "kick"].includes(action)) {
        return m.reply(novaGuide("Anti Ghost", "Pilih aksi yang valid: warn atau kick", `${usedPrefix}antighost action kick`));
      }
      cfg.action = action;
      await db.save();
      return m.reply(claraWrap("Anti Ghost", "Action diubah ke: *" + action.toUpperCase() + "*", "success"));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastScanStr = cfg.lastScan ? new Date(cfg.lastScan).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      return m.reply(claraWrap("Anti Ghost", [
        "Status: " + (cfg.enabled ? "*AKTIF*" : "Nonaktif"),
        "Threshold: " + cfg.inactiveDays + " hari",
        "Action: " + (cfg.action || "warn").toUpperCase(),
        "Terakhir scan: " + lastScanStr,
        "",
        "Ketik .antighost scan untuk cek member ghost sekarang",
      ]));
    }

    // SCAN
    if (sub === "scan" || sub === "cekmember") {
      await m.react("🔍");
      let metadata;
      try {
        metadata = await conn.groupMetadata(groupId);
      } catch {
        return m.reply(novaError("Anti Ghost", "Gagal mengambil data metadata grup."));
      }

      const participants = metadata.participants || [];
      const now = Date.now();
      const thresholdMs = cfg.inactiveDays * 24 * 60 * 60 * 1000;
      const tracker = activityTracker[groupId] || {};

      let ghosts = [];
      let active = [];
      let admins = [];

      participants.forEach((p) => {
        if (p.admin) { admins.push(p.id); return; }
        const lastActive = tracker[p.id];
        if (!lastActive || (now - lastActive) > thresholdMs) {
          ghosts.push(p.id);
        } else {
          active.push(p.id);
        }
      });

      cfg.lastScan = now;
      cfg.lastGhostCount = ghosts.length;
      cfg.lastActiveCount = active.length;
      await db.save();

      let lines = [
        "Hasil Scan Grup:",
        "Total member: " + participants.length,
        "Admin: " + admins.length,
        "Active: " + active.length,
        "Ghost (tidak chat " + cfg.inactiveDays + " hari): " + ghosts.length,
        "",
      ];

      if (ghosts.length > 0) {
        lines.push("DAFTAR GHOST:");
        ghosts.slice(0, 20).forEach((g, i) => {
          lines.push((i + 1) + ". @" + g.split("@")[0]);
        });
        if (ghosts.length > 20) lines.push("...dan " + (ghosts.length - 20) + " lagi");
        lines.push("");
        if (cfg.action === "kick") {
          lines.push("Ketik .antighost kick untuk keluarkan semua ghost");
        } else {
          lines.push("Ketik .antighost action kick lalu .antighost kick");
        }
      } else {
        lines.push("Semua member active! Gak ada ghost.");
      }

      const payload = { text: claraWrap("Anti Ghost", lines) };
      if (ghosts.length > 0) payload.mentions = ghosts.slice(0, 20);
      return m.reply(payload);
    }

    // KICK
    if (sub === "kick" || sub === "kickall") {
      if ((cfg.action || "warn") !== "kick") {
        return m.reply(novaGuide("Anti Ghost", "Set action ke kick dulu sebelum mengeluarkan ghost!", `${usedPrefix}antighost action kick`));
      }

      let metadata;
      try {
        metadata = await conn.groupMetadata(groupId);
      } catch {
        return m.reply(novaError("Anti Ghost", "Gagal mengambil data metadata grup."));
      }

      const participants = metadata.participants || [];
      const now = Date.now();
      const thresholdMs = cfg.inactiveDays * 24 * 60 * 60 * 1000;
      const tracker = activityTracker[groupId] || {};

      let ghosts = [];
      participants.forEach((p) => {
        if (p.admin) return;
        const lastActive = tracker[p.id];
        if (!lastActive || (now - lastActive) > thresholdMs) ghosts.push(p.id);
      });

      if (ghosts.length === 0) {
        return m.reply(novaEmpty("Anti Ghost", "Tidak ada ghost/member tidak aktif yang bisa dikick."));
      }

      let kicked = 0;
      let failed = 0;
      for (const g of ghosts) {
        try {
          await conn.groupParticipantsUpdate(groupId, [g], "remove");
          kicked++;
          await new Promise((r) => setTimeout(r, 1000)); // delay biar gak rate limit
        } catch {
          failed++;
        }
      }

      return m.reply(claraWrap("Anti Ghost", [
        "KICK GHOST SELESAI!",
        "",
        "Total ghost: " + ghosts.length,
        "Berhasil kick: " + kicked,
        "Gagal: " + failed,
      ], "success"));
    }

    // HELP
    return m.reply(novaGuide("Anti Ghost", "Deteksi member ghost/lurker yang tidak pernah chat di grup.", `${usedPrefix}antighost on 7`));
  } catch (e) {
    console.error("[Anti Ghost]", e);
    m.reply(novaError("Anti Ghost", `Terjadi kesalahan: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
