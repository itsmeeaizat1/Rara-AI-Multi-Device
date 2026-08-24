// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Voice Note Captcha Interrogation — Ujian suara untuk bukti manusia asli
// Hook ke daftarotomatis: setelah captcha teks benar, user harus kirim VN baca kalimat acak
// Bot verify via Gemini multimodal: cek suara manusia + cek konten kalimat cocok
// .vncaptcha on/off — Toggle (default OFF saat pairing)
// .vncaptcha status — Cek status
// .vncaptcha strict on/off — Strict mode (VN wajib, gagal = block)
import { getDatabase } from "../../src/lib/nova-database.js";
import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "vncaptcha",
  alias: ["voicecaptcha", "vncaptchainterrogation", "humanverify", "vnhumancheck"],
  category: "owner",
  description: "Toggle Voice Note Captcha — ujian suara untuk bukti manusia asli saat daftar",
  usage: ".vncaptcha on/off — Toggle\n.vncaptcha status — Cek status\n.vncaptcha strict on/off — Strict (gagal VN = block)",
  example: ".vncaptcha on\n.vncaptcha strict on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

// Random kalimat untuk ujian suara
const CHALLENGE_SENTENCES = [
  "Kucing melompat di atas genteng sambil makan pisang",
  "Badak berkacamata membaca koran di taman kota",
  "Tujuh ekor kupu-kupu terbang menuju gunung berapi",
  "Gajah mini bermain gitar di atas panggung sekolah",
  "Naga merah menyeduh teh untuk tamu kebesaran",
  "Lima belas jeruk apel jatuh ke kolam koi",
  "Pesawat kertas mendarat halus di atap masjid biru",
  "Sapi bergojek nyusulin penumpang di jalanan macet",
  "Harimau belang menari balet di tengah hutan pinus",
  "Komodo naik ojek ke pasar malam beli jagung bakar",
  "Kura-kura balap bawa tas ransel warna pink neon",
  "Penguin bertopi cylinder jualan es krim di pantai",
  "Tiga ekor tikus menyusun puzzle gambar kelapa muda",
  "Buaya bergelung di sofa nonton drama korea subtitle",
  "Cicak berkacamata hitam naik lift ke lantai tujuh belas",
  "Rakun buka kulkas cari susu cokelat tengah malam",
  "Ular Piton melingkar tiang bendera nyanyi lagu nasional",
  "Fossa makan donat cokelat di atap mall tengah hujan",
  "Beaver membangun bendungan dari batang es krim vanilla",
  "Shark putih pakai jas hitam meeting sama pari manta",
];

const VERIFY_PROMPT = `Kamu adalah sistem verifikasi captcha suara. Tugasmu menilai apakah voice note ini dikirim oleh manusia asli.

Analisis audio ini dan berikan jawaban dalam format JSON HANYA:

1. TRANSCRIPT: Transkripsi apa yang diucapkan dalam audio
2. IS_HUMAN_VOICE: true jika terdengar seperti suara manusia asli (nafas, intonasi, emosi, jeda alami). false jika terdengar seperti TTS/robot/sintetis
3. MATCH_SCORE: 0-100, seberapa cocok transkripsi dengan kalimat target
4. VERDICT: PASS (jika IS_HUMAN_VOICE=true DAN MATCH_SCORE>=60) atau FAIL (jika tidak)

Format output HANYA JSON:
{"transcript":"...","is_human_voice":true/false,"match_score":0-100,"verdict":"PASS/FAIL"}`;

function getRandomSentence() {
  return CHALLENGE_SENTENCES[Math.floor(Math.random() * CHALLENGE_SENTENCES.length)];
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.db.data.vnCaptcha) db.db.data.vnCaptcha = {};
    const cfg = db.db.data.vnCaptcha;
    const gid = "global"; // Global setting, bukan per chat

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        strict: cfg[gid]?.strict ?? false,
      };
      db.db.write();
      const text = claraWrap("VN Captcha Interrogation", [
        "Status: ON",
        "Strict: " + (cfg[gid].strict ? "ON (gagal VN = block 24jam)" : "OFF (gagal VN = retry 3x)"),
        "",
        "Cara kerja registrasi baru:",
        "1. User ketik .daftarotomatis",
        "2. Bot kirim captcha gambar (sistem lama)",
        "3. User jawab captcha teks",
        "4. Jika benar, bot kirim UJIAN SUARA:",
        "   'Buktikan kamu manusia! Kirim VN dan baca:'",
        "   'Kucing melompat di atas genteng...'",
        "5. Bot analyze VN: suara manusia? cocok?",
        "6. PASS = registrasi sukses",
        "7. FAIL = retry (atau block jika strict)",
        "",
        "Bot spam otomatis PASTI GAGAL",
        "karena gak bisa kirim suara manusia",
        "",
        "Default OFF. Tidak aktif saat pairing.",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "vncaptcha off untuk matikan");
      await m.reply( text, "vncaptcha");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("VN Captcha Interrogation", ["Status: OFF", "Verifikasi suara dimatikan, kembali ke captcha teks saja"].join("\n"));
      await m.reply( text, "vncaptcha");
    } else if (args[0] === "strict") {
      const strictOpt = args[1];
      if (strictOpt !== "on" && strictOpt !== "off") {
        const text = claraWrap("VN Captcha Interrogation", "Pilih: on (gagal = block 24jam) atau off (gagal = retry 3x)");
        await m.reply( text, "vncaptcha");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].strict = strictOpt === "on";
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const text = claraWrap("VN Captcha Interrogation", [
        "Strict: " + (cfg[gid].strict ? "ON (gagal VN = block 24jam)" : "OFF (gagal VN = retry 3x)"),
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "vncaptcha");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const strict = cfg[gid]?.strict ? "ON (block 24jam)" : "OFF (retry 3x)";
      const text = claraWrap("VN Captcha Interrogation", [
        "Status: " + status,
        "Strict: " + strict,
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "vncaptcha on/off — Toggle",
        prefix + "vncaptcha strict on/off — Mode strict",
        "",
        "Butuh: geminiApiKey di config untuk analisis audio",
      ].join("\n"));
      await m.reply( text, "vncaptcha");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

// === CHECK IF VN CAPTCHA IS ENABLED ===
export function isVnCaptchaEnabled() {
  try {
    const db = getDatabase();
    if (!db.db.data.vnCaptcha) return false;
    const cfg = db.db.data.vnCaptcha["global"];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

// === IS STRICT MODE ===
export function isVnCaptchaStrict() {
  try {
    const db = getDatabase();
    const cfg = db.db.data?.vnCaptcha?.["global"];
    return cfg && cfg.strict === true;
  } catch {
    return false;
  }
}

// === START VN CAPTCHA CHALLENGE ===
// Called from daftarotomatis.js after text captcha is verified
export async function startVnCaptchaChallenge(m, sock, registrationData) {
  try {
    if (!isVnCaptchaEnabled()) return { skip: true };

    const challengeSentence = getRandomSentence();
    const jid = m.key?.remoteJid || m.sender;

    // Store VN captcha session
    if (!global.vnCaptchaSessions) global.vnCaptchaSessions = {};
    global.vnCaptchaSessions[jid] = {
      step: "vn_challenge",
      sentence: challengeSentence,
      attempts: 0,
      maxAttempts: 3,
      registeredAt: Date.now(),
      registrationData: registrationData || {},
      timeout: setTimeout(() => {
        if (global.vnCaptchaSessions[jid]) {
          delete global.vnCaptchaSessions[jid];
          sock.sendMessage(jid, {
            text: claraWrap("VN Captcha Interrogation", [
              "Waktu habis!",
              "Verifikasi suara gagal. Silakan coba lagi dengan .daftarotomatis",
            ].join("\n")),
          }).catch((e) => { console.error('[vncaptcha.js]:', e.message); });
        }
      }, 120000), // 2 menit timeout
    };

    const text = claraWrap("VN Captcha Interrogation", [
      "Captcha teks berhasil!",
      "",
      "Sekarang verifikasi tahap 2: UJIAN SUARA",
      "",
      "Penting: Kamu harus buktikan kamu manusia asli.",
      "Bot spam otomatis tidak akan bisa lewat tahap ini.",
      "",
      "Instruksi:",
      "1. Kirim Voice Note (VN) sekarang",
      "2. Baca kalimat ini dengan suara:",
      "",
      "  '" + challengeSentence + "'",
      "",
      "3. Bot akan cek: suara manusia + kalimat cocok",
      "",
      "Waktu: 2 menit. Gagal 3x = registrasi dibatalkan.",
    ].join("\n"));

    await sock.sendMessage(jid, { text });
    return { skip: false, sentence: challengeSentence };
  } catch (e) {
    console.error("[VNCaptcha] Start challenge error:", e.message);
    return { skip: true };
  }
}

// === VERIFY VN CAPTCHA (called from handler.js when VN received during challenge) ===
export async function verifyVnCaptcha(m, sock) {
  try {
    const jid = m.key?.remoteJid || m.sender;
    if (!global.vnCaptchaSessions || !global.vnCaptchaSessions[jid]) return false;

    const session = global.vnCaptchaSessions[jid];
    if (session.step !== "vn_challenge") return false;

    // Check if message is VN
    const msg = m.message || {};
    const audioMsg = msg.audioMessage || msg.voiceMessage || msg.pttMessage;
    if (!audioMsg) {
      // Not a VN, remind user
      if (!m.isCommand) {
        await sock.sendMessage(jid, {
          text: claraWrap("VN Captcha Interrogation", [
            "Kirim VOICE NOTE, bukan teks!",
            "Tekan tombol mic di WhatsApp dan baca kalimat:",
            "",
            "  '" + session.sentence + "'",
          ].join("\n")),
        }, { quoted: m });
      }
      return true; // Handled — don't process further
    }

    // Download audio
    try { await sock.sendPresenceUpdate("typing", jid); } catch (e) { console.error('[vncaptcha.js]:', e.message); }
    try { await sock.sendReaction(jid, "🔍", m.key); } catch (e) { console.error('[vncaptcha.js]:', e.message); }

    const buffer = await sock.downloadMediaMessage(m);
    if (!buffer || buffer.length < 500) return false;

    const mimeType = audioMsg.mimetype || "audio/ogg; codecs=opus";
    const botConfig = (await import("../../config.js")).default;
    const geminiKey = getApiKey("gemini");

    if (!geminiKey) {
      // No API key — can't verify, fallback to basic check
      // Accept any VN as pass (less secure but functional)
      console.warn("[VNCaptcha] No geminiApiKey — accepting VN without AI verification");
      clearVnCaptchaSession(jid);
      return { verified: true, fallback: true };
    }

    // Send to Gemini for verification
    const base64 = buffer.toString("base64");
    const targetSentence = session.sentence;

    const verifyPromptWithTarget = VERIFY_PROMPT + "\n\nKalimat target yang harus diucapkan: \"" + targetSentence + "\"";

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { data: base64, mimeType } },
                { text: verifyPromptWithTarget },
              ],
            }],
            generationConfig: {
              temperature: 0.1, // Low temp for objective analysis
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error("[VNCaptcha] Gemini API error:", response.status);
        clearVnCaptchaSession(jid);
        return { verified: false, error: true };
      }

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiText) return { verified: false, error: true };

      // Parse JSON response
      let result;
      try {
        // Clean up markdown code fences if present
        const cleanJson = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        result = JSON.parse(cleanJson);
      } catch {
        // Fallback: extract verdict manually
        const verdictMatch = aiText.match(/PASS|FAIL/i);
        result = {
          verdict: verdictMatch ? verdictMatch[0].toUpperCase() : "FAIL",
          is_human_voice: false,
          match_score: 0,
          transcript: aiText,
        };
      }

      const isPass = result.verdict === "PASS" && result.is_human_voice === true && result.match_score >= 60;

      if (isPass) {
        // SUCCESS — clear session, allow registration
        clearVnCaptchaSession(jid);
        try { await sock.sendReaction(jid, "✅", m.key); } catch (e) { console.error('[vncaptcha.js]:', e.message); }

        await sock.sendMessage(jid, {
          text: claraWrap("VN Captcha Interrogation", [
            "Hasil: LULS",
            "",
            "Suara: Terdeteksi manusia asli",
            "Skor cocok: " + (result.match_score || 0) + "/100",
            "Transkrip: " + (result.transcript || "").slice(0, 80),
            "",
            "Verifikasi suara berhasil!",
            "Lanjut ke registrasi...",
          ].join("\n")),
        }, { quoted: m });

        // Complete registration after VN passes
        try {
          const { completeRegistrationAfterVn } = await import("../user/daftarotomatis.js");
          if (typeof completeRegistrationAfterVn === "function" && session.registrationData) {
            await completeRegistrationAfterVn(m, sock, session.registrationData);
          }
        } catch (e) {
          console.error("[VNCaptcha] Complete registration error:", e.message);
        }

        return { verified: true, result };
      } else {
        // FAIL
        session.attempts++;
        try { await sock.sendReaction(jid, "❌", m.key); } catch (e) { console.error('[vncaptcha.js]:', e.message); }

        const remaining = session.maxAttempts - session.attempts;
        const isStrict = isVnCaptchaStrict();

        if (remaining <= 0 || isStrict) {
          clearVnCaptchaSession(jid);

          // Block if strict
          if (isStrict) {
            const db = getDatabase();
            if (!db.db.data.vnCaptchaBlocks) db.db.data.vnCaptchaBlocks = {};
            const blockUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            db.db.data.vnCaptchaBlocks[jid] = { blockedUntil: blockUntil, reason: "VN captcha failed (strict)" };
            db.db.write();

            await sock.sendMessage(jid, {
              text: claraWrap("VN Captcha Interrogation", [
                "Hasil: GAGAL",
                "",
                "Suara: " + (result.is_human_voice ? "Manusia" : "Robot/TTS"),
                "Skor cocok: " + (result.match_score || 0) + "/100",
                "",
                "Strict mode: Nomor diblokir 24 jam.",
                "Coba lagi besok.",
              ].join("\n")),
            }, { quoted: m });
          } else {
            await sock.sendMessage(jid, {
              text: claraWrap("VN Captcha Interrogation", [
                "Hasil: GAGAL (3x)",
                "",
                "Suara: " + (result.is_human_voice ? "Manusia" : "Robot/TTS"),
                "Skor cocok: " + (result.match_score || 0) + "/100",
                "",
                "Verifikasi gagal. Silakan coba lagi dengan .daftarotomatis",
              ].join("\n")),
            }, { quoted: m });
          }

          return { verified: false, blocked: true, result };
        } else {
          // Retry
          const newSentence = getRandomSentence();
          session.sentence = newSentence;

          await sock.sendMessage(jid, {
            text: claraWrap("VN Captcha Interrogation", [
              "Hasil: GAGAL (" + session.attempts + "/" + session.maxAttempts + ")",
              "",
              "Suara: " + (result.is_human_voice ? "Manusia" : "Robot/TTS"),
              "Skor cocok: " + (result.match_score || 0) + "/100",
              "Transkrip: " + (result.transcript || "").slice(0, 80),
              "",
              "Sisa percobaan: " + remaining,
              "",
              "Coba lagi! Kirim VN dan baca:",
              "  '" + newSentence + "'",
            ].join("\n")),
          }, { quoted: m });

          return { verified: false, retry: true, result };
        }
      }
    } catch (e) {
      console.error("[VNCaptcha] Verify error:", e.message);
      clearVnCaptchaSession(jid);
      return { verified: false, error: true };
    }
  } catch (e) {
    console.error("[VNCaptcha] Verify error:", e.message);
    return false;
  }
}

// === CHECK IF JID IS BLOCKED (strict mode) ===
export function isVnCaptchaBlocked(jid) {
  try {
    const db = getDatabase();
    if (!db.db.data.vnCaptchaBlocks) return false;
    const block = db.db.data.vnCaptchaBlocks[jid];
    if (!block) return false;
    if (Date.now() > block.blockedUntil) {
      delete db.db.data.vnCaptchaBlocks[jid];
      db.db.write();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// === CHECK IF JID HAS PENDING VN CAPTCHA CHALLENGE ===
export function hasVnCaptchaChallenge(jid) {
  try {
    return !!(global.vnCaptchaSessions && global.vnCaptchaSessions[jid] && global.vnCaptchaSessions[jid].step === "vn_challenge");
  } catch {
    return false;
  }
}

// === CLEAR VN CAPTCHA SESSION ===
export function clearVnCaptchaSession(jid) {
  try {
    if (global.vnCaptchaSessions && global.vnCaptchaSessions[jid]) {
      if (global.vnCaptchaSessions[jid].timeout) {
        clearTimeout(global.vnCaptchaSessions[jid].timeout);
      }
      delete global.vnCaptchaSessions[jid];
    }
  } catch (e) { console.error('[vncaptcha.js]:', e.message); }
}

export { pluginConfig as config, handler };
