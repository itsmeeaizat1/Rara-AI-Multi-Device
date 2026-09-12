// NOVA AFK ENGINE — status AFK interaktif: jam mulai + durasi + alasan,
// persist di db.setting("novaAfkUsers") per user (selamat restart).
// Request owner 13 Sep 2026: "knp fitur dibot saya msih ada yg polos g
// interaktif gt cntoh di .afk g ada wktu kpan user mulai afk dan wktu
// brapa lama user afknya gt".
import { getDatabase } from "./nova-database.js";
import { claraWrap } from "./nova-menu-style.js";

const AFK_KEY = "novaAfkUsers";

function safeDb() {
  try { return getDatabase(); } catch { return null; }
}

export function loadAfkMap(db = null) {
  const d = db || safeDb();
  if (!d) return {};
  try { const v = d.setting(AFK_KEY); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

function saveAfkMap(map, db = null) {
  const d = db || safeDb();
  if (!d) return;
  try { d.setting(AFK_KEY, map); } catch {}
}

export function getAfkUser(jid, db = null) {
  return loadAfkMap(db)[jid] || null;
}

export function isUserAfk(jid, db = null) {
  return !!getAfkUser(jid, db);
}

/** Set/update AFK — balikin { entry, prev } (prev = data lama kalau lagi AFK) */
export function setAfkUser(jid, { reason = "Tanpa alasan", name = "", chat = "" } = {}, db = null) {
  const map = loadAfkMap(db);
  const prev = map[jid] || null;
  map[jid] = { reason, name, chat, since: Date.now() };
  saveAfkMap(map, db);
  return { entry: map[jid], prev };
}

/** Hapus AFK — balikin entry lama (atau null kalau emang gak AFK) */
export function removeAfkUser(jid, db = null) {
  const map = loadAfkMap(db);
  const old = map[jid] || null;
  delete map[jid];
  saveAfkMap(map, db);
  return old;
}

/** Format waktu WIB: "19:32 WIB, 13/09" */
export function formatWib(ts) {
  const wib = new Date(Number(ts) + 7 * 3600 * 1000);
  const f = (n) => String(n).padStart(2, "0");
  return `${f(wib.getUTCHours())}:${f(wib.getUTCMinutes())} WIB, ${f(wib.getUTCDate())}/${f(wib.getUTCMonth() + 1)}`;
}

/** Format durasi pendek manusiawi: "2 jam 15 menit" / "45 menit" / "30 detik" */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const mnt = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${mnt} menit`;
  if (mnt > 0) return `${mnt} menit${sec ? " " + sec + " detik" : ""}`;
  return `${sec} detik`;
}

// throttle notif mention (per chat+user, 60 dtk) biar grup gak kebanjiran
// kartu AFK kalau AFK-er di-mention berkali-kali dalam 1 menit
const notifyTs = (globalThis.__novaAfkNotifyTs = globalThis.__novaAfkNotifyTs || new Map());
export function resetAfkThrottle() { notifyTs.clear(); }

/**
 * handleAfkHooks — dipanggil handler.js tiap pesan masuk (fire-and-forget):
 * (1) user yang AFK ngirim pesan apa pun (kecuali .afk set lagi) → AFK
 *     berakhir + kartu "selamat datang kembali" (mulai jam berapa + durasi);
 * (2) ada yang mention user AFK di grup → kartu info (nama, jam mulai,
 *     durasi berjalan, alasan) — max 1x per user per menit per chat.
 */
export async function handleAfkHooks(m, sock, db = null) {
  try {
    const d = db || safeDb();
    if (!d || !m?.sender) return;
    const isAfkCmd = m.isCommand && String(m.command || "").toLowerCase() === "afk";
    const map = loadAfkMap(d);
    const self = map[m.sender];

    // (1) balakang dari AFK
    if (self && !isAfkCmd) {
      delete map[m.sender];
      saveAfkMap(map, d);
      const label = self.name || `@${m.sender.split("@")[0]}`;
      const body = [
        `\`${label} sudah kembali!\``,
        `👤 Nama : ${label}`,
        `⏰ Mulai : ${formatWib(self.since)}`,
        `⏱️ Durasi : ${formatDuration(Date.now() - self.since)}`,
        `📝 Alasan : ${self.reason || "-"}`,
        ``,
        `_Senang kamu kembali!_`,
      ].join("\n");
      await m.reply(claraWrap("AFK Berakhir", body, "success"), { mentions: [m.sender] });
    }

    // (2) mention user AFK
    if (m.isGroup && Array.isArray(m.mentionedJid) && m.mentionedJid.length) {
      const now = Date.now();
      const entries = [];
      const seen = new Set();
      for (const jid of m.mentionedJid) {
        if (!jid || seen.has(jid)) continue;
        seen.add(jid);
        const info = map[jid];
        if (!info) continue;
        const tkey = `${m.chat}|${jid}`;
        const last = notifyTs.get(tkey) || 0;
        if (now - last < 60_000) continue;
        notifyTs.set(tkey, now);
        entries.push({ jid, info });
      }
      if (entries.length) {
        const mentions = [];
        const lines = [];
        for (const { jid, info } of entries) {
          const num = jid.split("@")[0];
          const label = info.name ? `${info.name} (@${num})` : `@${num}`;
          mentions.push(jid);
          lines.push(
            "```Hussh, jangan diganggu!```",
            `👤 Nama : ${label}`,
            `⏰ Mulai : ${formatWib(info.since)}`,
            `⏱️ Durasi : ${formatDuration(now - info.since)}`,
            `📝 Alasan : ${info.reason || "-"}`,
            ``,
          );
        }
        lines.push(`_Kalau dia masih AFK, infoku ulang maksimal 1 menit sekali._`);
        await m.reply(claraWrap("User AFK", lines.join("\n")), { mentions });
      }
    }
  } catch (e) {
    // fire-and-forget: gak boleh ganggu jalannya pesan
    try { console.error("[AfkHook] error:", e?.message || e); } catch {}
  }
}
