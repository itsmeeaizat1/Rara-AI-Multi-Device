// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "autostreak",
  alias: ["autostreak"],
  category: "smart",
  description: "Auto alert member yang streak hampir putus",
  usage: ".autostreak <command>",
  example: ".autostreak on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("autostreak") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, users: {}, lastNotify: 0, deadlineHour: 22 };
    db.setting("autostreak", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autostreak") || {};
  all[gid] = data;
  db.setting("autostreak", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(raraWrap("Auto Streak", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    if (args[2]) {
      const h = parseInt(args[2], 10);
      if (!isNaN(h) && h >= 0 && h <= 23) cfg.deadlineHour = h;
    }
    saveConfig(db, gid, cfg);
    await m.reply(raraWrap("Auto Streak", "AKTIF!\nDeadline harian: jam " + cfg.deadlineHour + ":00\nBot akan alert member yang streak hampir putus."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(raraWrap("Auto Streak", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(raraWrap("Auto Streak", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "cek" || sub === "status" || !sub) {
    const activeStreaks = Object.entries(cfg.users)
      .filter(([jid, u]) => u.streak > 0)
      .sort((a, b) => b[1].streak - a[1].streak)
      .slice(0, 10);
    const list = activeStreaks.map(([jid, u], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + u.streak + " hari").join("\n") || "(kosong)";
    await m.reply(raraWrap("Auto Streak", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Deadline: jam " + cfg.deadlineHour + ":00",
      "Total tracked: " + Object.keys(cfg.users).length,
      "Active streaks: " + activeStreaks.length,
      "",
      "Top Streak:",
      list,
    ].join("\n")), { mentions: activeStreaks.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(raraWrap("Auto Streak", "Khusus owner."));
      return { handled: true };
    }
    cfg.users = {};
    saveConfig(db, gid, cfg);
    await m.reply(raraWrap("Auto Streak", "Streak direset."));
    return { handled: true };
  }

  await m.reply(raraWrap("Auto Streak", [
    "AUTO STREAK ALERT",
    "",
    prefix + "autostreak on [deadline jam] - aktifkan",
    prefix + "autostreak off - matikan",
    prefix + "autostreak cek - lihat top streak",
    prefix + "autostreak reset - reset semua",
    "",
    "Bot alert member yang streak hampir putus sebelum deadline.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig };
