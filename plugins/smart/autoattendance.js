// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoabsen",
  alias: ["autoabsen"],
  category: "smart",
  description: "Auto notify admin member yang tidak aktif",
  usage: ".autoabsen <command>",
  example: ".autoabsen on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("autoabsen") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, threshold: 7, lastReport: 0, activity: {}, reportDay: 1 };
    db.setting("autoabsen", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autoabsen") || {};
  all[gid] = data;
  db.setting("autoabsen", all);
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
      await m.reply(claraWrap("Auto Absen", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Absen", "AKTIF!\nThreshold: " + cfg.threshold + " hari\nReport: setiap tanggal " + cfg.reportDay + "\nBot akan notify member yang tidak aktif."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Absen", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Absen", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "threshold" || sub === "batas") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Absen", "Khusus owner."));
      return { handled: true };
    }
    const days = parseInt(args[2] || "0", 10);
    if (!days || days < 1) {
      await m.reply(claraWrap("Auto Absen", "Format: " + prefix + "autoabsen threshold <hari>\n💡 *Contoh:* " + prefix + "autoabsen threshold 14"));
      return { handled: true };
    }
    cfg.threshold = days;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Absen", "Threshold diset: " + days + " hari"));
    return { handled: true };
  }

  if (sub === "report" || sub === "laporan") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Absen", "Khusus owner."));
      return { handled: true };
    }
    const now = Date.now();
    const inactive = Object.entries(cfg.activity)
      .filter(([jid, lastActive]) => (now - lastActive) / 86400000 >= cfg.threshold)
      .sort((a, b) => a[1] - b[1]);

    if (inactive.length === 0) {
      await m.reply(claraWrap("Auto Absen", "Semua member aktif! Tidak ada yang melebihi " + cfg.threshold + " hari."));
      return { handled: true };
    }

    const list = inactive.map(([jid, lastActive], i) => {
      const days = Math.floor((now - lastActive) / 86400000);
      return (i + 1) + ". @" + jid.split("@")[0] + " - " + days + " hari tidak aktif";
    }).join("\n");

    await m.reply(claraWrap("Auto Absen Report", [
      "Member tidak aktif (" + inactive.length + " orang)",
      "Threshold: " + cfg.threshold + " hari",
      "",
      list,
      "",
      "Terakhir update: " + new Date().toLocaleString("id-ID"),
    ].join("\n")), { mentions: inactive.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Absen", "Khusus owner."));
      return { handled: true };
    }
    cfg.activity = {};
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Absen", "Aktivitas direset."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    const now = Date.now();
    const total = Object.keys(cfg.activity).length;
    const active = Object.values(cfg.activity).filter(ts => (now - ts) / 86400000 < cfg.threshold).length;
    const inactiveCount = total - active;
    await m.reply(claraWrap("Auto Absen", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Threshold: " + cfg.threshold + " hari",
      "Total tracked: " + total,
      "Aktif: " + active,
      "Tidak aktif: " + inactiveCount,
      "Terakhir report: " + (cfg.lastReport ? new Date(cfg.lastReport).toLocaleString("id-ID") : "belum pernah"),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Absen", [
    "AUTO ABSENCE NOTIFY",
    "",
    prefix + "autoabsen on/off",
    prefix + "autoabsen threshold <hari>",
    prefix + "autoabsen report - laporan sekarang",
    prefix + "autoabsen reset - reset aktivitas",
    prefix + "autoabsen status",
    "",
    "Bot notify admin member yang lama tidak aktif.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig };
