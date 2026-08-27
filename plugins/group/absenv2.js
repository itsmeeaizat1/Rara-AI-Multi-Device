// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "absenv2",
  alias: ["absenv2"],
  category: "group",
  description: "Sistem absensi grup v2 - RSVP, jadwal, history, attendance rate",
  usage: ".absenv2 <create/list/hadir/absen/maybe/close/info/history/stats>",
  example: ".absenv2 create Rapat Mingguan | 15-08-2026 20:00 | 2h",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function genId() {
  return "ABS-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function formatTime(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return dd + "/" + mm + "/" + yyyy + " " + hh + ":" + mi;
}

function formatDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

// Parse duration: 30s, 15m, 2h, 1d
function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (mult[unit] || 0);
}

function formatCountdown(ms) {
  if (ms <= 0) return "Berakhir";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return h + "j " + m + "m";
  if (m > 0) return m + "m " + s + "d";
  return s + "d";
}

// Get all group events
function getEvents(db, groupId) {
  const all = db.setting("absenv2") || {};
  return all[groupId] || [];
}

function saveEvents(db, groupId, events) {
  const all = db.setting("absenv2") || {};
  all[groupId] = events;
  db.setting("absenv2", all);
  db.save();
}

// Parse date string: DD-MM-YYYY HH:MM
function parseDateTime(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]));
  return d.getTime();
}

// Auto-close expired events
function autoClose(db, sock) {
  const all = db.setting("absenv2") || {};
  const now = Date.now();
  let changed = false;

  for (const [gid, events] of Object.entries(all)) {
    for (const ev of events) {
      if (!ev.closed && !ev.cancelled && ev.deadline && now >= ev.deadline) {
        ev.closed = true;
        ev.closedAt = now;
        changed = true;

        // Announce summary
        const hadir = ev.responses.filter((r) => r.status === "hadir");
        const tidak = ev.responses.filter((r) => r.status === "tidak");
        const mungkin = ev.responses.filter((r) => r.status === "mungkin");
        const noResponse = ev.totalMembers - ev.responses.length;

        let lines = [
          "Event: *" + ev.title + "*",
          "ID: `" + ev.id + "`",
          "Hadir: " + hadir.length,
          "Tidak Hadir: " + tidak.length,
          "Mungkin: " + mungkin.length,
          "Belum Respon: " + Math.max(0, noResponse),
        ];

        if (hadir.length > 0) {
          lines.push("");
          lines.push("Yang Hadir:");
          hadir.forEach((r, i) => {
            lines.push((i + 1) + ". @" + r.jid.split("@")[0]);
          });
        }

        sock.sendMessage(gid, {
          text: claraWrap("Absensi Ditutup", lines.join("\n")),
        }).catch((e) => { console.error('[absenv2.js]:', e.message); });
      }
    }
  }

  if (changed) {
    db.setting("absenv2", all);
    db.save();
  }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const gid = m.chat || m.key?.remoteJid || "";

    // Auto-close expired
    autoClose(db, sock);

    // --- CREATE EVENT ---
    if (action === "create" || action === "buat") {
      // Admin only
      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.isOwner || m.sender === botConfig.owner?.[0];
      if (!isAdmin && !isOwner) {
        return m.reply(claraWrap("Absen v2", "Hanya admin yg bisa membuat event absensi"));
      }

      const parts = args.slice(1).join(" ").split("|").map((s) => s.trim());
      if (parts.length < 1) {
        return m.reply(
          prefix + "absenv2 create <judul> | <tanggal jam> | <durasi>\n\n" +
          "Tanggal format: DD-MM-YYYY HH:MM\n" +
          "Durasi: 30s / 15m / 2h / 1d (waktu respon)\n\n" +
          "Contoh:\n" +
          prefix + "absenv2 create Rapat Mingguan | 15-08-2026 20:00 | 2h\n" +
          prefix + "absenv2 create Absen Pagi | 16-08-2026 08:00 | 12h\n" +
          prefix + "absenv2 create Rapat Koordinasi (tanpa deadline)",
          { title: "Absen v2 - Create" }
        );
      }

      const title = parts[0];
      const dateTimeStr = parts[1] || "";
      const durStr = parts[2] || "";

      let eventTime = Date.now();
      let deadline = null;

      if (dateTimeStr) {
        const parsed = parseDateTime(dateTimeStr);
        if (!parsed) {
          return m.reply(claraWrap("Absen v2", "Format tanggal salah! Gunakan: DD-MM-YYYY HH:MM\n💡 *Contoh:* 15-08-2026 20:00"));
        }
        eventTime = parsed;
      }

      if (durStr) {
        const dur = parseDuration(durStr);
        if (!dur) {
          return m.reply(claraWrap("Absen v2", "Format durasi salah! Gunakan: 30s / 15m / 2h / 1d"));
        }
        deadline = (dateTimeStr ? eventTime : Date.now()) + dur;
      }

      // Get member count
      const memberCount = groupMeta?.participants?.length || 0;

      const events = getEvents(db, gid);
      const evId = genId();
      const ev = {
        id: evId,
        title,
        eventTime,
        deadline,
        createdBy: m.sender,
        createdAt: Date.now(),
        responses: [],
        totalMembers: memberCount,
        closed: false,
        cancelled: false,
        closedAt: null,
      };

      events.push(ev);
      saveEvents(db, gid, events);

      let lines = [
        "Judul: *" + title + "*",
        "ID: `" + evId + "`",
        "Waktu Event: " + formatTime(eventTime),
      ];
      if (deadline) {
        lines.push("Deadline Respon: " + formatTime(deadline));
        const remaining = deadline - Date.now();
        if (remaining > 0) lines.push("Sisa Waktu: " + formatCountdown(remaining));
      } else {
        lines.push("Deadline: Tidak ada (manual close)");
      }
      lines.push("Total Member: " + memberCount);
      lines.push("");
      lines.push("Ketik salah satu:");
      lines.push(prefix + "absenv2 hadir " + evId);
      lines.push(prefix + "absenv2 tidak " + evId);
      lines.push(prefix + "absenv2 mungkin " + evId);

      await m.react("🐣");
      return m.reply(claraWrap("Event Absensi Dibuat", lines.join("\n")));
    }

    // --- RESPONSE (hadir/tidak/maybe) ---
    if (action === "hadir" || action === "tidak" || action === "absen" || action === "mungkin") {
      const evId = args[1]?.toUpperCase();
      if (!evId) {
        return m.reply(claraWrap("Absen v2", "Format: " + prefix + "absenv2 <hadir/tidak/mungkin> <ID>"));
      }

      const events = getEvents(db, gid);
      const ev = events.find((e) => e.id === evId);
      if (!ev) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` tidak ditemukan"));
      }
      if (ev.closed) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` sudah ditutup"));
      }
      if (ev.cancelled) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` sudah dibatalkan"));
      }
      if (ev.deadline && Date.now() > ev.deadline) {
        return m.reply(claraWrap("Absen v2", "Deadline respon sudah lewat untuk event `" + evId + "`"));
      }

      // Map action to status
      let status;
      if (action === "hadir") status = "hadir";
      else if (action === "tidak" || action === "absen") status = "tidak";
      else if (action === "mungkin") status = "mungkin";

      // Check if already responded
      const existing = ev.responses.find((r) => r.jid === m.sender);
      if (existing) {
        existing.status = status;
        existing.time = Date.now();
      } else {
        ev.responses.push({ jid: m.sender, status, time: Date.now() });
      }

      saveEvents(db, gid, events);

      const hadir = ev.responses.filter((r) => r.status === "hadir").length;
      const tidak = ev.responses.filter((r) => r.status === "tidak").length;
      const mungkin = ev.responses.filter((r) => r.status === "mungkin").length;

      await m.react("🐣");
      return m.reply(claraWrap("Respon Tercatat",
        "Status: *" + status.toUpperCase() + "*\n" +
        "Event: " + ev.title + "\n\n" +
        "Hadir: " + hadir + " | Tidak: " + tidak + " | Mungkin: " + mungkin + "\n" +
        "Belum respon: " + Math.max(0, ev.totalMembers - ev.responses.length)
      ));
    }

    // --- LIST ---
    if (action === "list") {
      const events = getEvents(db, gid);
      const active = events.filter((e) => !e.closed && !e.cancelled);

      if (active.length === 0) {
        return m.reply(claraWrap("Absen v2", "Belum ada event aktif.\nBuat: " + prefix + "absenv2 create <judul> | <tgl> | <durasi>"));
      }

      let lines = [];
      active.forEach((ev, i) => {
        const hadir = ev.responses.filter((r) => r.status === "hadir").length;
        const total = ev.responses.length;
        let status = "";
        if (ev.deadline) {
          const remaining = ev.deadline - Date.now();
          status = remaining > 0 ? formatCountdown(remaining) : "LEWAT";
        } else {
          status = "manual";
        }
        lines.push(
          (i + 1) + ". " + ev.id + " | " + ev.title + " | " +
          "H:" + hadir + "/R:" + total + "/" + ev.totalMembers + " | " + status
        );
      });

      return m.reply(claraWrap("Event Absensi Aktif", lines.join("\n")));
    }

    // --- INFO ---
    if (action === "info") {
      const evId = args[1]?.toUpperCase();
      if (!evId) {
        return m.reply(claraWrap("Absen v2", "Format: " + prefix + "absenv2 info <ID>"));
      }

      const events = getEvents(db, gid);
      const ev = events.find((e) => e.id === evId);
      if (!ev) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` tidak ditemukan"));
      }

      const hadir = ev.responses.filter((r) => r.status === "hadir");
      const tidak = ev.responses.filter((r) => r.status === "tidak");
      const mungkin = ev.responses.filter((r) => r.status === "mungkin");
      const belum = ev.totalMembers - ev.responses.length;

      let lines = [
        "Judul: *" + ev.title + "*",
        "ID: `" + ev.id + "`",
        "Waktu: " + formatTime(ev.eventTime),
        "Dibuat oleh: @" + ev.createdBy.split("@")[0],
        "Status: " + (ev.cancelled ? "Dibatalkan" : ev.closed ? "Ditutup" : "Aktif"),
      ];

      if (ev.deadline) {
        const remaining = ev.deadline - Date.now();
        lines.push("Deadline: " + formatTime(ev.deadline) + " (" + (remaining > 0 ? formatCountdown(remaining) : "lewat") + ")");
      }

      lines.push("");
      lines.push("Hadir (" + hadir.length + "):");
      if (hadir.length > 0) {
        hadir.forEach((r, i) => lines.push((i + 1) + ". @" + r.jid.split("@")[0]));
      } else {
        lines.push("Belum ada");
      }

      lines.push("");
      lines.push("Tidak Hadir (" + tidak.length + "):");
      if (tidak.length > 0) {
        tidak.forEach((r, i) => lines.push((i + 1) + ". @" + r.jid.split("@")[0]));
      } else {
        lines.push("Belum ada");
      }

      lines.push("");
      lines.push("Mungkin (" + mungkin.length + "):");
      if (mungkin.length > 0) {
        mungkin.forEach((r, i) => lines.push((i + 1) + ". @" + r.jid.split("@")[0]));
      } else {
        lines.push("Belum ada");
      }

      lines.push("");
      lines.push("Belum Respon: " + Math.max(0, belum));

      return m.reply(claraWrap("Info Absensi", lines.join("\n")));
    }

    // --- CLOSE ---
    if (action === "close" || action === "tutup") {
      const evId = args[1]?.toUpperCase();
      if (!evId) {
        return m.reply(claraWrap("Absen v2", "Format: " + prefix + "absenv2 close <ID>"));
      }

      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.isOwner || m.sender === botConfig.owner?.[0];
      if (!isAdmin && !isOwner) {
        return m.reply(claraWrap("Absen v2", "Hanya admin yg bisa menutup event"));
      }

      const events = getEvents(db, gid);
      const ev = events.find((e) => e.id === evId);
      if (!ev) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` tidak ditemukan"));
      }
      if (ev.closed) {
        return m.reply(claraWrap("Absen v2", "Event sudah ditutup"));
      }

      ev.closed = true;
      ev.closedAt = Date.now();
      saveEvents(db, gid, events);

      const hadir = ev.responses.filter((r) => r.status === "hadir");
      const tidak = ev.responses.filter((r) => r.status === "tidak");
      const mungkin = ev.responses.filter((r) => r.status === "mungkin");
      const belum = Math.max(0, ev.totalMembers - ev.responses.length);

      let lines = [
        "Event: *" + ev.title + "*",
        "ID: `" + ev.id + "`",
        "Hadir: " + hadir.length,
        "Tidak Hadir: " + tidak.length,
        "Mungkin: " + mungkin.length,
        "Belum Respon: " + belum,
        "",
        "Yang Hadir:",
      ];

      if (hadir.length > 0) {
        hadir.forEach((r, i) => lines.push((i + 1) + ". @" + r.jid.split("@")[0]));
      } else {
        lines.push("Tidak ada");
      }

      await m.react("🐣");
      return m.reply(claraWrap("Absensi Ditutup", lines.join("\n")));
    }

    // --- CANCEL ---
    if (action === "cancel") {
      const evId = args[1]?.toUpperCase();
      if (!evId) {
        return m.reply(claraWrap("Absen v2", "Format: " + prefix + "absenv2 cancel <ID>"));
      }

      const groupMeta = await sock.groupMetadata(gid).catch(() => null);
      const isAdmin = groupMeta?.participants?.some(
        (p) => p.id === m.sender && (p.admin === "admin" || p.admin === "superadmin")
      );
      const isOwner = m.isOwner || m.sender === botConfig.owner?.[0];
      if (!isAdmin && !isOwner) {
        return m.reply(claraWrap("Absen v2", "Hanya admin yg bisa membatalkan event"));
      }

      const events = getEvents(db, gid);
      const ev = events.find((e) => e.id === evId);
      if (!ev) {
        return m.reply(claraWrap("Absen v2", "Event `" + evId + "` tidak ditemukan"));
      }

      ev.cancelled = true;
      saveEvents(db, gid, events);

      await m.react("🐣");
      return m.reply(claraWrap("Absen v2", "Event *" + ev.title + "* dibatalkan"));
    }

    // --- HISTORY ---
    if (action === "history") {
      const events = getEvents(db, gid);
      const past = events.filter((e) => e.closed || e.cancelled);

      if (past.length === 0) {
        return m.reply(claraWrap("Absen v2", "Belum ada riwayat event di grup ini"));
      }

      past.sort((a, b) => (b.closedAt || b.createdAt) - (a.closedAt || a.createdAt));

      let lines = [];
      past.slice(0, 10).forEach((ev, i) => {
        const hadir = ev.responses.filter((r) => r.status === "hadir").length;
        const status = ev.cancelled ? "Batal" : "Selesai";
        lines.push(
          (i + 1) + ". " + ev.id + " | " + ev.title + " | " +
          "Hadir: " + hadir + "/" + ev.totalMembers + " | " + status + " | " +
          formatDate(ev.closedAt || ev.createdAt)
        );
      });

      return m.reply(claraWrap("Riwayat Absensi", lines.join("\n")));
    }

    // --- STATS ---
    if (action === "stats") {
      const events = getEvents(db, gid);
      if (events.length === 0) {
        return m.reply(claraWrap("Absen v2", "Belum ada data event."));
      }

      const completed = events.filter((e) => e.closed && !e.cancelled);
      const totalEvents = completed.length;
      const totalResponses = completed.reduce((sum, e) => sum + e.responses.length, 0);
      const totalHadir = completed.reduce((sum, e) =>
        sum + e.responses.filter((r) => r.status === "hadir").length, 0);
      const totalTidak = completed.reduce((sum, e) =>
        sum + e.responses.filter((r) => r.status === "tidak").length, 0);
      const totalMungkin = completed.reduce((sum, e) =>
        sum + e.responses.filter((r) => r.status === "mungkin").length, 0);

      const avgAttendance = totalResponses > 0
        ? Math.round((totalHadir / totalResponses) * 100) : 0;

      // Per-user attendance rate (top 10 most active)
      const userStats = {};
      completed.forEach((ev) => {
        ev.responses.forEach((r) => {
          if (!userStats[r.jid]) userStats[r.jid] = { hadir: 0, tidak: 0, mungkin: 0, total: 0 };
          userStats[r.jid][r.status]++;
          userStats[r.jid].total++;
        });
      });

      const topUsers = Object.entries(userStats)
        .sort((a, b) => b[1].hadir - a[1].hadir)
        .slice(0, 5);

      let lines = [
        "Total Event Selesai: " + totalEvents,
        "Total Respon: " + totalResponses,
        "Hadir: " + totalHadir,
        "Tidak Hadir: " + totalTidak,
        "Mungkin: " + totalMungkin,
        "Avg Kehadiran: " + avgAttendance + "%",
      ];

      if (topUsers.length > 0) {
        lines.push("");
        lines.push("Top Kehadiran:");
        topUsers.forEach(([jid, s], i) => {
          lines.push((i + 1) + ". @" + jid.split("@")[0] + " - H:" + s.hadir + " T:" + s.tidak + " M:" + s.mungkin);
        });
      }

      return m.reply(claraWrap("Statistik Absensi", lines.join("\n")));
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "absenv2 create <judul> | <DD-MM-YYYY HH:MM> | <durasi>\n" +
      prefix + "absenv2 hadir <ID>\n" +
      prefix + "absenv2 tidak <ID>\n" +
      prefix + "absenv2 mungkin <ID>\n" +
      prefix + "absenv2 list\n" +
      prefix + "absenv2 info <ID>\n" +
      prefix + "absenv2 close <ID>\n" +
      prefix + "absenv2 cancel <ID>\n" +
      prefix + "absenv2 history\n" +
      prefix + "absenv2 stats\n\n" +
      "Durasi: 30s / 15m / 2h / 1d\n" +
      "RSVP: hadir / tidak / mungkin",
      { title: "Absen v2 - Menu" }
    );
  } catch (e) {
    console.error("absenv2 error:", e);
    return m.reply(claraWrap("Absen v2", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
