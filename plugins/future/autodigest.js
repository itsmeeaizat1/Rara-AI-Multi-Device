// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autodigest",
  alias: ["autodigest"],
  category: "future",
  description: "Auto ringkasan mingguan grup tiap Minggu malam",
  usage: ".autodigest <command>",
  example: ".autodigest on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("autodigest") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, day: 0, time: "20:00", weekly: { messages: 0, senders: {}, newMembers: 0, topLinks: [], lastReset: 0 }, lastSent: 0 };
    db.setting("autodigest", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autodigest") || {};
  all[gid] = data;
  db.setting("autodigest", all);
  db.save();
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Digest", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Digest", "AKTIF!\nHari: " + DAYS[cfg.day] + "\nJam: " + cfg.time + "\nBot kirim ringkasan mingguan otomatis."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Digest", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Digest", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "day" || sub === "hari") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Digest", "Khusus owner."));
      return { handled: true };
    }
    const day = parseInt(args[2] || "-1", 10);
    if (isNaN(day) || day < 0 || day > 6) {
      await m.reply(claraWrap("Auto Digest", "Format: " + prefix + "autodigest day <0-6>\n0=Minggu, 1=Senin, ..., 6=Sabtu"));
      return { handled: true };
    }
    cfg.day = day;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Digest", "Hari diset: " + DAYS[day]));
    return { handled: true };
  }

  if (sub === "now" || sub === "kirim") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Digest", "Khusus owner."));
      return { handled: true };
    }
    const sorted = Object.entries(cfg.weekly.senders).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topChatters = sorted.map(([jid, count], i) => (i + 1) + ". @" + jid.split("@")[0] + " (" + count + ")").join("\n") || "(kosong)";
    await m.reply(claraWrap("Ringkasan Mingguan Grup", [
      "Total pesan minggu ini: " + cfg.weekly.messages,
      "Member aktif: " + Object.keys(cfg.weekly.senders).length,
      "Member baru: " + cfg.weekly.newMembers,
      "Link dibagikan: " + cfg.weekly.topLinks.length,
      "",
      "Top Chatter:",
      topChatters,
      "",
      "Laporan: " + new Date().toLocaleDateString("id-ID"),
    ].join("\n")), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Digest", "Khusus owner."));
      return { handled: true };
    }
    cfg.weekly = { messages: 0, senders: {}, newMembers: 0, topLinks: [], lastReset: Date.now() };
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Digest", "Statistik mingguan direset."));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Auto Digest", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Hari: " + DAYS[cfg.day],
      "Jam: " + cfg.time,
      "Pesan minggu ini: " + cfg.weekly.messages,
      "Sender aktif: " + Object.keys(cfg.weekly.senders).length,
      "Member baru: " + cfg.weekly.newMembers,
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Digest", [
    "AUTO WEEKLY DIGEST",
    "",
    prefix + "autodigest on/off",
    prefix + "autodigest day <0-6> - set hari",
    prefix + "autodigest now - kirim sekarang",
    prefix + "autodigest reset - reset statistik",
    prefix + "autodigest status",
    "",
    "0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig };
