// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// autoswgc.js — AUTO SWGC: kirim Group Status (border hijau) ke semua grup
// secara TERJADWAL (porting AutoSWGC script JPM APENBOTZ, 21 Sep 2026,
// request owner "sw gc jga tmbah ke rara jka di rara blm ada"). Rara sudah
// punya SWGC MANUAL (.swgc/.swgcall/.swgcv2/.swgcv2all) — yang BELUM ada
// versi OTOMATIS: jam:menit WIB → broadcast groupStatusMessage ke semua
// grup (minus blacklist), caption + media persist (reply foto/video),
// fallback teks, jeda antar grup anti spam-ban, laporan DM owner.
// Persisten db.data.autoswgc — restart dilanjut otomatis via scheduler.
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { formatTime, formatDate } from "../../src/lib/rara-time.js";
import { config } from "../../config.js";

const pluginConfig = {
  name: "autoswgc",
  alias: ["autoswgc"],
  category: "owner",
  description: "Auto SWGC — kirim status grup terjadwal ke semua grup (border hijau)",
  usage: ".autoswgc status | on/off | caption <teks> | media (reply) | time add/del HH:mm | delay <detik> | blacklist | tes",
  example: ".autoswgc time add 08:00",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ── konfigurasi persisten ──
function ensureCfg(db) {
  if (!db.data.autoswgc || typeof db.data.autoswgc !== "object") {
    db.data.autoswgc = {};
  }
  const c = db.data.autoswgc;
  if (!Array.isArray(c.time)) c.time = ["08:00", "20:00"];
  if (typeof c.caption !== "string") c.caption = "";
  if (typeof c.mediaFile !== "string" && c.mediaFile !== null) c.mediaFile = null;
  if (typeof c.delaySec !== "number" || !c.delaySec) c.delaySec = 21;
  if (!Array.isArray(c.blacklist)) c.blacklist = [];
  if (typeof c.on !== "boolean") c.on = false;
  return c;
}

function mediaPath() {
  const dir = path.join(process.cwd(), "temp", "autoswgc-media");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ownerJid() {
  const n = (config.owner?.number || [])[0] || "";
  const digits = String(n).replace(/\D/g, "");
  return digits ? digits + "@s.whatsapp.net" : "";
}

async function dmOwner(sock, text) {
  const jid = ownerJid();
  if (!sock || !jid) return false;
  try {
    await sock.sendMessage(jid, { text });
    return true;
  } catch {
    return false;
  }
}

let _delayMsForTest = null;
export function _setSwgcDelayForTest(ms) { _delayMsForTest = ms; }
export function _resetSwgcDelayForTest() { _delayMsForTest = null; }
const delay = (ms) => new Promise((r) => setTimeout(r, _delayMsForTest ?? ms));

/** Deteksi jenis media dari buffer — tanpa dep file-type (biar ringan). */
function mediaKindOf(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image"; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image"; // PNG
  if (buf.slice(4, 8).toString() === "ftyp") return "video"; // MP4/MOV
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image";
  return null;
}

/** Kirim 1x ke SEMUA grup (minus blacklist) — dipakai scheduler & .autoswgc tes. */
export async function runAutoSwgcOnce(sock, db, opts = {}) {
  const cfg = ensureCfg(db);
  if (cfg.running) return { skipped: "running" };
  cfg.running = true;
  db.save();
  const result = { total: 0, success: 0, failed: [], media: "teks" };
  try {
    const groups = Object.entries(await sock.groupFetchAllParticipating());
    const targets = groups.filter(([jid]) => jid.endsWith("@g.us") && !cfg.blacklist.includes(jid));
    result.total = targets.length;
    if (!targets.length) return result;

    let content = null;
    if (cfg.mediaFile && fs.existsSync(cfg.mediaFile)) {
      try {
        const buf = fs.readFileSync(cfg.mediaFile);
        const kind = mediaKindOf(buf);
        if (kind === "image") { content = { image: buf, caption: cfg.caption || "" }; result.media = "foto"; }
        else if (kind === "video") { content = { video: buf, caption: cfg.caption || "" }; result.media = "video"; }
      } catch { /* fallback teks di bawah */ }
    }
    if (!content) {
      if (!cfg.caption) return { skipped: "kosong" };
      content = { text: cfg.caption };
      result.media = "teks";
    }

    for (let i = 0; i < targets.length; i++) {
      const [jid, meta] = targets[i];
      try {
        await sock.sendMessage(jid, { groupStatusMessage: content });
        result.success++;
      } catch (e) {
        result.failed.push(meta?.subject || jid);
      }
      if (i < targets.length - 1) await delay((cfg.delaySec || 21) * 1000);
    }
    return result;
  } finally {
    cfg.running = false;
    db.save();
  }
}

// ── scheduler terjadwal (pola JPM: cek tiap 30 dtk, dedupe per hari) ──
let _timer = null;
const _sentKeys = new Set();

export async function checkAutoSwgc(sock) {
  const db = getDatabase();
  const cfg = ensureCfg(db);
  if (!cfg.on || cfg.running) return false;
  const hm = formatTime("HH:mm");
  const day = formatDate("YYYY-MM-DD");
  const key = `${day}_${hm}`;
  for (const k of [..._sentKeys]) if (!k.startsWith(day)) _sentKeys.delete(k);
  if (!(cfg.time || []).includes(hm) || _sentKeys.has(key)) return false;
  _sentKeys.add(key);
  const res = await runAutoSwgcOnce(sock, db);
  if (res && res.skipped === "kosong") {
    await dmOwner(sock, `AutoSWGC: jadwal ${hm} WIB dilewati — caption & media masih kosong. Set via .autoswgc caption <teks>`);
    return false;
  }
  await dmOwner(sock, `AutoSWGC ${hm} WIB selesai: ${res.success}/${res.total} grup (${res.media})${res.failed?.length ? ` · gagal: ${res.failed.join(", ")}` : ""}`);
  return true;
}

export async function startAutoSwgc(sock) {
  if (_timer) clearInterval(_timer);
  _timer = setInterval(async () => {
    try { await checkAutoSwgc(sock); } catch {}
  }, 30000);
  return true;
}

export function _clearSwgcSentKeysForTest() { _sentKeys.clear(); }
export function _getSwgcTimerForTest() { return _timer; }

// ────────────────────────────────────────────────────────────────────────────
// HANDLER — .autoswgc <sub>
// ────────────────────────────────────────────────────────────────────────────
function fmtCfg(cfg) {
  const media = cfg.mediaFile && fs.existsSync(cfg.mediaFile)
    ? `ada (${mediaKindOf(fs.readFileSync(cfg.mediaFile)) || "file"})`
    : "belum ada";
  return raraWrap("Auto SWGC", [
    `Status: ${cfg.on ? "🟢 AKTIF" : "🔴 MATI"}`,
    "",
    `⏰ Jadwal: ${(cfg.time || []).join(", ") || "-"} WIB`,
    `📝 Caption: ${cfg.caption ? cfg.caption.slice(0, 60) : "-"}`,
    `🖼️ Media: ${media}`,
    `⏳ Jeda antar grup: ${cfg.delaySec}s`,
    `🚫 Blacklist: ${cfg.blacklist.length} grup`,
    "",
    "Sub: on/off · caption <teks> · media (reply foto/video) · media clear",
    "time add/del HH:mm · delay <detik> · blacklist (di grup) · blacklist list · tes",
  ]);
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cfg = ensureCfg(db);
  const args = (m.args || []).map(String);
  const sub = (args[0] || "status").toLowerCase();
  const rest = (m.text || "").trim();

  // caption <teks>
  if (sub === "caption") {
    const teks = rest.replace(/^\S+\s+\S+\s?/, "").trim();
    if (!teks) return m.reply(raraWrap("Auto SWGC", "Kasih teksnya: .autoswgc caption Selamat pagi semua!", "error"));
    cfg.caption = teks;
    db.save();
    return m.reply(raraWrap("Auto SWGC", `Caption ke-simpen: "${teks.slice(0, 80)}"`));
  }

  // media — reply foto/video → simpan persist
  if (sub === "media") {
    if ((args[1] || "").toLowerCase() === "clear") {
      if (cfg.mediaFile && fs.existsSync(cfg.mediaFile)) {
        try { fs.unlinkSync(cfg.mediaFile); } catch {}
      }
      cfg.mediaFile = null;
      db.save();
      return m.reply(raraWrap("Auto SWGC", "Media AutoSWGC dihapus — nanti kirim teks caption doang."));
    }
    const src = m.quoted?.isImage || m.quoted?.isVideo ? m.quoted : (m.isImage || m.isVideo ? m : null);
    if (!src) return m.reply(raraWrap("Auto SWGC", "Reply foto/video yang mau jadi media AutoSWGC, atau .autoswgc media clear", "error"));
    try {
      const buf = await src.download();
      if (!buf || buf.length < 100) throw new Error("media kosong");
      const kind = mediaKindOf(buf);
      if (!kind) throw new Error("jenis media gak dikenal (harus foto/video)");
      const file = path.join(mediaPath(), `autoswgc.${kind === "image" ? "jpg" : "mp4"}`);
      fs.writeFileSync(file, buf);
      // hapus media lama jenis beda
      for (const f of ["autoswgc.jpg", "autoswgc.mp4"]) {
        const p = path.join(mediaPath(), f);
        if (p !== file && fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
      }
      cfg.mediaFile = file;
      db.save();
      return m.reply(raraWrap("Auto SWGC", `Media ${kind === "image" ? "foto" : "video"} ke-simpen (persist, aman pas restart).`));
    } catch (e) {
      return m.reply(raraWrap("Auto SWGC", `Gagal simpen media: ${e?.message || e}`, "error"));
    }
  }

  // time add/del/list
  if (sub === "time") {
    const act = (args[1] || "list").toLowerCase();
    const val = (args[2] || "").trim();
    if (act === "list") {
      return m.reply(raraWrap("Auto SWGC", `Jadwal: ${(cfg.time || []).join(", ") || "-"} WIB`));
    }
    if (!/^\d{1,2}:\d{2}$/.test(val)) {
      return m.reply(raraWrap("Auto SWGC", "Format jam HH:mm ya, contoh: .autoswgc time add 08:00", "error"));
    }
    const [hh, mm] = val.split(":").map(Number);
    const norm = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    if (hh > 23 || mm > 59) return m.reply(raraWrap("Auto SWGC", "Jam gak valid (HH 00-23, mm 00-59).", "error"));
    if (act === "add") {
      if (cfg.time.includes(norm)) return m.reply(raraWrap("Auto SWGC", `Jadwal ${norm} udah ada.`));
      cfg.time.push(norm);
      cfg.time.sort();
      db.save();
      return m.reply(raraWrap("Auto SWGC", `Jadwal ${norm} WIB ditambah. Sekarang: ${cfg.time.join(", ")}`));
    }
    if (act === "del") {
      const i = cfg.time.indexOf(norm);
      if (i < 0) return m.reply(raraWrap("Auto SWGC", `Jadwal ${norm} gak ada di daftar.`, "error"));
      cfg.time.splice(i, 1);
      db.save();
      return m.reply(raraWrap("Auto SWGC", `Jadwal ${norm} WIB dihapus. Sisa: ${cfg.time.join(", ") || "-"}`));
    }
    return m.reply(raraWrap("Auto SWGC", "Sub time: add <HH:mm> · del <HH:mm> · list", "error"));
  }

  // delay <detik>
  if (sub === "delay") {
    const d = parseInt(args[1], 10);
    if (!d || d < 3 || d > 120) return m.reply(raraWrap("Auto SWGC", "Delay 3-120 detik ya, contoh: .autoswgc delay 21", "error"));
    cfg.delaySec = d;
    db.save();
    return m.reply(raraWrap("Auto SWGC", `Jeda antar grup: ${d}s`));
  }

  // blacklist — dipakai DI GRUP (toggle grup itu)
  if (sub === "blacklist") {
    const act = (args[1] || "toggle").toLowerCase();
    if (act === "list") {
      return m.reply(raraWrap("Auto SWGC", `Blacklist ${cfg.blacklist.length} grup:\n${cfg.blacklist.join("\n") || "-"}`));
    }
    if (act === "clear") {
      cfg.blacklist = [];
      db.save();
      return m.reply(raraWrap("Auto SWGC", "Blacklist dikosongkan — semua grup kembali dikirimi."));
    }
    if (!m.isGroup || !m.chat?.endsWith("@g.us")) {
      return m.reply(raraWrap("Auto SWGC", "Blacklist dipakai DI DALAM grup yang mau di-skip: .autoswgc blacklist (toggle) · list · clear", "error"));
    }
    const i = cfg.blacklist.indexOf(m.chat);
    if (i >= 0) {
      cfg.blacklist.splice(i, 1);
      db.save();
      return m.reply(raraWrap("Auto SWGC", `Grup ini DIKELUARKAN dari blacklist — AutoSWGC aktif lagi di sini.`));
    }
    cfg.blacklist.push(m.chat);
    db.save();
    return m.reply(raraWrap("Auto SWGC", `Grup ini DIBLACKLIST — AutoSWGC skip grup ini.`));
  }

  // tes / kirim — jalankan SEKARANG
  if (sub === "tes" || sub === "kirim") {
    const res = await runAutoSwgcOnce(sock, db);
    if (res?.skipped === "kosong") {
      return m.reply(raraWrap("Auto SWGC", "Caption & media masih kosong — set dulu via .autoswgc caption <teks>", "error"));
    }
    if (res?.skipped === "running") {
      return m.reply(raraWrap("Auto SWGC", "Masih ada pengiriman berjalan — sabar ya."));
    }
    return m.reply(raraWrap("Auto SWGC", [
      `Tes kirim selesai: ${res.success}/${res.total} grup (${res.media})`,
      ...(res.failed?.length ? ["", `Gagal: ${res.failed.join(", ")}`] : []),
    ]));
  }

  // on/off
  if (sub === "on" || sub === "off") {
    cfg.on = sub === "on";
    db.save();
    return m.reply(raraWrap("Auto SWGC", `AutoSWGC ${cfg.on ? "DIHIDUPKAN 🟢" : "DIMATIKAN 🔴"} — jadwal: ${cfg.time.join(", ")} WIB`));
  }

  // status / default
  return m.reply(fmtCfg(cfg));
}

export { pluginConfig as config, handler, ensureCfg };
