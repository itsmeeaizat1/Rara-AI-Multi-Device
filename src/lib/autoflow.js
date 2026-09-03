// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lib/autoflow.js — MESIN eksekusi rule automation (ESM)
// Membaca rule dari database/autoflow.json (file yang sama dengan .autonovaai)

import fs from "fs";
import { askAI } from "./aiagent.js";

const DB = "./src/data/autoflow.json";
const cooldown = new Map();

let _conn = null; // koneksi otomatis terisi dari pesan pertama

// ================= MEMORY PER-USER (aichat) =================
// Tiap kombinasi rule+chat+sender dapet riwayat obrolannya SENDIRI.
// Contoh: user 62817366363 bahas ular → riwayatnya gak nyampur sama
// user 62817366632 yang bahas topik lain di grup yang sama.
// Disimpan ke file biar konteks gak hilang pas bot restart.
const MEM_DB = "./src/data/autoflow-memory.json";
const MAX_HISTORY = 24; // 12 pertukaran terakhir (user+AI) per orang — cukup buat konteks

let _memCache = null;
let _memDirty = false;
function loadMem() {
  if (_memCache) return _memCache;
  try { _memCache = JSON.parse(fs.readFileSync(MEM_DB, "utf8")); } catch { _memCache = {}; }
  return _memCache;
}
function saveMem() {
  try {
    fs.mkdirSync("./src/data", { recursive: true });
    fs.writeFileSync(MEM_DB, JSON.stringify(_memCache || {}, null, 2));
    _memDirty = false;
  } catch (e) {
    console.log("[AutoFlow] gagal simpan memory aichat:", e.message);
  }
}
function pushMem(key, userText, aiText) {
  const mem = loadMem();
  if (!Array.isArray(mem[key])) mem[key] = [];
  mem[key].push({ r: "u", t: String(userText).slice(0, 400) });
  if (aiText) mem[key].push({ r: "a", t: String(aiText).slice(0, 400) });
  if (mem[key].length > MAX_HISTORY) mem[key] = mem[key].slice(-MAX_HISTORY);
  // debounce write biar gak spam I/O di grup ramai
  if (!_memDirty) {
    _memDirty = true;
    setTimeout(saveMem, 1500);
  }
}
// reset memory: (ruleId, chat, sender) — semua opsional, kosong = reset SEMUA
export function clearAichatMemory(ruleId, chat, sender) {
  const mem = loadMem();
  if (!ruleId && !chat && !sender) { _memCache = {}; }
  else {
    for (const k of Object.keys(mem)) {
      const [r, ch] = k.split(":");
      if (ruleId && r !== ruleId) continue;
      if (chat && ch !== chat) continue;
      if (sender && k !== `${ruleId}:${chat}:${sender}`) continue;
      delete mem[k];
    }
  }
  saveMem();
}

export const load = () => {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return []; }
};

export const save = (rules) => {
  fs.mkdirSync("./src/data", { recursive: true });
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
      case "aichat": {
        // 🔹 FREE CHAT: balasan digenerate AI tiap kali (bukan teks statis)
        // a.value = persona/instruction bebas, contoh "ngobrol santai kayak temen"
        const userText = m?.text || m?.body || "";
        if (!userText.trim()) break;
        const persona = a.value?.trim() ||
          "Kamu asisten WhatsApp yang ramah dan santai. Balas singkat dan natural seperti chat biasa, jangan kaku, jangan mengaku sebagai AI kalau tidak ditanya.";

        // 🔹 MEMORY PER-USER: tiap orang punya riwayatnya sendiri
        // (key = rule:chat:sender) — topik si A gak kebawa ke obrolan si B
        const memKey = `${rule.id}:${chat}:${user || "anon"}`;
        const senderName = m?.pushName || (user ? user.split("@")[0] : "user");
        const hist = loadMem()[memKey] || [];
        const ctx = hist.length
          ? `Riwayat obrolanmu dengan ${senderName} (terbaru di bawah, gunakan sebagai konteks, jangan ulangi jawaban yang sama):\n` +
            hist.map((h) => (h.r === "u" ? `${senderName}: ` : "Kamu: ") + h.t).join("\n")
          : "";

        try {
          const aiReply = await askAI(persona + (ctx ? "\n\n" + ctx : ""), userText);
          if (aiReply?.trim()) {
            await conn.sendMessage(chat, { text: aiReply.trim() }, opts);
            pushMem(memKey, userText, aiReply.trim());
          }
        } catch (e) {
          console.log(`[AutoFlow] aichat gagal: ${e.message}`);
        }
        break;
      }
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
  const rules = load().filter((r) => r.enabled && ["keyword", "media", "any"].includes(r.trigger?.type));
  if (!rules.length) return;

  // trigger "any" (free chat) sengaja TIDAK jalan buat pesan command (.xxx)
  // biar gak konflik/dobel proses sama command bot lain
  const isCmdMsg = !!m.isCommand;

  for (const rule of rules) {
    if (rule.trigger.type === "any" && isCmdMsg) continue;

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
    } else if (rule.trigger.type === "any") {
      match = !!body; // butuh ada teksnya, biar aichat ada bahan jawab
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
