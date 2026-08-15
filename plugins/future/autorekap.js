// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autorekap",
  alias: ["autorekap", "rekapotomatis", "rekapgrup"],
  category: "future",
  description: "Auto ringkasan aktivitas grup jam tertentu",
  usage: ".autorekap <command>",
  example: ".autorekap on 20:00",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("autorekap") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, time: "20:00", stats: { messages: 0, senders: {}, links: [], lastReset: 0 } };
    db.setting("autorekap", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autorekap") || {};
  all[gid] = data;
  db.setting("autorekap", all);
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
      await m.reply(claraWrap("Auto Rekap", "Khusus owner."));
      return { handled: true };
    }
    const time = args[2] || cfg.time;
    if (!/^\d{2}:\d{2}$/.test(time)) {
      await m.reply(claraWrap("Auto Rekap", "Format jam: HH:MM\nContoh: " + prefix + "autorekap on 20:00"));
      return { handled: true };
    }
    cfg.enabled = true;
    cfg.time = time;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Rekap", "AKTIF!\nJam: " + time + "\nBot akan kirim ringkasan tiap hari pada jam tersebut."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Rekap", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Rekap", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Auto Rekap", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Jam: " + cfg.time,
      "Pesan hari ini: " + cfg.stats.messages,
      "Sender aktif: " + Object.keys(cfg.stats.senders).length,
      "Link dibagikan: " + cfg.stats.links.length,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "now" || sub === "kirim") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Rekap", "Khusus owner."));
      return { handled: true };
    }
    const sorted = Object.entries(cfg.stats.senders).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topChatters = sorted.map(([jid, count], i) => (i + 1) + ". @" + jid.split("@")[0] + " (" + count + " pesan)").join("\n") || "(kosong)";
    await m.reply(claraWrap("Rekap Grup Hari Ini", [
      "Total pesan: " + cfg.stats.messages,
      "Member aktif: " + Object.keys(cfg.stats.senders).length,
      "Link dibagikan: " + cfg.stats.links.length,
      "",
      "Top Chatter:",
      topChatters,
    ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Rekap", "Khusus owner."));
      return { handled: true };
    }
    cfg.stats = { messages: 0, senders: {}, links: [], lastReset: Date.now() };
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Rekap", "Statistik direset."));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Rekap", [
    "AUTO REKAP GRUP",
    "",
    prefix + "autorekap on <HH:MM> - aktifkan",
    prefix + "autorekap off - matikan",
    prefix + "autorekap status - cek statistik",
    prefix + "autorekap now - kirim rekap sekarang",
    prefix + "autorekap reset - reset statistik",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig };
