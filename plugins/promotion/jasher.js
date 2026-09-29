// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .jasher — broadcast promosi/pengumuman ke semua grup yang bot join
// (WA + Telegram via novabridge). Viral ala fitur "Jasher" di Telegram:
// owner kirim teks promosi (atau gambar/video + caption) dari DM/grup →
// bot sebarkan ke semua grup, atau ke grup target tertentu.
//
// Sumber daftar grup:
//   • WA   → sock.groupFetchAllParticipating() (authoritative)
//   • TG   → registry db.data.jasher.groups (diisi adapter tiap grup
//            ngirim pesan — Bot API gak bisa enumerasi grup)
//   • Kirim ke jid tg_* otomatis di-router ke bridge (wrapOutboundSends).
//
// MEDIA: reply media (gambar/video) dengan .jasher <caption>, atau kirim
// media langsung dengan caption .jasher <teks>. Prioritas kirim: media +
// caption SATU pesan; kalau gagal → media dulu, teks menyusul (request
// owner 29 Sep: "media dlu yg dikirim abis itu teks klo g bsa barengan").
//
// COOLDOWN (default OFF, owner yang set): jeda minimum antar broadcast
// biar gak spam grup. .jasher cooldown <menit> / .jasher cooldown off.
//
// SALURAN (request owner 29 Sep): .jasher juga support Saluran WhatsApp
// (newsletter) + Saluran Telegram (bot harus admin saluran). Toggle per tipe
// target — owner yang set: .jasher set group on|off · .jasher set channel on|off
// DEFAULT: group ON, channel OFF.
//
// Sub:
//   .jasher <teks>                     → broadcast ke semua target aktif
//   .jasher grup <kata[,kata]> <teks>  → hanya grup yang namanya match
//   .jasher list                       → daftar semua grup (nomor, nama, platform)
//   .jasher set group|channel on|off   → toggle tipe target (default group on, channel off)
//   .jasher info                       → riwayat pemakaian: siapa, cuplikan pesan, kapan
//   .jasher cooldown <menit|off>       → set/lihat jeda antar broadcast
//   .jasher stop                       → batalkan broadcast yang lagi jalan
//
// OWNER-ONLY. Akses DM & grup (isGroup + isPrivate true = bypass middleware).
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jasher",
  alias: ["jasher"],
  category: "promotion",
  description: "Broadcast promosi/pengumuman ke semua grup bot (WA + Telegram), teks atau media+caption",
  usage: ".jasher <teks> — Broadcast semua target aktif\n.jasher grup <kata[,kata]> <teks> — Grup target saja\n.jasher list — Daftar grup & saluran\n.jasher set group|channel on|off — Toggle tipe target (default group on, channel off)\n.jasher cooldown <menit|off> — Jeda antar broadcast (default off)\n.jasher info — Riwayat pemakaian (siapa, cuplikan, waktu)\n.jasher stop — Batalkan broadcast",
  example: ".jasher Diskon 50% semua produk hari ini!",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// knob delay antar kirim (ms) — e2e set 0 biar cepat
function delayMs() {
  const base = Number(process.env.JASHER_DELAY_MS || 1200);
  if (!base) return 0;
  return base + Math.floor(Math.random() * 400); // jitter anti-pola
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// state broadcast berjalan (anti dobel)
let running = null; // { targets: n, sent: n, abort: false }

// seam e2e: injek pengambil media palsu
let _mediaDownloadForTest = null;
export function _setJasherMediaForTest(fn) { _mediaDownloadForTest = fn; }
export function _resetJasherMediaForTest() { _mediaDownloadForTest = null; }

// ── enumerasi semua grup: WA live + registry TG ──
async function collectTargets(sock, dbData) {
  const map = new Map();
  const add = (jid, name, platform, type) => {
    if (!jid) return;
    map.set(jid, { name: name || jid.split("@")[0], platform, type });
  };
  // ── grup WA ──
  try {
    const groups = await sock.groupFetchAllParticipating?.();
    for (const [jid, g] of Object.entries(groups || {})) {
      if (!jid.endsWith("@g.us")) continue;
      add(jid, g?.subject, "WA", "group");
    }
  } catch {}
  // ── saluran WA (newsletter yang akun ikuti) ──
  try {
    const nls = await sock.newsletterFetchAllSubscribe?.();
    for (const nl of nls || []) {
      if (!nl) continue;
      const jid = String(nl.id || nl.jid || "");
      if (!jid.endsWith("@newsletter")) continue;
      add(jid, nl.name || nl.handleText || nl?.threadMetadata?.handleText, "WA", "channel");
    }
  } catch {}
  // ── registry bridge: grup + saluran TG/Discord ──
  try {
    const reg = dbData?.jasher?.groups || {};
    for (const [jid, info] of Object.entries(reg)) {
      if (map.has(jid)) continue;
      const isChannel = jid.endsWith("@newsletter");
      if (!jid.endsWith("@g.us") && !isChannel) continue;
      const platform = String(info?.platform || "telegram").toLowerCase().includes("discord") ? "Discord" : "TG";
      add(jid, info?.name, platform, isChannel ? "channel" : "group");
    }
  } catch {}
  return [...map.entries()].map(([jid, v]) => ({ jid, ...v }));
}

// ── snippet pesan buat log .jasher info — CUPLIKAN pertama aja
// (request owner 29 Sep: promosi emang panjang, takut penuhin log)
function snippetOf(text, media) {
  const kind = media ? (media.kind === "image" ? "[gambar] " : media.kind === "video" ? "[video] " : "[berkas] ") : "";
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const cut = t.length > 70 ? t.slice(0, 70) + "…" : t;
  return (kind + cut) || (media ? kind.trim() : "(kosong)");
}

// ── settings tipe target — DEFAULT group ON, channel OFF ──
function getSettings(dbData) {
  const st = dbData?.jasher?.settings || {};
  return {
    group: st.group !== false,     // default ON
    channel: st.channel === true,  // default OFF
  };
}

function fmtList(targets) {
  const lines = targets.map((t, i) => {
    const p = t.platform === "WA" ? "🟢" : t.platform === "TG" ? "🔵" : "🟣";
    return `${i + 1}. ${t.type === "channel" ? "📣" : p} ${t.name} (${t.jid})`;
  });
  return lines.join("\n") || "(belum ada grup/saluran)";
}

// ── ambil media: reply media, atau media langsung (caption) ──
async function grabMedia(m) {
  try {
    if (_mediaDownloadForTest) return await _mediaDownloadForTest(m);
    const { downloadMediaMessage, getContentType } = await import("nova");
    const pick = (key, message) => {
      const type = getContentType(message);
      if (!type || type === "conversation" || type === "extendedTextMessage" || type === "protocolMessage") return null;
      const content = message[type] || {};
      const kind = type.includes("video") ? "video" : type.includes("image") ? "image" : "document";
      return { type, kind, mimetype: content?.mimetype || "application/octet-stream" };
    };
    let meta = null, key = null, message = null;
    if (m.quoted?.message) { meta = pick(m.quoted.key, m.quoted.message); key = m.quoted.key; message = m.quoted.message; }
    else if (m.message) { meta = pick(m.key, m.message); key = m.key; message = m.message; }
    if (!meta) return null;
    const buf = await downloadMediaMessage({ key, message }, "buffer", {}, {});
    if (!buf || !buf.length) return null;
    return { buf, kind: meta.kind, mimetype: meta.mimetype };
  } catch {
    return null;
  }
}

// ── kirim ke satu grup: prioritas media+caption bareng, gagal → media dulu lalu teks ──
async function sendToGroup(sock, jid, text, media) {
  if (media) {
    const alone = media.kind === "image" ? { image: media.buf }
      : media.kind === "video" ? { video: media.buf }
      : { document: media.buf, mimetype: media.mimetype };
    try {
      // 1) media + caption dalam SATU pesan (kalau channel dukung)
      await sock.sendMessage(jid, { ...alone, caption: text });
      return true;
    } catch {}
    try {
      // 2) fallback (request owner): media dulu, teks menyusul
      await sock.sendMessage(jid, alone);
      if (text && text.trim()) await sock.sendMessage(jid, { text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await sock.sendMessage(jid, { text });
    return true;
  } catch {
    return false;
  }
}

// ── proses broadcast + progress edit-in-place ──
async function broadcast(sock, m, targets, text, media) {
  const total = targets.length;
  let progressKey = null;
  const updateProgress = async (n) => {
    try {
      const msg = `📢 Broadcast ${n}/${total} grup...`;
      if (!progressKey) {
        const sent = await sock.sendMessage(m.chat, { text: msg });
        progressKey = sent?.key || null;
      } else {
        await sock.sendMessage(m.chat, { text: msg, edit: progressKey });
      }
    } catch {}
  };
  await updateProgress(0);

  const okList = [], failList = [];
  let n = 0;
  for (const t of targets) {
    if (running?.abort) break;
    const ok = await sendToGroup(sock, t.jid, text, media);
    (ok ? okList : failList).push(t);
    n++;
    if (n % 5 === 0 || n === total) await updateProgress(n);
    const d = delayMs();
    if (d && n < total) await sleep(d);
  }
  const aborted = running?.abort;
  running = null;

  const mediaInfo = media ? (media.kind === "image" ? "🖼️ gambar" : media.kind === "video" ? "🎬 video" : "📎 berkas") + " + caption — " : "";
  const body = [
    aborted ? "Broadcast DIBATALKAN di tengah jalan." : "Broadcast selesai!",
    "",
    `${mediaInfo ? mediaInfo : ""}✅ Terkirim: ${okList.length} grup`,
    ...(failList.length ? [`❌ Gagal: ${failList.length} (${failList.map(f => f.name).join(", ")})`] : []),
  ].join("\n");
  // laporan final edit pesan progress terakhir
  const out = claraWrap("Jasher Promotion", body);
  try {
    if (progressKey) await sock.sendMessage(m.chat, { text: out, edit: progressKey });
    else await m.reply(out);
  } catch {
    try { await m.reply(out); } catch {}
  }
  return { ok: okList.length, fail: failList.length, aborted: !!aborted, total };
}

// ── cooldown helpers (default OFF, owner set) ──
function getCooldownState(dbData) {
  const mins = Number(dbData?.jasher?.cooldownMinutes || 0) || 0;
  const last = Number(dbData?.jasher?.lastBroadcastAt || 0) || 0;
  return { mins, last, active: mins > 0 && last > 0 && Date.now() - last < mins * 60000, remainingMs: mins > 0 && last ? Math.max(0, mins * 60000 - (Date.now() - last)) : 0 };
}

async function handler(m, { sock, config: botConfig, db: dbWrapper }) {
  const prefix = botConfig.command?.prefix || m.prefix || ".";
  // m.args valid walau array kosong (".jasher" tanpa teks) — JANGAN fallback
  // ke m.text utuh (command-nya bakal kebaca jadi isi promosi).
  const args = (Array.isArray(m.args) ? m.args : String(m.text || "").replace(/^\S+\s*/, "").split(/\s+/)).filter(Boolean);

  // db: wrapper { db: { data } } dari handler, atau db import sendiri
  let dbData = dbWrapper?.db?.data || dbWrapper?.data || null;
  if (!dbData) {
    try {
      const { getDatabase } = await import("../../src/lib/nova-database.js");
      dbData = getDatabase().db.data;
    } catch {}
  }
  const persist = async () => { try { await dbWrapper?.save?.(); } catch {} };

  // ── sub: list ──
  if (args[0]?.toLowerCase() === "list") {
    const targets = await collectTargets(sock, dbData);
    const st = getSettings(dbData);
    const wa = targets.filter(t => t.platform === "WA" && t.type === "group").length;
    const tg = targets.filter(t => t.platform === "TG" && t.type === "group").length;
    const ch = targets.filter(t => t.type === "channel").length;
    const out = claraWrap("Jasher — Daftar Grup & Saluran", [
      `Total: ${targets.length} target — grup WA ${wa} · grup TG ${tg} · saluran ${ch}`,
      `Aktif: grup ${st.group ? "🟢" : "🔴"} · saluran ${st.channel ? "🟢" : "🔴"} (ubah: ${prefix}jasher set group|channel on|off)`,
      "---",
      fmtList(targets).slice(0, 3800),
    ].join("\n")) + "\n" + tipText(`Broadcast: ${prefix}jasher <teks> — Target: ${prefix}jasher grup <nama> <teks>`);
    await m.reply(out);
    return { handled: true };
  }

  // ── sub: cooldown (owner yang set — plugin udah owner-only) ──
  if (args[0]?.toLowerCase() === "cooldown") {
    const j = dbData ??= {}; j.jasher ??= { groups: {} };
    const val = (args[1] || "").toLowerCase();
    if (!val) {
      const st = getCooldownState(dbData);
      const out = st.mins > 0
        ? `Cooldown broadcast: AKTIF (${st.mins} menit).\n${st.active ? `Tunggu ${Math.ceil(st.remainingMs / 60000)} menit lagi buat broadcast berikutnya.` : "Siap dipakai — broadcast terakhir udah lewat jeda."}`
        : `Cooldown broadcast: OFF (default). Set jeda antar broadcast biar gak spam grup: ${prefix}jasher cooldown <menit>`;
      await m.reply(claraWrap("Jasher — Cooldown", out));
      return { handled: true };
    }
    if (val === "off" || val === "0") {
      j.jasher.cooldownMinutes = 0;
      await persist();
      await m.reply(claraWrap("Jasher — Cooldown", `Cooldown broadcast: OFF. Broadcast bisa dilakukan kapan aja.`));
      return { handled: true };
    }
    const mins = parseInt(val, 10);
    if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
      await m.reply(claraWrap("Jasher — Cooldown", [
        "Nilai cooldown harus 1-1440 menit.",
        `Contoh: ${prefix}jasher cooldown 30 — jeda 30 menit antar broadcast`,
        `Matikan: ${prefix}jasher cooldown off`,
      ].join("\n")));
      return { handled: true };
    }
    j.jasher.cooldownMinutes = mins;
    await persist();
    await m.react("⚡");
    await m.reply(claraWrap("Jasher — Cooldown", `Cooldown broadcast AKTIF: ${mins} menit antar broadcast. Gak bisa kirim .jasher lagi sebelum jeda lewat.`));
    return { handled: true };
  }

  // ── sub: set — toggle tipe target (default group ON, channel OFF) ──
  if (args[0]?.toLowerCase() === "set") {
    const kind = (args[1] || "").toLowerCase(); // group | channel
    const val = (args[2] || "").toLowerCase();  // on | off
    if (!kind && !val) {
      const st = getSettings(dbData);
      const out = [
        `Target broadcast saat ini:`,
        `• Grup: ${st.group ? "🟢 ON" : "🔴 OFF"} (default on)`,
        `• Saluran (WA & Telegram): ${st.channel ? "🟢 ON" : "🔴 OFF"} (default off)`,
        "---",
        `Ubah: ${prefix}jasher set group on|off · ${prefix}jasher set channel on|off`,
      ].join("\n");
      await m.reply(claraWrap("Jasher — Target", out));
      return { handled: true };
    }
    if (kind !== "group" && kind !== "channel" && kind !== "grup" && kind !== "saluran") {
      await m.reply(claraWrap("Jasher — Target", [
        "Tipe target harus: group atau channel.",
        `Contoh: ${prefix}jasher set channel on`,
      ].join("\n")));
      return { handled: true };
    }
    if (val !== "on" && val !== "off") {
      await m.reply(claraWrap("Jasher — Target", [
        "Nilai harus on atau off.",
        `Contoh: ${prefix}jasher set channel on`,
      ].join("\n")));
      return { handled: true };
    }
    const key = (kind === "group" || kind === "grup") ? "group" : "channel";
    try {
      dbData.jasher ??= { groups: {} };
      dbData.jasher.settings ??= {};
      dbData.jasher.settings[key] = val === "on";
      await persist();
    } catch {}
    const label = key === "group" ? "Grup" : "Saluran (WA & Telegram)";
    await m.react("⚡");
    await m.reply(claraWrap("Jasher — Target", `Target ${label}: ${val === "on" ? "🟢 ON — bakal kekirim .jasher" : "🔴 OFF — dilewati broadcast"}`));
    return { handled: true };
  }

  // ── sub: info — riwayat pemakaian (siapa, cuplikan pesan, kapan) ──
  if (args[0]?.toLowerCase() === "info") {
    const hist = dbData?.jasher?.history || [];
    if ((args[1] || "").toLowerCase() === "clear") {
      try { dbData.jasher ??= { groups: {} }; dbData.jasher.history = []; await persist(); } catch {}
      await m.reply(claraWrap("Jasher — Riwayat", "Riwayat broadcast dibersihkan."));
      return { handled: true };
    }
    if (!hist.length) {
      await m.reply(claraWrap("Jasher — Riwayat", [
        "Belum ada riwayat broadcast yang tercatat.",
        `Setiap .jasher yang terkirim otomatis dicatat: siapa pengirim, cuplikan pesan, waktu, jumlah target.`,
      ].join("\n")));
      return { handled: true };
    }
    const fmtTime = (ts) => {
      try {
        return new Date(ts).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      } catch { return String(ts); }
    };
    const shortJid = (j) => String(j || "").replace(/@.+$/, "");
    const rows = hist.slice(-10).reverse().map((h, i) =>
      `${i + 1}. ${fmtTime(h.at)} WIB · ${shortJid(h.by)}${h.aborted ? " ⛔dibatalkan" : ""}\n   "${h.snippet}" → ${h.ok}/${h.targets} target${h.mode ? ` (${h.mode})` : ""}`
    );
    const out = claraWrap("Jasher — Riwayat Broadcast", [
      `Total tercatat: ${hist.length} (menampilkan ${Math.min(10, hist.length)} terbaru)`,
      "---",
      rows.join("\n"),
    ].join("\n")) + "\n" + tipText(`${prefix}jasher info clear — bersihkan riwayat`);
    await m.reply(out);
    return { handled: true };
  }

  // ── sub: stop ──
  if (args[0]?.toLowerCase() === "stop") {
    if (running) {
      running.abort = true;
      await m.react("⚡");
      await m.reply(claraWrap("Jasher", "Sinyal stop diterima — broadcast dibatalkan..."));
    } else {
      await m.reply(claraWrap("Jasher", "Gak ada broadcast yang lagi jalan."));
    }
    return { handled: true };
  }

  // ── guard broadcast dobel ──
  if (running) {
    await m.reply(claraWrap("Jasher", [
      `Masih ada broadcast jalan (${running.sent}/${running.targets} grup).`,
      `Tunggu selesai atau ketik ${prefix}jasher stop`,
    ].join("\n")));
    return { handled: true };
  }

  // ── parsing teks + media ──
  let text = "";
  let targetMode = null; // array keyword
  const media = await grabMedia(m);
  if (args[0]?.toLowerCase() === "grup" || args[0]?.toLowerCase() === "target") {
    const keywords = (args[1] || "").split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!keywords.length) {
      await m.reply(claraWrap("Jasher", [
        "Format target salah.",
        `Contoh: ${prefix}jasher grup warung, olshop | Diskon hari ini!`,
        "Kata kunci = potongan nama grup (bisa beberapa, pisah koma).",
      ].join("\n")));
      return { handled: true };
    }
    targetMode = keywords;
    text = args.slice(2).join(" ").trim();
  } else {
    text = args.join(" ").trim();
    // media langsung dengan caption: strip command dari caption
    if (media && !m.quoted && /^\S+/.test(String(m.text || ""))) {
      const stripped = String(m.text || "").replace(/^\S+\s*/, "").trim();
      if (stripped) text = stripped;
    }
  }

  if (!text && !media) {
    const out = claraWrap("Jasher", [
      "Broadcast promosi/pengumuman ke semua grup yang bot join (WA + Telegram).",
      "---",
      `📌 Format:`,
      `${prefix}jasher <teks> — broadcast teks ke SEMUA grup`,
      `${prefix}jasher grup <kata[,kata]> <teks> — hanya grup yang namanya match`,
      `Reply gambar/video + ${prefix}jasher <caption> — broadcast media+caption`,
      `Kirim gambar/video caption: ${prefix}jasher <teks> — idem`,
      `${prefix}jasher list — lihat daftar grup & saluran`,
      `${prefix}jasher set group|channel on|off — toggle tipe target (default grup on, saluran off)`,
      `${prefix}jasher cooldown <menit|off> — jeda antar broadcast (default off)`,
      `${prefix}jasher info — riwayat pemakaian (siapa, cuplikan, waktu)`,
      `${prefix}jasher stop — batalkan broadcast`,
      "---",
      `Contoh: ${prefix}jasher Diskon 50% hari ini!`,
    ].join("\n")) + "\n" + tipText(`Owner-only — Ketik ${prefix}menu untuk kembali`);
    await m.reply(out);
    return { handled: true };
  }
  if (!text && media) {
    // media tanpa caption — gak masalah, kirim media doang
  }

  // ── guard cooldown antar broadcast (default OFF) ──
  const cd = getCooldownState(dbData);
  if (cd.active) {
    const sisa = Math.ceil(cd.remainingMs / 60000);
    await m.react("❌");
    await m.reply(claraWrap("Jasher", [
      `Cooldown broadcast aktif — tunggu ${sisa} menit lagi.`,
      `Jeda diatur lewat ${prefix}jasher cooldown <menit> (matikan: ${prefix}jasher cooldown off).`,
    ].join("\n")));
    return { handled: true };
  }

  // ── enumerasi + filter tipe target (settings: default group ON, channel OFF) ──
  const st = getSettings(dbData);
  let targets = (await collectTargets(sock, dbData)).filter(t => t.type === "channel" ? st.channel : st.group);
  if (!st.group && !st.channel) {
    await m.reply(claraWrap("Jasher", [
      `Grup & saluran dua-duanya OFF — gak ada target broadcast.`,
      `Nyalakan salah satu: ${prefix}jasher set group on atau ${prefix}jasher set channel on`,
    ].join("\n")));
    return { handled: true };
  }
  if (!targets.length) {
    await m.reply(claraWrap("Jasher", "Gak ada target aktif — bot belum join grup/saluran yang menyala (cek .jasher list & .jasher set)."));
    return { handled: true };
  }
  if (targetMode) {
    targets = targets.filter(t =>
      targetMode.some(k => t.name.toLowerCase().includes(k) || t.jid.includes(k))
    );
    if (!targets.length) {
      await m.reply(claraWrap("Jasher", `Gak ada grup yang cocok dengan: ${targetMode.join(", ")}`));
      return { handled: true };
    }
  }

  // catat waktu broadcast mulai (buat cooldown) + persist
  try {
    dbData.jasher ??= { groups: {} };
    dbData.jasher.lastBroadcastAt = Date.now();
    await persist();
  } catch {}

  running = { targets: targets.length, sent: 0, abort: false };
  await m.react("📢");
  const result = await broadcast(sock, m, targets, text, media);
  await m.react(result.aborted ? "❌" : "🐣");

  // ── catat riwayat pemakaian (siapa, cuplikan pesan, kapan, hasil) ──
  try {
    dbData.jasher ??= { groups: {} };
    dbData.jasher.history ??= [];
    dbData.jasher.history.push({
      at: Date.now(),
      by: m.sender || m.key?.participant || "owner",
      snippet: snippetOf(text, media),
      targets: targets.length,
      ok: result?.ok || 0,
      mode: targetMode ? `target: ${targetMode.join(",")}` : "",
      aborted: !!result?.aborted,
    });
    if (dbData.jasher.history.length > 30) dbData.jasher.history = dbData.jasher.history.slice(-30); // cap 30 entri
    await persist();
  } catch {}
  return { handled: true };
}

export { pluginConfig as config, handler }
