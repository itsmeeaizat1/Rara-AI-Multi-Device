// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .jasher — broadcast promosi/pengumuman ke semua grup yang bot join
// (WA + Telegram via novabridge). Viral ala fitur "Jasher" di Telegram:
// owner kirim teks promosi dari DM/grup → bot sebarkan ke semua grup,
// atau ke grup target tertentu.
//
// Sumber daftar grup:
//   • WA   → sock.groupFetchAllParticipating() (authoritative)
//   • TG   → registry db.data.jasher.groups (diisi adapter tiap grup
//            ngirim pesan — Bot API gak bisa enumerasi grup)
//   • Kirim ke jid tg_* otomatis di-router ke bridge (wrapOutboundSends).
//
// Sub:
//   .jasher <teks>                  → broadcast ke SEMUA grup
//   .jasher grup <kata[,kata]> <teks> → hanya grup yang namanya match
//   .jasher list                     → daftar semua grup (nomor, nama, platform)
//   .jasher stop                     → batalkan broadcast yang lagi jalan
//
// OWNER-ONLY. Akses DM & grup (isGroup + isPrivate true = bypass middleware).
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jasher",
  alias: ["jasher"],
  category: "promotion",
  description: "Broadcast promosi/pengumuman ke semua grup bot (WA + Telegram)",
  usage: ".jasher <teks> — Broadcast semua grup\n.jasher grup <kata[,kata]> <teks> — Grup target saja\n.jasher list — Daftar grup\n.jasher stop — Batalkan broadcast",
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

// ── enumerasi semua grup: WA live + registry TG ──
async function collectTargets(sock, dbData) {
  const map = new Map();
  try {
    const groups = await sock.groupFetchAllParticipating?.();
    for (const [jid, g] of Object.entries(groups || {})) {
      if (!jid.endsWith("@g.us")) continue;
      map.set(jid, { name: g?.subject || jid.split("@")[0], platform: "WA" });
    }
  } catch {}
  try {
    const reg = dbData?.jasher?.groups || {};
    for (const [jid, info] of Object.entries(reg)) {
      if (!jid.endsWith("@g.us") || map.has(jid)) continue;
      map.set(jid, { name: info?.name || jid.split("@")[0], platform: String(info?.platform || "telegram").toLowerCase().includes("discord") ? "Discord" : "TG" });
    }
  } catch {}
  return [...map.entries()].map(([jid, v]) => ({ jid, name: v.name, platform: v.platform }));
}

function fmtList(targets) {
  const lines = targets.map((t, i) => `${i + 1}. ${t.name} ${t.platform === "WA" ? "🟢" : t.platform === "TG" ? "🔵" : "🟣"} (${t.jid})`);
  return lines.join("\n") || "(belum ada grup)";
}

// ── proses broadcast + progress edit-in-place ──
async function broadcast(sock, m, targets, text, prefix) {
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
    try {
      await sock.sendMessage(t.jid, { text });
      okList.push(t);
    } catch {
      failList.push(t);
    }
    n++;
    if (n % 5 === 0 || n === total) await updateProgress(n);
    const d = delayMs();
    if (d && n < total) await sleep(d);
  }
  const aborted = running?.abort;
  running = null;

  const body = [
    aborted ? "Broadcast DIBATALKAN di tengah jalan." : "Broadcast selesai!",
    "",
    `✅ Terkirim: ${okList.length} grup`,
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

  // ── sub: list ──
  if (args[0]?.toLowerCase() === "list") {
    const targets = await collectTargets(sock, dbData);
    const wa = targets.filter(t => t.platform === "WA").length;
    const tg = targets.filter(t => t.platform === "TG").length;
    const out = claraWrap("Jasher — Daftar Grup", [
      `Total: ${targets.length} grup (WA ${wa} · TG ${tg})`,
      "---",
      fmtList(targets).slice(0, 3800),
    ].join("\n")) + "\n" + tipText(`Broadcast: ${prefix}jasher <teks> — Target: ${prefix}jasher grup <nama> <teks>`);
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

  // ── parsing teks ──
  let text = "";
  let targetMode = null; // array keyword
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
  }

  if (!text) {
    const out = claraWrap("Jasher", [
      "Broadcast promosi/pengumuman ke semua grup yang bot join (WA + Telegram).",
      "---",
      `📌 Format:`,
      `${prefix}jasher <teks> — broadcast ke SEMUA grup`,
      `${prefix}jasher grup <kata[,kata]> <teks> — hanya grup yang namanya match`,
      `${prefix}jasher list — lihat daftar grup`,
      `${prefix}jasher stop — batalkan broadcast`,
      "---",
      `Contoh: ${prefix}jasher Diskon 50% hari ini!`,
    ].join("\n")) + "\n" + tipText(`Owner-only — Ketik ${prefix}menu untuk kembali`);
    await m.reply(out);
    return { handled: true };
  }

  // ── enumerasi + filter target ──
  let targets = await collectTargets(sock, dbData);
  if (!targets.length) {
    await m.reply(claraWrap("Jasher", "Bot belum join grup mana pun (WA & TG)."));
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

  running = { targets: targets.length, sent: 0, abort: false };
  await m.react("📢");
  const result = await broadcast(sock, m, targets, text, prefix);
  await m.react(result.aborted ? "❌" : "🐣");
  return { handled: true };
}

export { pluginConfig as config, handler }
