// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 rara-aicall-bridge.js — Voice Command Bridge AI Call (26 Sep 2026)
// 🔹 Request owner: "apakah aicall bisa kontrol bot, misal lagi telepon
//   ai call 'halo tolong matikan bot' otomatis respon ke cmd bot off atau
//   ke fitur semua yang ada di bot"
// 🔹 CARA KERJA: service Go aicall (yang megang panggilan VOIP) tiap giliran
//   bicara kirim transkrip STT ke sini POST /voice {text, number}:
//   - cocok sama peta perintah suara ("matikan bot" → .bot off dll)?
//     → jalankan command lewat messageHandler PENUH (middleware/cooldown/
//       energi jalan semua, pola executor agent), balas {type:"command",
//       text} → Go nyuarain konfirmasi ke telinga owner.
//   - gak cocok → {type:"chat"} → lanjut percakapan AI normal.
// 🔹 KEAMANAN: 127.0.0.1 SAJA; key X-Api-Key (env AICALL_HTTP_KEY — sama
//   dengan service Go). Owner 26 Sep: "user bsa akses aicall tp hrs premium
//   dlu biar g dispam trus user g bsa akses fitur yg owner only". Level akses
//   = owner > premium > none (POST /acl buat Go ngecek sebelum angkat).
//   Perintah FIXED (matikan bot dll) CUMA owner; premium yang maksa → AI
//   ngucapin tolakan eksplisit. Jalur generik "titik <cmd>" tetap lewat
//   middleware bot (izin per-fitur — owner-only ditolak otomatis).
//   ".bot" selalu lolos gate kill-switch di handler → "nyalakan bot"
//   via telepon TETAP jalan walau bot lagi off (owner).
// 🔹 REPLY-FIRST: perintah yang bikin bot mati/nyambung ulang (restart,
//   reconnect) dijawab DULU ke Go, eksekusi 800ms kemudian — kalau
//   sinkron, proses Node mati duluan dan respons gak pernah sampai.
// ============================================================
import http from "node:http";
import { isOwner } from "../../config.js";
import { isPremium } from "./rara-premium-db.js";

const DEFAULT_PORT = parseInt(process.env.AICALL_BRIDGE_PORT || "8790", 10) || 8790;
const EXEC_TIMEOUT_MS = parseInt(process.env.AICALL_BRIDGE_EXEC_MS || "20000", 10) || 20000;
const REPLY_FIRST_DELAY_MS = 800;

// 🔹 seams e2e
let _messageHandlerImpl;
export function _setBridgeMessageHandlerForTest(fn) { _messageHandlerImpl = fn; }
export function _clearBridgeMessageHandlerForTest() { _messageHandlerImpl = undefined; }
let _isOwnerImpl;
export function _setBridgeOwnerCheckForTest(fn) { _isOwnerImpl = fn; }
export function _clearBridgeOwnerCheckForTest() { _isOwnerImpl = undefined; }
let _isPremiumImpl;
export function _setBridgePremiumCheckForTest(fn) { _isPremiumImpl = fn; }
export function _clearBridgePremiumCheckForTest() { _isPremiumImpl = undefined; }

function ownerCheck(jid) {
  if (typeof _isOwnerImpl === "function") return _isOwnerImpl(jid);
  try { return isOwner(jid); } catch { return false; }
}

function premiumCheck(jid) {
  if (typeof _isPremiumImpl === "function") return _isPremiumImpl(jid);
  try { return isPremium(jid); } catch { return false; }
}

// level akses pemanggil — owner > premium > none (owner 26 Sep: "user bsa
// akses aicall tp hrs premium dlu biar g dispam")
export function callerAcl(jid) {
  if (ownerCheck(jid)) return "owner";
  if (premiumCheck(jid)) return "premium";
  return "none";
}

// kalimat tolakan yang DIUCAPKAN AI di telepon buat premium yang nyoba
// perintah kontrol bot fixed ("matikan bot" dll) — owner 26 Sep: "otomatis
// ai bilang ditolak atau g bsa ini hanya admin dan owner saja"
export const VOICE_REJECT_TXT = "Maaf, permintaan ditolak. Kontrol bot lewat telepon hanya bisa digunakan admin dan owner saja.";

// ── Peta perintah suara (kata → command bot) ──
// Urutan penting: paling spesifik duluan. Teks dinormalkan (lowercase +
// buang tanda baca) sebelum dicocokin. Whisper ID biasa nemuin frasa ini.
// Jalur generik "titik <cmd>" membuka SEMUA fitur bot via suara (tetap
// lewat middleware izin).
// CATATAN: akhiran "-nya" di-normalkan ke kata sendiri ("matiin botnya" →
// "matiin bot nya") — makanya alternatif gak perlu ngehandle "botnya".
export const VOICE_COMMANDS = [
  { re: /\b(matikan|matiin|mematikan)\s+(bot|rara|aina)\b/, cmd: "bot off", speak: "Siap, botnya saya matikan. Sampai nanti ya." },
  { re: /\b(nyalakan|nyalain|hidupkan|aktifkan)\s+(bot|rara|aina)\b/, cmd: "bot on", speak: "Siap, botnya sudah saya nyalakan lagi." },
  { re: /\b(bisukan|bisuin|diamkan)\s+(bot|rara|aina)\b|\b(bot|rara|aina)\s+(di)?bisukan\b/, cmd: "bot mute", speak: "Siap, botnya saya bisukan dulu." },
  { re: /\b(restart|hidupkan ulang|nyalakan ulang)\s+(bot|rara|aina)\b|\b(bot|rara|aina)\s+restart\b/, cmd: "index restart", speak: "Siap, saya restart botnya sebentar ya.", replyFirst: true },
  { re: /\b(reconnect|sambungkan ulang)\s+(bot|wa|whatsapp|koneksi)\b/, cmd: "index reconnect", speak: "Siap, saya sambungkan ulang koneksinya ya.", replyFirst: true },
  { re: /\b(simpan|backup)\s+(database|db|data)\b/, cmd: "index db save", speak: "Siap, database sudah saya simpan." },
];

// normalisasi: lowercase + buang tanda baca (titik/koma/tanya/seru/dash)
export function normalizeVoiceText(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[,._\-!?;:"]/g, " ")
    .replace(/\b(bot|rara|aina|db|wa)nya\b/g, "$1 nya")
    .replace(/\s+/g, " ")
    .trim();
}

// cocokin transkrip → command; return null kalau bukan perintah
export function matchVoiceCommand(text) {
  const norm = normalizeVoiceText(text);
  if (!norm) return null;
  for (const v of VOICE_COMMANDS) {
    if (v.re.test(norm)) return { ...v };
  }
  // jalur generik: "titik <cmd>" / "point <cmd>" — SEMUA fitur bot
  // bisa diperintah via suara (tetap lewat middleware izin)
  const m = norm.match(/^(?:titik|point)\s+(.+)$/);
  if (m) return { cmd: m[1].trim(), generic: true };
  return null;
}

// nomor peer dari Go: "62812@s.whatsapp.net" / "62812:0@s.whatsapp.net"
// → jid rapi "62812@s.whatsapp.net"
function cleanPeerJid(raw) {
  const s = String(raw || "").trim();
  const digits = s.replace(/@.+$/, "").replace(/:\d+$/, "").replace(/\D/g, "");
  if (!digits || digits.length < 6) return "";
  return digits + "@s.whatsapp.net";
}

// ambil teks dari payload sendMessage (buat konfirmasi lisan generik)
function extractText(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return String(payload.text || payload.caption || "");
}

// jalankan command via messageHandler PENUH (pola executor agent.js —
// middleware/cooldown/energi/kill-switch semua tetap jalan).
// Balikin teks reply yang kekirim (buat konfirmasi lisan jalur generik).
async function executeVoiceCommand(cmd, peerJid, sock) {
  const mh = typeof _messageHandlerImpl === "function" ? _messageHandlerImpl : (await import("../handler.js")).messageHandler;
  const captured = [];
  // proxy sock: biarin kirim asli (owner lihat output penuh di DM) + tangkap teksnya
  const proxySock = new Proxy(sock, {
    get(target, key) {
      if (key === "sendMessage") {
        return async (jid, payload, opts) => {
          try { const t = extractText(payload); if (t) captured.push(t); } catch {}
          return target.sendMessage(jid, payload, opts);
        };
      }
      const v = target[key];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  const raw = {
    key: { remoteJid: peerJid, fromMe: false, id: "VOICECMD" + Date.now(), participant: peerJid },
    message: { conversation: "." + cmd },
    messageTimestamp: Math.floor(Date.now() / 1000),
  };
  await Promise.race([
    mh(raw, proxySock),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout eksekusi perintah")), EXEC_TIMEOUT_MS)),
  ]);
  return captured.join("\n").trim();
}

// teks yang diucapin bot di telepon (jalur generik: jujur kalau gak jalan)
function speakTextFor(entry, captured) {
  if (entry.speak) return entry.speak;
  if (captured) {
    const firstLine = captured.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
    const clean = firstLine.replace(/[*_`~|#>]/g, "").slice(0, 140);
    return "Siap. " + clean;
  }
  return "Maaf, perintah itu tidak bisa saya jalankan. Mungkin botnya sedang mati atau perintahnya tidak dikenal.";
}

// ── HTTP server (127.0.0.1 ONLY) ──
let _started = false;
export function startAicallVoiceBridge(sock, { port } = {}) {
  if (_started) return;
  _started = true;
  try {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (req.method !== "POST" || (url.pathname !== "/voice" && url.pathname !== "/acl")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "not found" }));
      }
      // auth — key sama dengan service Go (kosong = tanpa key, lokal saja)
      const key = process.env.AICALL_HTTP_KEY || "";
      if (key && req.headers["x-api-key"] !== key) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      }
      let buf = "";
      req.on("data", (c) => { buf += c; if (buf.length > 65536) req.destroy(); });
      req.on("error", () => {});
      req.on("end", async () => {
        try {
          const body = JSON.parse(buf || "{}");
          const peerJid = cleanPeerJid(body.number);
          // gate /acl — buat service Go cek level akses SEBELUM angkat telepon
          // (cukup nomor, gak butuh text)
          if (url.pathname === "/acl") {
            if (!peerJid) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ ok: false, error: "number wajib" }));
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, level: callerAcl(peerJid) }));
          }
          if (!body.text || !peerJid) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: false, error: "text & number wajib" }));
          }
          const entry = matchVoiceCommand(body.text);
          if (!entry) {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, type: "chat" }));
          }
          // keamanan: level akses pemanggil menentukan apa yang boleh
          const level = callerAcl(peerJid);
          if (level === "none") {
            // bukan owner/premium — command gak pernah jalan (Go harusnya
            // udah nolak panggilannya; ini lapisan cadangan)
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, type: "chat" }));
          }
          if (level === "premium" && !entry.generic) {
            // premium BOLEH telepon AI, tapi perintah kontrol FIXED
            // ("matikan bot" dll) cuma owner — AI ngucapin tolakan,
            // gak pura-pura jalanin atau ngobrol ngalor-ngidul
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ ok: true, type: "command", cmd: "", text: VOICE_REJECT_TXT }));
          }
          // premium + jalur generik "titik <cmd>": TETAP lewat middleware
          // bot (izin per-fitur dicek — owner-only ditolak middleware,
          // premium-fitur jalan sesuai haknya). Owner: semua jalan.
          if (entry.replyFirst) {
            // restart/reconnect: jawab DULU, eksekusi belakangan (proses bisa mati)
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, type: "command", cmd: entry.cmd, text: entry.speak }));
            setTimeout(() => {
              executeVoiceCommand(entry.cmd, peerJid, sock).catch((e) => console.error("[aicall-bridge] eksekusi tertunda gagal:", e?.message || e));
            }, REPLY_FIRST_DELAY_MS);
            return;
          }
          let captured = "";
          try {
            captured = await executeVoiceCommand(entry.cmd, peerJid, sock);
          } catch (e) {
            console.error("[aicall-bridge] gagal eksekusi", entry.cmd, ":", e?.message || e);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, type: "command", cmd: entry.cmd, text: speakTextFor(entry, captured) }));
        } catch (e) {
          try {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
          } catch {}
        }
      });
    });
    server.listen(port || DEFAULT_PORT, "127.0.0.1", () => {
      const k = process.env.AICALL_HTTP_KEY || "";
      console.log(`[aicall-bridge] Voice command bridge jalan di 127.0.0.1:${port || DEFAULT_PORT} (key: ${k ? "aktif" : "tanpa key"})`);
    });
    server.on("error", (e) => console.error("[aicall-bridge] server error:", e?.message || e));
  } catch (e) {
    console.error("[aicall-bridge] gagal start:", e?.message || e);
  }
}
