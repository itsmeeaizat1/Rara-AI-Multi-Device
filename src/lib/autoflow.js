// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// lib/autoflow.js — MESIN eksekusi rule automation (ESM)
// Membaca rule dari database/autoflow.json (file yang sama dengan .autonovaai)

import { foldHistory, appendTurn, clearSession, clearSessionPrefix } from "./rara-ai-session.js";
import fs from "fs";
import { memoryBlock, extractMemories } from "./rara-memory.js";
import { getDatabase } from "./rara-database.js";

const DB = "./src/database/ai/autoflow.json";
// 🔹 ANTI-SPAM COOLDOWN DIHAPUS TOTAL (owner 29 Sep: "fitur anti spam
// anovaagent dihapus aja biar spam jga") — autoflow sekarang respon SETIAP
// pesan yang match, tanpa jeda. Rule lama yang punya field cooldown diabaikan.

// ================= ANTI-LOOP (echo balasan bot sendiri) =================
// TIDAK blanket-skip semua fromMe — owner sering testing rule via self-chat
// (chat ke diri sendiri / grup dgn nomor sendiri), itu fromMe:true JUGA.
// Solusi: cuma skip message ID yang MEMANG bot ini kirim sendiri (dicatat
// pas execute() ngirim), sisanya (termasuk fromMe krn self-chat) tetap diproses.
const ownSentIds = new Set();
const MAX_OWN_IDS = 500;
function markOwnSent(id) {
  if (!id) return;
  ownSentIds.add(id);
  if (ownSentIds.size > MAX_OWN_IDS) {
    const first = ownSentIds.values().next().value;
    ownSentIds.delete(first);
  }
}

let _conn = null; // koneksi otomatis terisi dari pesan pertama

// ================= MEMORY PER-USER (aichat) =================
// Tiap kombinasi rule+chat+sender dapet riwayat obrolannya SENDIRI.
// Contoh: user 62817366363 bahas ular → riwayatnya gak nyampur sama
// user 62817366632 yang bahas topik lain di grup yang sama.
// Disimpan ke file biar konteks gak hilang pas bot restart.
const MEM_DB = "./src/database/ai/autoflow-memory.json";
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
  // 🔹 memori sekarang TERPADU di rara-ai-session.js (key "agent:<sender>")
  // — key lama rule:chat:sender di file lama ikut dibersihin biar gak nyangkut
  let n = 0;
  if (sender) {
    if (clearSession(`agent:${sender}`)) n++;
  } else if (chat) {
    n += clearSessionPrefix(`agent:`);
  } else {
    n += clearSessionPrefix(`agent:`);
  }
  // bersihin sisa file memory lama (kalo masih ada)
  try {
    const mem = loadMem();
    for (const k of Object.keys(mem)) {
      const [r, ch] = k.split(":");
      if (ruleId && r !== ruleId) continue;
      if (chat && ch !== chat) continue;
      if (sender && k !== `${ruleId}:${chat}:${sender}`) continue;
      delete mem[k];
    }
    if (mem && typeof mem === "object") saveMem();
  } catch {}
  return n > 0;
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

  // wrapper: kirim + catat ID biar echo-nya (fromMe) dikenali & di-skip,
  // TANPA nge-blok pesan asli yang diketik owner sendiri (self-chat testing)
  const send = async (content, o = opts) => {
    const res = await conn.sendMessage(chat, content, o);
    markOwnSent(res?.key?.id);
    return res;
  };

  try {
    switch (a.type) {
      case "reply": {
        const payload = { text };
        const num = text.match(/@(\d{5,})/);
        if (num) payload.mentions = [num[1] + "@s.whatsapp.net"];
        await send(payload);
        break;
      }
      case "react":
        if (m?.key) await send({ react: { text: a.value, key: m.key } }, {});
        break;
      case "image": {
        if (fs.existsSync(a.value)) {
          await send({ image: fs.readFileSync(a.value), caption: a.caption || "" });
        } else if ((a.value || "").startsWith("http")) {
          await send({ image: { url: a.value }, caption: a.caption || "" });
        }
        break;
      }
      case "audio":
        if (fs.existsSync(a.value)) {
          await send({ audio: fs.readFileSync(a.value), mimetype: "audio/mpeg", ptt: true });
        }
        break;
      case "aiimage": {
        // 🔹 AI IMAGE: bot bikin gambar hasil generate AI (value = prompt,
        // @user otomatis diganti nama pengirim). Chain: provider vision
        // (gemini nano banana dst) → fallback free pollinations.
        try {
          const senderName = m?.pushName || (user ? user.split("@")[0] : "user");
          // 🔹 FIX 13 Sep 2026: dulu callImageGen("gemini") provider tunggal
          // → key mati = pollinations. Sekarang rantai nano-banana (commit
          // 72ce717a) biar engine utamanya nano banana, pollinations cuma
          // penyelamat terakhir.
          const { callImageGenChain } = await import("./rara-ai-service.js");
          const prompt = String(a.value || "").replace(/@user/g, senderName).trim() || "sesuatu yang menarik";
          const img = await callImageGenChain(prompt);
          await send({
            image: Buffer.from(img.base64, "base64"),
            caption: "🎨 " + prompt.slice(0, 150) + (img.via ? "\n_(engine: " + img.via + ")_" : "") + (img.ratio && img.ratio !== "1:1" ? " _(rasio: " + img.ratio + ")_" : ""),
          });
        } catch (e) {
          console.log(`[AutoFlow] aiimage gagal: ${e.message}`);
        }
        break;
      }
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
        // 🔹 UPGRADE 29 Sep (owner report: "disuruh cari info berita viral
        // malah kayak gak bisa, padahal udah jadi ai agent bisa browsing, cari
        // informasi, dilengkapi mcp dan skill juga harusnya semua terintegrasi"
        // + "hai smiley berulang kayak template, harusnya natural lanjut
        // obrolan biasa") — GANTI dari askAI() single-shot MENTAH (TANPA
        // riset/tool/mcp/skill sama sekali, itu sebabnya "gak bisa browsing")
        // ke runAgent() ENGINE PENUH SAMA dengan .aisuperagent: plan otomatis
        // pilih mode persona/research(browsing beneran)/tools, skill 183 +
        // mcp terpasang, gaya natural tanpa diktat & anti-sapaan-template
        // (lihat personaPrompt()/SYS_ANSWER di rara-agent.js).
        // a.value = gaya bicara custom dari owner (opsional, boleh kosong).
        const userText = m?.text || m?.body || "";
        if (!userText.trim()) break;
        const persona = a.value?.trim() || "";

        // 🔹 MEMORY PER-USER TERPADU: key "agent:<sender>" — SAMA dengan .raraai
        // → obrolan di .raraai diterusin di aichat autoflow & sebaliknya (1 sistem)
        const senderName = m?.pushName || (user ? user.split("@")[0] : "user");
        const memKey = `agent:${user || "anon"}`;
        const historyCtx = foldHistory(memKey, { userName: senderName });

        // 🔹 MEMORY JANGKA PANJANG (upgrade #2, owner 25 Sep 2026: "autonovaagent
        // juga harusnya punya memory jangka panjang krna itu ai otomatis") —
        // fakta durabel user (rara-memory.js, STORE SAMA dengan .raraai/
        // .raraagent/.aisuperagent) di-inject ke prompt + diekstrak ulang tiap
        // jawaban. Rule aichat = AI OTOMATIS — dia wajib inget user kayak agent manual.
        const db = getDatabase();
        let memSys = "";
        try { memSys = memoryBlock(getDatabase(), user, userText); } catch {}

        // gaya custom owner (kalau diisi) ditempel jadi instruksi konteks —
        // runAgent tetap otomatis pilih mode (persona/research/tools) dari isi
        // task, styleNote cuma nitip preferensi gaya, TIDAK maksa mode.
        const styleNote = persona ? `[Instruksi gaya bicara dari owner bot, ikuti selama masih natural: ${persona}]\n\n` : "";
        const task = `${styleNote}${historyCtx}${userText}`;

        // 🔹 UPGRADE 29 Sep #2 (owner: "gimana biar anovaagent ini kyk ai
        // agent raraagent dan aisuperagent bisa browsing dan melakukan
        // apapun") — engine (runAgent/toolbox/executors) SUDAH SAMA persis
        // dengan .raraagent/.aisuperagent sejak upgrade sebelumnya (browsing
        // real, tools, skill 183, mcp semua kepakai). Gap yang KETEMU pas
        // dibandingin baris-per-baris sama plugins/ai-agent/agent.js:
        // (1) vision — reply/attach gambar gak ke-scan (mediaBuffer selalu
        // null); (2) jawaban panjang cuma 1x send() polos — riset/tools bisa
        // kepotong WA/Telegram tanpa splitChatChunks; (3) mode research gak
        // nampilin sumber [S1][S2] (footer link ilang); (4) mode suara
        // .anovaagent (VOICE_KEYS.anovaagent SUDAH ADA tapi cuma kepakai pas
        // konfirmasi rule dibuat, BUKAN pas rule beneran jawab). Port semua 4
        // biar jawaban otomatis SETARA .aisuperagent.
        let mediaBuffer = null;
        try {
          const mediaMsg = m?.isImage ? m : m?.quoted?.isImage ? m.quoted : null;
          if (mediaMsg && typeof mediaMsg.download === "function") mediaBuffer = await mediaMsg.download();
        } catch {}

        try {
          const { runAgent } = await import("./rara-agent.js");
          const { execAction, buildExecutors, buildToolbox } = await import("../../plugins/ai-agent/agent.js");
          const { skillsBlock } = await import("./rara-askills.js");
          const { splitChatChunks } = await import("./aiagent.js");
          const toolbox = await buildToolbox();
          const executors = buildExecutors(m, conn, db, mediaBuffer, {}, null);
          const res = await runAgent(task, {
            act: (act, ctx2) => execAction(act, ctx2, m, conn),
            execTools: executors,
            toolbox,
            memBlock: memSys,
            skillBlock: skillsBlock(userText),
            context: {
              isGroup: m?.isGroup !== false,
              isAdmin: !!m?.isAdmin,
              isOwner: !!m?.isOwner,
              isBotAdmin: !!m?.isBotAdmin,
              chat,
              sender: user,
              mediaAttached: !!mediaBuffer,
            },
          });
          if (res?.error) {
            console.log(`[AutoFlow] aichat gagal: ${res.error}`);
            break;
          }
          // mode research → tempel footer sumber [S1][S2] (paritas .aisuperagent);
          // mode persona/tools → jawaban polos apa adanya
          const src = (res?.sources || []).map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`).join("\n");
          const footer = src ? `\n\n📎 sumber\n${src}` : "";
          const fullAnswer = String(res?.answer || "").trim() + footer;
          if (fullAnswer.trim()) {
            // jawaban panjang → chat terusan (gak kepotong), sama pola .aisuperagent
            const parts = splitChatChunks(fullAnswer);
            let ok = false;
            for (let i = 0; i < parts.length; i++) {
              try { await send({ text: parts[i] }); ok = true; } catch { break; }
              if (!ok) break;
            }
            appendTurn(memKey, userText, String(res?.answer || "").trim());
            try { extractMemories(getDatabase(), user, userText, String(res?.answer || "").trim()).catch(() => {}); } catch {}
          }
          // mode suara (VOICE_KEYS.anovaagent, per chat) — keyword request
          // ATAU toggle .anovaagent suara on, sama pola .aisuperagent
          try {
            const { wantsVoice, getVoiceCfg, speakVoiceNote, VOICE_KEYS } = await import("./rara-voice-reply.js");
            const wantVoice = res.voice === true || /\b(vn|voice\s?note|pakai suara|pake suara|dengan suara)\b/i.test(userText)
              || wantsVoice(db, chat, userText, VOICE_KEYS.anovaagent);
            if (wantVoice && res?.answer) {
              const cfg = getVoiceCfg(db, chat, VOICE_KEYS.anovaagent);
              await speakVoiceNote(conn, chat, res.answer, cfg.voice, m?.key ? { quoted: m } : {});
            }
          } catch {}
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
  if (!m) return;
  // anti-loop: cuma skip ECHO balasan yang MEMANG bot ini kirim (ID tercatat
  // di ownSentIds pas execute() ngirim). Pesan yang owner ketik sendiri lewat
  // self-chat/self-bot (fromMe:true tapi BUKAN echo bot) tetap diproses —
  // biar owner bisa testing rule "any"/aichat ke diri sendiri.
  const msgId = m.key?.id;
  if (msgId && ownSentIds.has(msgId)) { ownSentIds.delete(msgId); return; }
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

    // (anti-spam cooldown dihapus — owner 29 Sep, autoflow boleh spam)

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
