// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/absen.js — Absen otomatis grup (1 file, ESM)
// Command: .absenjam buka <durasi> [judul] | .absen tutup | .absen status | .absen

import fs from "fs";
import { runLiveTicker } from "../src/lib/nova-countdown.js";
import { buildAbsenMeter } from "../src/lib/nova-absen-meter.js";
import path from "path";

// ── Module state (restart-safe: data di JSON, bukan RAM) ──
let _sock = null;
let _botJid = null;
let _watcherStarted = false;
let _upsertHooked = false;

const DB_PATH = path.join(process.cwd(), "src", "data", "absen.json");

// ── Database helpers ──
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) || {};
  } catch {
    return {};
  }
}

function saveDB(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[absen] saveDB error:", e.message);
  }
}

// ── Durasi parser ──
function parseDuration(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  let m;
  m = t.match(/^(\d+)\s*(detik|dtk|sec|s)$/); if (m) return parseInt(m[1]) * 1000;
  m = t.match(/^(\d+)\s*(menit|mnt|min|m)$/); if (m) return parseInt(m[1]) * 60 * 1000;
  m = t.match(/^(\d+)\s*(jam|jm|hour|hr|h)$/); if (m) return parseInt(m[1]) * 60 * 60 * 1000;
  m = t.match(/^(\d+)$/); if (m) return parseInt(m[1]) * 60 * 1000; // angka = menit
  return null;
}

function formatDuration(ms) {
  if (ms <= 0) return "0 detik";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} detik`;
  const m = Math.floor(s / 60), rs = s % 60;
  if (m < 60) return rs ? `${m} menit ${rs} detik` : `${m} menit`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm ? `${h} jam ${rm} menit` : `${h} jam`;
}

// ── Bot JID helper ──
function getBotJid() {
  if (_botJid) return _botJid;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "src", "data", "auth_info", "creds.json"), "utf-8",
    );
    _botJid = JSON.parse(raw).me?.id || null;
  } catch {}
  if (!_botJid && _sock?.user?.id) _botJid = _sock.user.id;
  return _botJid;
}

// ── Session helpers ──
function getSession(chatId) {
  return loadDB()[chatId] || null;
}

function setSession(chatId, session) {
  const data = loadDB();
  if (session === null) delete data[chatId];
  else data[chatId] = session;
  saveDB(data);
}

function isSessionActive(chatId) {
  const s = getSession(chatId);
  return !!(s && s.active && s.expiresAt > Date.now());
}

// ── Rekap (fungsi terpisah) ──
async function sendRekap(chatId) {
  try {
    const s = getSession(chatId);
    if (!s) return;

    const hadirList = s.hadir || [];
    let totalMembers = 0;
    let belumList = [];

    try {
      const meta = await _sock.groupMetadata(chatId);
      const botId = getBotJid() || _sock?.user?.id || "";
      const allMembers = (meta.participants || []).filter((p) => p.id !== botId);
      totalMembers = allMembers.length;
      const hadirJids = new Set(hadirList.map((h) => h.u));
      belumList = allMembers.filter((p) => !hadirJids.has(p.id));
    } catch {
      totalMembers = hadirList.length;
    }

    const totalHadir = hadirList.length;
    const totalBelum = belumList.length;
    const persen = totalMembers > 0 ? Math.round((totalHadir / totalMembers) * 100) : 0;

    let teks = `⏳ REKAP ABSEN: ${s.title || "Absen Grup"}\n\n`;
    teks += `✅ Hadir: ${totalHadir}/${totalMembers} (${persen}%)\n`;
    if (totalMembers > 0) {
      teks += buildAbsenMeter(totalHadir, totalMembers).lines.join("\n") + "\n";
    }
    teks += `❌ Belum: ${totalBelum}\n`;

    if (totalHadir > 0) {
      teks += `\n✅ DAFTAR HADIR:\n`;
      hadirList.slice(0, 25).forEach((h, i) => {
        const num = h.u.split("@")[0];
        const tag = h.late ? " (telat)" : "";
        teks += `${i + 1}. ${num}${tag}\n`;
      });
      if (hadirList.length > 25) teks += `... dan ${hadirList.length - 25} lainnya\n`;
    }

    if (totalBelum > 0) {
      teks += `\n❌ BELUM ABSEN:\n`;
      belumList.slice(0, 15).forEach((p, i) => {
        teks += `${i + 1}. ${p.id.split("@")[0]}\n`;
      });
      if (belumList.length > 15) teks += `... dan ${belumList.length - 15} lainnya\n`;
    }

    // Tutup sesi
    s.active = false;
    s.closedAt = Date.now();
    setSession(chatId, s);

    await _sock.sendMessage(chatId, { text: teks });
  } catch (e) {
    console.error("[absen] sendRekap error:", e.message);
  }
}

// ── Time watcher: setInterval 15 detik ──
function startWatcher() {
  if (_watcherStarted) return;
  _watcherStarted = true;

  setInterval(async () => {
    try {
      if (!_sock?.sendMessage) return;
      const data = loadDB();
      const now = Date.now();
      for (const chatId of Object.keys(data)) {
        const s = data[chatId];
        if (s && s.active && s.expiresAt && s.expiresAt <= now) {
          await sendRekap(chatId);
        }
      }
    } catch (e) {
      // Interval TIDAK boleh bikin bot mati
      console.error("[absen] watcher error:", e.message);
    }
  }, 15_000);

  console.log("[absen] watcher started (15s interval)");
}

// ── "hadir" catcher via sock.ev.on("messages.upsert") ──
function hookUpsert() {
  if (_upsertHooked || !_sock?.ev) return;
  _upsertHooked = true;

  _sock.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      if (type !== "notify") return;
      for (const msg of messages) {
        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";
        if (!body) continue;

        // Hanya teks PERSIS "hadir" (lowercase, trim, satu kata)
        if (body.trim().toLowerCase() !== "hadir") continue;

        // Skip dari bot sendiri
        if (msg.key?.fromMe) continue;

        const chatId = msg.key?.remoteJid;
        if (!chatId || !chatId.endsWith("@g.us")) continue;

        if (!isSessionActive(chatId)) continue;

        const sender = msg.key?.participant || msg.key?.remoteJid;
        if (!sender) continue;

        const data = loadDB();
        const s = data[chatId];
        if (!s || !s.active) continue;

        const now = Date.now();
        const elapsed = now - s.openedAt;
        const totalDur = s.expiresAt - s.openedAt;
        const pastHalf = elapsed > totalDur / 2;

        // Cek apakah sudah absen
        const existing = (s.hadir || []).find((h) => h.u === sender);
        if (existing) {
          // Ketik kedua kali: tandai telat kalau melewati setengah durasi
          if (pastHalf && !existing.late) {
            existing.late = true;
            existing.ts = now;
            setSession(chatId, s);
          }
          // React ⏳ (sudah absen, tidak dobel catat)
          try {
            await _sock.sendMessage(chatId, { react: { text: "⏳", key: msg.key } });
          } catch {}
          continue;
        }

        // Catat hadir baru
        s.hadir = s.hadir || [];
        s.hadir.push({ u: sender, ts: now, late: pastHalf });
        setSession(chatId, s);

        try {
          await _sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
        } catch {}
      }
    } catch (e) {
      console.error("[absen] upsert hook error:", e.message);
    }
  });

  console.log("[absen] upsert hook registered");
}

// ── Init: _conn pattern, diisi dari pesan pertama ──
function init(sock) {
  _sock = sock;
  hookUpsert();
  startWatcher();
}

// ── Plugin config ──
const pluginConfig = {
  name: "absenjam",
  alias: ["absenjam"],
  category: "group",
  description: "Absen otomatis grup",
  usage: ".absenjam buka <durasi> [judul] | .absenjam tutup | .absenjam status",
  example: ".absenjam buka 10 menit absen malam",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  isBotAdmin: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ── Handler ──
async function handler(m, { sock, config: botConfig }) {
  init(sock);

  // Loading: 🕒 saat diproses
  try { await m.react("🕒"); } catch {}

  const prefix = botConfig.command?.prefix || ".";
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();

  // ── HELP ──
  if (!sub) {
    try { await m.react("🐣"); } catch {}
    return m.reply(
      `⏳ ABSEN GRUP\n\n` +
      `Cara pakai:\n` +
      `.absen buka <durasi> [judul]\n` +
      `.absen tutup\n` +
      `.absen status\n\n` +
      `Durasi: 30 detik / 10 menit / 2 jam\n\n` +
      `Saat sesi aktif, member ketik "hadir" untuk absen.`,
    );
  }

  // ── BUKA ──
  if (sub === "buka") {
    // FIX (13 Sep): durText cuma ambil args[1] — unit di args[2] keabaikan
    // (".absenjam buka 2 jam" dibaca "2" = 2 MENIT!). Sekarang unit ditempel
    // ke durasi; judul mulai setelah unit.
    const UNITS = ["detik", "dtk", "sec", "menit", "mnt", "min", "jam", "jm", "hour", "h", "m", "s"];
    const durText = args[2] && UNITS.includes(String(args[2]).toLowerCase())
      ? `${args[1]} ${args[2]}`
      : args[1];
    if (!durText || !args[1]) {
      try { await m.react("❌"); } catch {}
      return m.reply(
        `❌ Durasi wajib diisi.\n\nContoh:\n.absen buka 10 menit absen malam\n.absen buka 2 jam\n.absen buka 30 detik`,
      );
    }

    const unitOffset = durText.includes(" ") ? 3 : 2;
    const durMs = parseDuration(durText);
    if (!durMs) {
      try { await m.react("❌"); } catch {}
      return m.reply(
        `❌ Format durasi tidak valid: "${durText}"\n\nContoh: 30 detik / 10 menit / 2 jam / 5 (menit)`,
      );
    }

    if (durMs < 30_000) { try { await m.react("❌"); } catch {} return m.reply(`❌ Durasi minimal 30 detik.`); }
    if (durMs > 86_400_000) { try { await m.react("❌"); } catch {} return m.reply(`❌ Durasi maksimal 24 jam.`); }

    if (isSessionActive(m.chat)) {
      try { await m.react("❌"); } catch {}
      return m.reply(`❌ Masih ada sesi aktif, tutup dulu dengan ${prefix}absenjam tutup`);
    }

    const title = args.slice(unitOffset).join(" ").trim() || "Absen Grup";
    const now = Date.now();

    setSession(m.chat, {
      active: true,
      title,
      openedAt: now,
      expiresAt: now + durMs,
      openedBy: m.sender,
      hadir: [],
    });

    try { await m.react("🐣"); } catch {}
    // 🔹 LIVE COUNTDOWN (13 Sep): kartu sesi nge-tick ke tenggat — bukan
    // kartu beku. Pas habis → "WAKTU ABSEN HABIS" + rekap otomatis dikirim
    // watcher. Dibatalkan senyap kalau sesi ditutup manual duluan.
    const tenggatTs = now + durMs;
    const bukaCard = (remMs) => {
      if (remMs <= 0) {
        // pas waktunya habis (closing tickCard(0)) → kartu habis
        return [
          `⏰ *WAKTU ABSEN HABIS!*`,
          ``,
          `Sesi "${title}" udah ditutup otomatis.`,
          `Rekap absen lagi dikirim ke grup...`,
        ].join("\n");
      }
      const mnt = Math.floor(remMs / 60000);
      const dtk = Math.floor((remMs % 60000) / 1000);
      const bar = "▰".repeat(Math.max(0, Math.min(10, Math.round((1 - remMs / durMs) * 10)))) + "▱".repeat(10 - Math.max(0, Math.min(10, Math.round((1 - remMs / durMs) * 10))));
      return [
        `✅ *Sesi absen dibuka: ${title}*`,
        ``,
        `⏱ Durasi: ${formatDuration(durMs)}`,
        `🎯 Tenggat: ${new Date(tenggatTs).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })} WIB`,
        ``,
        `⏳ Sisa waktu: ${mnt} menit ${String(dtk).padStart(2, "0")} detik`,
        `📊 ${bar}`,
        ``,
        `Ketik "hadir" untuk absen`,
      ].join("\n");
    };
    return runLiveTicker({
      sock, chat: m.chat, m,
      mode: "down",
      targetTs: tenggatTs,
      initialCard: bukaCard(durMs),
      tickCard: (st) => bukaCard(st.remainingMs),
      finalCard: () => [
        `✅ *Sesi absen ditutup sebelum waktu habis*`,
        ``,
        `Rekap absen lagi dikirim ke grup...`,
      ].join("\n"),
      maxEdits: 600,
      isCancelled: () => {
        const cur = getSession(m.chat);
        return !cur || !cur.active || cur.closedAt;
      },
    });
  }

  // ── TUTUP ──
  if (sub === "tutup") {
    const s = getSession(m.chat);
    if (!s || !s.active) {
      try { await m.react("❌"); } catch {}
      return m.reply(`❌ Tidak ada sesi absen aktif.`);
    }
    try { await m.react("🐣"); } catch {}
    await sendRekap(m.chat);
    return;
  }

  // ── STATUS ──
  if (sub === "status") {
    const s = getSession(m.chat);
    if (!s || !s.active) {
      try { await m.react("❌"); } catch {}
      return m.reply(`❌ Tidak ada sesi absen aktif.`);
    }

    const remaining = s.expiresAt - Date.now();
    if (remaining <= 0) {
      try { await m.react("🐣"); } catch {}
      return m.reply(`⏳ Sesi sudah berakhir, rekap sedang diproses...`);
    }

    try { await m.react("🐣"); } catch {}
    // 📊 METER KEHADIRAN: bar ▰▱ peserta vs anggota grup
    let meterLine = "";
    try {
      const meta = await sock.groupMetadata(m.chat);
      const botId = getBotJid() || sock?.user?.id || "";
      const totalMembers = (meta.participants || []).filter((p) => p.id !== botId).length;
      if (totalMembers > 0) {
        meterLine = "\n" + buildAbsenMeter(s.hadir.length, totalMembers).lines.join("\n");
      }
    } catch {}
    return m.reply(
      `⏳ STATUS ABSEN: ${s.title || "Absen Grup"}\n\n` +
      `Sisa waktu: ${formatDuration(remaining)}\n` +
      `Sudah hadir: ${s.hadir.length}` +
      meterLine +
      `\nDibuka oleh: ${s.openedBy.split("@")[0]}`,
    );
  }

  try { await m.react("❌"); } catch {}
  return m.reply(`❌ Subcommand tidak dikenal: "${sub}"\n\nGunakan: buka / tutup / status`);
}

export { pluginConfig as config, handler };
