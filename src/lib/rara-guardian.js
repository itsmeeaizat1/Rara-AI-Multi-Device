// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 GROUP GUARDIAN AI (request owner 12 Sep 2026, ide fitur no 6)
// 🔹 Moderator grup 24/7 berbasis AI — beda dari anti-X regex:
//   guardian NILAI KONTEKS pesan (scam halus, promo samar, toxic
//   njelimet, junk) yang gak bisa ketangkep pola.
// 🔹 Pipeline: heuristik lokal (murah) → AI judge (qwen min1ai
//   via aiChainChat) → aksi bertingkat: catat → warning → hapus → kick
// 🔹 Strike 3x/24 jam → kick otomatis (kalau bot admin)
// ============================================================

const DATA_KEY = "guardian"; // { groups: { [gid]: { on, mode, strikes, log } } }
const STRIKE_WINDOW_MS = 24 * 3600 * 1000;
const STRIKE_KICK = 3;
const LOG_CAP = 30;

// ── data ────────────────────────────────────────────────────
export function getGuardianData(db) {
  try {
    const d = db?.setting?.(DATA_KEY);
    if (d && d.groups) return d;
  } catch {}
  return { groups: {} };
}

function saveGuardian(db, d) {
  try { db?.setting?.(DATA_KEY, d); } catch {}
}

function groupCfg(db, gid) {
  const d = getGuardianData(db);
  if (!d.groups[gid]) d.groups[gid] = { on: false, mode: "normal", strikes: {}, log: [] };
  const g = d.groups[gid];
  if (!g.strikes) g.strikes = {};
  if (!g.log) g.log = [];
  if (!g.mode) g.mode = "normal";
  return { d, g };
}

export function isGuardianOn(db, gid) {
  try { return getGuardianData(db).groups[gid]?.on === true; } catch { return false; }
}

export function setGuardianOn(db, gid, on) {
  const { d, g } = groupCfg(db, gid);
  g.on = on === true;
  if (!on) g.strikes = {};
  saveGuardian(db, d);
  return g.on;
}

export function setGuardianMode(db, gid, mode) {
  if (!["santai", "normal", "strict"].includes(mode)) return null;
  const { d, g } = groupCfg(db, gid);
  g.mode = mode;
  saveGuardian(db, d);
  return mode;
}

export function getGuardianStatus(db, gid) {
  try {
    const g = getGuardianData(db).groups[gid] || {};
    return { on: g.on === true, mode: g.mode || "normal", strikes: g.strikes || {}, log: g.log || [] };
  } catch { return { on: false, mode: "normal", strikes: {}, log: [] }; }
}

// ── strike ──────────────────────────────────────────────────
function addStrike(db, gid, sender) {
  const { d, g } = groupCfg(db, gid);
  const now = Date.now();
  const s = g.strikes[sender] || { count: 0, first: now };
  // decay: strike reset kalau jendela 24 jam kelewat
  if (now - s.first > STRIKE_WINDOW_MS) { s.count = 0; s.first = now; }
  s.count += 1;
  s.last = now;
  g.strikes[sender] = s;
  saveGuardian(db, d);
  return s.count;
}

export function resetStrikes(db, gid, sender) {
  const { d, g } = groupCfg(db, gid);
  const before = g.strikes[sender]?.count || 0;
  delete g.strikes[sender];
  saveGuardian(db, d);
  return before;
}

function logEvent(db, gid, ev) {
  const { d, g } = groupCfg(db, gid);
  g.log.unshift({ ...ev, ts: Date.now() });
  if (g.log.length > LOG_CAP) g.log.length = LOG_CAP;
  saveGuardian(db, d);
}

// ── heuristik lokal (murah — penentu kapan AI perlu dilibatkan) ──
const SCAM_WORDS = /\b(slot|casino|sbobet|pkv|dewapoker|judi|bet\b|deposit|wd\b|menang|maxwin|rtp|bo\s|bandar|agen\b|loans?|pinjol|bunga rendah|dana silpa|kuota gratis|hadiah|menang undian|bingitps|afiliasi|arisan|skema|paytren|slotgacor|gacor)/i;
const PROMO_WORDS = /\b(promo|diskon|jual|dijual|murah| grosir|reseller|dropship|ready stock|open (?:po|pre-order)|limited|stok|order|dm\b|chat admin|cs\b|wa\.me|0857|0878|0812|0895|0821|0838|0896|open ?commission|buka ?jasa)/i;
const NSFW_WORDS = /\b(bokep|memek|kontol|ngentot|anjing?|bangsat|bego|goblok|tolol|bajingan|kampret|setan|dajjal|bgst|memek|titit|penis|vagina|sexy|horny|ml\b|seks|3some|colmek|coli|janda cakep|cewek panggilan)/i;
const LINK_RE = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|bit\.ly\/|tinyurl)/i;

export function localSuspicion(text, mode) {
  if (!text) return null;
  const t = String(text);
  const hasLink = LINK_RE.test(t);
  const scam = SCAM_WORDS.test(t);
  const promo = PROMO_WORDS.test(t);
  const toxic = NSFW_WORDS.test(t);
  const caps = t.length > 20 && t.replace(/[^A-Z]/g, "").length / Math.max(t.replace(/\s/g, "").length, 1) > 0.7;
  const spammy = /(.{10,40})\1{2,}/.test(t) || /( beacon)/.test("") || false;

  if (mode === "santai") {
    // cuma kasus jelas: link+scam, atau scam berat — AI cek
    if ((hasLink && (scam || promo)) || scam) return "indikasi kuat (lokal)";
    return null;
  }
  if (hasLink || scam || promo || toxic || caps || spammy) {
    const why = [hasLink && "link", scam && "kata scam", promo && "kata promo", toxic && "kata kasar/18+", caps && "caps berlebihan", spammy && "pengulangan"]
      .filter(Boolean).join(" + ");
    return why;
  }
  return null;
}

// ── AI judge (qwen min1ai → rantai fallback) ────────────────
let lastAiCall = 0;
export async function aiJudge(text, senderName) {
  // throttle ringan biar gak nembak min1ai tiap detik (rate limit ±7-14 dtk)
  const wait = 1500 - (Date.now() - lastAiCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastAiCall = Date.now();

  const snippet = String(text || "").slice(0, 500).replace(/```/g, "'''");
  const prompt = `Kamu GUARDIAN — moderator AI grup WhatsApp Indonesia. Nilai pesan user di bawah.

Nama pengirim: ${senderName || "user"}
Pesan: """${snippet}"""

Konteks grup: obrolan santai warga Indonesia. Perhatikan bahasa gaul — "anjir", "wkwk", "gokil", teks mode (bukan spam). BUKAN pelanggaran: obrolan biasa, candaan, sapaan, share info bermanfaat, nanya-nanya, bahkan jika sedikit kasar tapi jelas bercanda antar teman.

PELANGGARAN: jualan/promo dagang, jasa/affiliate, link grup lain, judi online/scam/penipuan (dewa poker, slot, pinjol, arisan bodong, "hadiah" minta transfer), pornografi/kekerasan, toxic/menyerang pribadi berat, spam/junk (pengulangan, caps aneh, karakter sampah), minyak kuat/obat terlarang, rekrut MLM/skema.

Balas HANYA satu baris JSON tanpa penjelasan:
{"violation":true|false,"type":"promo|scam|toxic|nsfw|junk|link|none","severity":1|2|3,"reason":"alasan singkat bahasa Indonesia"}

severity: 1=ringan (cukup dicatat), 2=sedang (warning ke user), 3=berat (hapus pesan + warning, ulang = kick).`;

  const { aiChainChat } = await import("./rara-ai-fallback.js");
  const raw = await aiChainChat(prompt, {});
  const clean = String(raw).replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI balas bukan JSON");
  const j = JSON.parse(clean.slice(start, end + 1));
  return {
    violation: j.violation === true,
    type: String(j.type || "none").toLowerCase(),
    severity: Math.min(3, Math.max(1, Number(j.severity) || 1)),
    reason: String(j.reason || "pelanggaran").slice(0, 120),
  };
}

// ── pipeline utama — dipanggil dari hook handler (fire-and-forget) ──
export async function guardianJudge(m, sock, db, config) {
  try {
    if (!m?.chat?.endsWith("@g.us")) return false;
    if (m.fromMe || m.isNewsletter) return false;
    if (!isGuardianOn(db, m.chat)) return false;
    if (m.isOwner) return false; // owner kebal
    if (m.isCommand) return false; // command bot gak dihakimi

    const st = getGuardianStatus(db, m.chat);
    const mode = st.mode;

    // admin dilindungi default (kecuali bot itu sendiri tentu)
    if (m.isAdmin) return false;

    const text = String(m.body || m.text || m.caption || "");
    if (!text.trim()) return false; // media tanpa teks gak dinilai v1

    // 1. heuristik lokal — penentu kapan AI dilibatkan
    const suspect = localSuspicion(text, mode);
    if (!suspect && mode !== "strict") return false;

    // 2. AI judge
    let verdict;
    try {
      verdict = await aiJudge(text, m.pushName || m.sender?.split("@")[0] || "");
    } catch (e) {
      // AI down → fallback keputusan lokal (kasih berat sedang utk kasus jelas)
      if (!suspect) return false;
      verdict = { violation: true, type: "junk", severity: 2, reason: "terdeteksi lokal: " + suspect + " (AI sibuk)" };
    }
    if (!verdict.violation) return false;

    const name = m.pushName || m.sender?.split("@")[0] || "user";
    const label = verdict.type === "none" ? "pelanggaran" : verdict.type;

    // 3. aksi bertingkat
    if (verdict.severity === 1) {
      logEvent(db, m.chat, { sender: m.sender, name, type: label, reason: verdict.reason, act: "dicatat" });
      return true; // senyap — cuma dicatat
    }

    const strikes = addStrike(db, m.chat, m.sender);
    const sisa = STRIKE_KICK - strikes;

    // hapus pesan utk severity 3 (kalau bot admin)
    if (verdict.severity >= 3 && m.isBotAdmin) {
      try { await sock.sendMessage(m.chat, { delete: m.key }); } catch {}
    }

    const shouldKick = m.isBotAdmin && strikes >= STRIKE_KICK;
    if (shouldKick) {
      try {
        await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
        resetStrikes(db, m.chat, m.sender);
        logEvent(db, m.chat, { sender: m.sender, name, type: label, reason: verdict.reason, act: "kick" });
        return true;
      } catch (e) {
        logEvent(db, m.chat, { sender: m.sender, name, type: label, reason: verdict.reason, act: "kick gagal" });
      }
    }

    // warning
    const lines = [
      `🛡️ GUARDIAN — ⚠️ Warning ${strikes}/${STRIKE_KICK} untuk @${m.sender?.split("@")[0]}`,
      ``,
      `Alasan: ${verdict.reason}`,
      `Pelanggaran: ${label} (level ${verdict.severity})`,
    ];
    if (shouldKick) lines.push(`Teguran penuh — kamu akan dikeluarkan dari grup. Perbaiki sikap!`);
    else lines.push(`${sisa} teguran lagi → kick otomatis. Jaga suasana grup ya 🙏`);

    await sock.sendMessage(m.chat, { text: lines.join("\n"), mentions: [m.sender] }, { quoted: m });
    logEvent(db, m.chat, { sender: m.sender, name, type: label, reason: verdict.reason, act: "warn " + strikes + "/" + STRIKE_KICK });
    return true;
  } catch (e) {
    console.error("[guardian] error:", e.message);
    return false;
  }
}

// ── dry-run test (tanpa aksi) — dipakai .guardian test ──────
export async function guardianTest(text) {
  const suspect = localSuspicion(text, "normal");
  const verdict = await aiJudge(text, "user-test");
  return { suspect, verdict };
}
