// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gkarma",
  alias: ["gkarma", "groupkarma", "karmagrup"],
  category: "future",
  description: "Group Karma - earn karma dari kontribusi grup",
  usage: ".gkarma <command>",
  example: ".gkarma cek",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getKarma(db, gid) {
  const all = db.setting("gkarma") || {};
  if (!all[gid]) {
    all[gid] = { users: {}, lastReset: Date.now() };
    db.setting("gkarma", all);
  }
  return all[gid];
}

function saveKarma(db, gid, data) {
  const all = db.setting("gkarma") || {};
  all[gid] = data;
  db.setting("gkarma", all);
  db.save();
}

function addKarma(db, gid, jid, amount, reason) {
  const data = getKarma(db, gid);
  if (!data.users[jid]) {
    data.users[jid] = { points: 0, given: 0, received: 0, history: [] };
  }
  data.users[jid].points += amount;
  if (amount > 0) data.users[jid].received += amount;
  else data.users[jid].given += Math.abs(amount);
  data.users[jid].history.push({ amount, reason, ts: Date.now() });
  if (data.users[jid].history.length > 20) data.users[jid].history.shift();
  saveKarma(db, gid, data);
  return data.users[jid].points;
}

function getLevel(points) {
  if (points >= 1000) return { level: "Legend", emoji: "👑" };
  if (points >= 500) return { level: "Master", emoji: "🏆" };
  if (points >= 250) return { level: "Expert", emoji: "🥇" };
  if (points >= 100) return { level: "Pro", emoji: "🥈" };
  if (points >= 50) return { level: "Member", emoji: "🥉" };
  return { level: "Newbie", emoji: "🌱" };
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== CEK
  if (sub === "cek" || !sub) {
    const data = getKarma(db, gid);
    const user = data.users[m.sender] || { points: 0, given: 0, received: 0 };
    const lvl = getLevel(user.points);
    await m.reply(claraWrap("Group Karma", [
      "User: " + (m.pushName || "@" + m.sender.split("@")[0]),
      "Karma: " + user.points,
      "Diterima: +" + user.received,
      "Diberi: -" + user.given,
      "Level: " + lvl.emoji + " " + lvl.level,
    ].join("\n")));
    return { handled: true };
  }

  // ==================== GIVE (+1 to someone)
  if (sub === "give" || sub === "+" || sub === "kasih") {
    const target = m.mentionedJid?.[0];
    if (!target) {
      await m.reply(claraWrap("Group Karma", "Format: " + prefix + "gkarma give @member [alasan]"));
      return { handled: true };
    }
    if (target === m.sender) {
      await m.reply(claraWrap("Group Karma", "Tidak bisa kasih karma ke diri sendiri."));
      return { handled: true };
    }
    // Cooldown: 1 user can only give once per hour
    const data = getKarma(db, gid);
    if (!data.users[m.sender]) data.users[m.sender] = { points: 0, given: 0, received: 0, history: [] };
    const lastGive = data.users[m.sender].history.filter(h => h.amount < 0).pop();
    if (lastGive && Date.now() - lastGive.ts < 3600000) {
      const wait = Math.ceil((3600000 - (Date.now() - lastGive.ts)) / 60000);
      await m.reply(claraWrap("Group Karma", "Tunggu " + wait + " menit untuk kasih karma lagi."));
      return { handled: true };
    }
    const reason = args.slice(m.mentionedJid.length + 2).join(" ").trim() || "Kontribusi bagus";
    const pts = addKarma(db, gid, target, 1, reason);
    addKarma(db, gid, m.sender, -1, "Memberi karma");
    await m.reply(claraWrap("Group Karma", "@" + target.split("@")[0] + " dapat +1 karma!\nAlasan: " + reason + "\nTotal karma: " + pts), { mentions: [target] });
    return { handled: true };
  }

  // ==================== LEADERBOARD
  if (sub === "lb" || sub === "leaderboard" || sub === "top") {
    const data = getKarma(db, gid);
    const sorted = Object.entries(data.users)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);
    if (sorted.length === 0) {
      await m.reply(claraWrap("Group Karma", "Belum ada karma. Ketik " + prefix + "gkarma give @member."));
      return { handled: true };
    }
    const list = sorted.map(([jid, u], i) => {
      const medal = i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : (i + 1) + ".";
      return medal + " @" + jid.split("@")[0] + " - " + u.points + " karma";
    }).join("\n");
    await m.reply(claraWrap("Karma Leaderboard", list), { mentions: sorted.map(([jid]) => jid) });
    return { handled: true };
  }

  // ==================== HISTORY
  if (sub === "history" || sub === "riwayat") {
    const data = getKarma(db, gid);
    const user = data.users[m.sender];
    if (!user || user.history.length === 0) {
      await m.reply(claraWrap("Group Karma", "Belum ada riwayat karma."));
      return { handled: true };
    }
    const list = user.history.slice(-5).map(h => {
      const sign = h.amount > 0 ? "+" : "";
      return sign + h.amount + " - " + h.reason;
    }).join("\n");
    await m.reply(claraWrap("Karma History", "5 terakhir:\n" + list));
    return { handled: true };
  }

  // ==================== RESET (owner)
  if (sub === "reset") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Group Karma", "Khusus owner."));
      return { handled: true };
    }
    saveKarma(db, gid, { users: {}, lastReset: Date.now() });
    await m.reply(claraWrap("Group Karma", "Karma grup direset."));
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(claraWrap("Group Karma", [
    "GROUP KARMA",
    "",
    "Cara pakai:",
    prefix + "gkarma cek - lihat karma kamu",
    prefix + "gkarma give @member [alasan] - kasih +1",
    prefix + "gkarma lb - leaderboard top 10",
    prefix + "gkarma history - 5 terakhir",
    prefix + "gkarma reset (owner)",
    "",
    "Level: Newbie < Member < Pro < Expert < Master < Legend",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
