// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lib/autoflow.js — MESIN eksekusi rule automation (ESM)
// Membaca rule dari database/autoflow.json (file yang sama dengan .autonovaai)

import fs from "fs";

const DB = "./database/autoflow.json";
const cooldown = new Map();

let _conn = null; // koneksi otomatis terisi dari pesan pertama

export const load = () => {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return []; }
};

export const save = (rules) => {
  fs.mkdirSync("./database", { recursive: true });
  fs.writeFileSync(DB, JSON.stringify(rules, null, 2));
};

// ================= EKSEKUSI SATU AKSI =================
async function execute(conn, m, rule, extra = {}) {
  conn = conn || _conn;
  if (!conn) return;
  const a = rule.action || {};
  const chat = extra.chat || m?.chat;
  if (!chat) return;
  const user = extra.user || m?.sender;
  const text = (a.value || "").replace(/@user/g, user ? "@" + user.split("@")[0] : "");
  const opts = m?.key ? { quoted: m } : {};

  try {
    switch (a.type) {
      case "reply": {
        const payload = { text };
        const num = text.match(/@(\d{5,})/);
        if (num) payload.mentions = [num[1] + "@s.whatsapp.net"];
        await conn.sendMessage(chat, payload, opts);
        break;
      }
      case "react":
        if (m?.key) await conn.sendMessage(chat, { react: { text: a.value, key: m.key } });
        break;
      case "image": {
        if (fs.existsSync(a.value)) {
          await conn.sendMessage(chat, { image: fs.readFileSync(a.value), caption: a.caption || "" }, opts);
        } else if ((a.value || "").startsWith("http")) {
          await conn.sendMessage(chat, { image: { url: a.value }, caption: a.caption || "" }, opts);
        }
        break;
      }
      case "audio":
        if (fs.existsSync(a.value)) {
          await conn.sendMessage(chat, { audio: fs.readFileSync(a.value), mimetype: "audio/mpeg", ptt: true }, opts);
        }
        break;
      case "kick":
        if (user) await conn.groupParticipantsUpdate(chat, [user], "remove");
        break;
      case "closegc":
        await conn.groupSettingUpdate(chat, "announcement");
        break;
      case "opengc":
        await conn.groupSettingUpdate(chat, "not_announcement");
        break;
    }
    // catat statistik pemakaian
    const rules = load();
    const r = rules.find((x) => x.id === rule.id);
    if (r) { r.hits = (r.hits || 0) + 1; save(rules); }
  } catch (e) {
    console.log(`[AutoFlow] gagal eksekusi ${rule.id}: ${e.message}`);
  }
}

// ================= TRIGGER: PESAN MASUK (keyword & media) =================
const MEDIA_TYPE = {
  image: "imageMessage",
  video: "videoMessage",
  sticker: "stickerMessage",
  audio: "audioMessage",
};

export async function handleMessage(conn, m) {
  if (!m || m.key?.fromMe || m.fromMe) return; // anti-loop: abaikan pesan bot sendiri
  if (conn) _conn = conn; // cache koneksi buat trigger jadwal

  const body = String(m.body || m.text || "").toLowerCase().trim();
  const rules = load().filter((r) => r.enabled && ["keyword", "media"].includes(r.trigger?.type));
  if (!rules.length) return;

  for (const rule of rules) {
    // cek scope
    const s = rule.scope || "all";
    if (s === "group" && !m.isGroup) continue;
    if (s === "private" && m.isGroup) continue;
    if ((s.endsWith("@g.us") || s.endsWith("@s.whatsapp.net")) && m.chat !== s) continue;

    // cooldown anti-spam
    const cd = Number.isFinite(rule.cooldown) ? rule.cooldown : 10;
    const key = rule.id + ":" + m.chat;
    if (cd > 0 && Date.now() - (cooldown.get(key) || 0) < cd * 1000) continue;

    // cek pemicunya
    let match = false;
    if (rule.trigger.type === "keyword") {
      const val = String(rule.trigger.value || "").toLowerCase();
      const mode = rule.trigger.match || "contains";
      match =
        mode === "exact" ? body === val
        : mode === "start" ? body.startsWith(val)
        : body.includes(val);
    } else if (rule.trigger.type === "media") {
      match = m.mtype === MEDIA_TYPE[rule.trigger.value];
    }
    if (!match) continue;

    if (cd > 0) cooldown.set(key, Date.now());
    await execute(conn, m, rule);
  }
}

// ================= TRIGGER: JOIN / LEAVE GRUP =================
export async function handleParticipants(conn, chat, participants, action) {
  if (conn) _conn = conn;
  const rules = load().filter((r) => r.enabled && r.trigger?.type === action);
  for (const rule of rules) {
    for (const user of participants) {
      const fake = { chat, sender: user, key: { remoteJid: chat, participant: user, fromMe: false } };
      await execute(conn, fake, rule, { chat, user });
    }
  }
}

// ================= TRIGGER: JADWAL (cek tiap 30 detik, WIB) =================
setInterval(async () => {
  try {
    if (!_conn) return;
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date());
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

    for (const rule of load()) {
      if (!rule.enabled || rule.trigger?.type !== "schedule") continue;
      if (rule.trigger.value !== time) continue;
      if (rule.lastDate === today) continue; // cuma 1x per hari

      const rules = load();
      const r = rules.find((x) => x.id === rule.id);
      if (r) { r.lastDate = today; r.hits = (r.hits || 0) + 1; save(rules); }
      await execute(null, null, rule, { chat: rule.targetChat });
    }
  } catch (e) {
    console.log("[AutoFlow] jadwal error:", e.message);
  }
}, 30 * 1000);
