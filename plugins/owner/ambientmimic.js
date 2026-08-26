// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Ambient Context Mimicry — Bot bisa "mendengar" lingkungan sekitar dari VN
// Deteksi background noise, suasana, emosi user -> respon sesuai konteks fisik
// .ambientmimic on/off — Toggle (default OFF saat pairing)
// Auto aktif di grup: deteksi VN marah/sedih/debat -> respon empatik
import { getDatabase } from "../../src/lib/nova-database.js";
import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(prefix, ext) {
  ensureTmp();
  return path.join(TMP_DIR, `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const pluginConfig = {
  name: "ambientmimic",
  alias: ["ambientmimic"],
  category: "owner",
  description: "Toggle Ambient Context Mimicry — Bot dengar lingkungan dari VN, respon sesuai situasi",
  usage: ".ambientmimic on/off — Toggle\n.ambientmimic status — Cek status\n.ambientmimic mode <auto/manual> — Auto=grup auto-detect, Manual=per VN\n.ambientmimic threshold <low/medium/high> — Sensitivitas deteksi emosi",
  example: ".ambientmimic on\n.ambientmimic mode auto\n.ambientmimic threshold medium",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

const AMBIENT_PROMPT = `Kamu adalah Nova, teman yang punya "indra pendengaran" super tajam. Kamu bisa mendengar tidak hanya kata-kata user, tapi JUGA latar belakang suara (ambient sound) dari voice note mereka.

Tugas kamu:
1. TRANSKRIPSI: Apa yang user katakan
2. AMBIENT DETECTION: Analisis background noise dari audio:
   - Lokasi: di luar (jalan, taman, lapangan), di dalam (kafe, rumah, kantor, kamar)
   - Suara latar: kendaraan, orang bicara, musik, hujan, angin, AC, TV, dll
   - Kebisingan level: tenang, sedang, berisik, sangat berisik
3. EMOSI DETECTION: Dari nada bicara & konteks:
   - Marah/kesal, sedih, senang, netral, panik, lelah, semangat
   - Intonasi: cepat & tinggi = panik/marah, lambat & rendah = sedih/lelah
4. SITUASI: Gabungkan semua — user lagi apa? Lagi di mana? Lagi gimana perasaannya?

Aturan respon:
- Natural, kasual, kayak teman dekat yang peduli
- PERTAMA acknowledge lingkungan: "Wah lagi di luar ya? Berisik banget suaranya"
- KEDUA acknowledge emosi: "Lu kedengar capek banget, lagi banyak pikiran ya?"
- BARU respon ke konten obrolan
- SINGKAT (2-5 kalimat). Jangan monolog
- Boleh pakai bahasa gaul. Santai
- Kalau user marah/debat: tenangkan dulu, jangan tambah panas
- Kalau user sedih: empatik, lembut, jangan toxic positivity
- JANGAN format formal, markdown, poin-poin. Ini obrolan lisan
- JANGAN mengaku AI/bot. Kamu teman biasa

Output format (HANYA ini, tanpa penjelasan tambahan):
[LINGKUNGAN: ...]
[EMOSI: ...]
[RESPON: ...]`;

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.db.data.ambientMimic) db.db.data.ambientMimic = {};
    const cfg = db.db.data.ambientMimic;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        mode: cfg[gid]?.mode || "auto",
        threshold: cfg[gid]?.threshold || "medium",
      };
      db.db.write();
      const text = claraWrap("Ambient Context Mimicry", [
        "Status: ON",
        "Mode: " + cfg[gid].mode + (cfg[gid].mode === "auto" ? " (auto-detect di grup)" : " (manual per VN)"),
        "Threshold: " + cfg[gid].threshold,
        "",
        "Bot sekarang bisa:",
        "1. Dengar background noise dari VN",
        "2. Deteksi lokasi (kafe, jalan, rumah, dll)",
        "3. Deteksi emosi (marah, sedih, senang)",
        "4. Respon sesuai situasi fisik user",
        "",
        "Cocok untuk:",
        "Grup yang lagi panas/debat -> tenangkan",
        "User curhat sedih -> empatik",
        "User lagi di luar -> acknowledge kondisi",
        "",
        "Default OFF. Tidak aktif saat pairing.",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "ambientmimic off untuk matikan");
      await m.reply( text, "ambientmimic");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("Ambient Context Mimicry", [
        "Status: OFF",
        "Ambient detection dimatikan di chat ini",
      ].join("\n"));
      await m.reply( text, "ambientmimic");
    } else if (args[0] === "mode") {
      const mode = args[1] || "auto";
      if (!["auto", "manual"].includes(mode)) {
        const text = claraWrap("Ambient Context Mimicry", [
          "Mode tidak valid!",
          "auto = auto-detect setiap VN di grup (rekomendasi)",
          "manual = hanya saat VN memenukan threshold emosi",
        ].join("\n"));
        await m.reply( text, "ambientmimic");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].mode = mode;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const modeDesc = {
        auto: "Setiap VN masuk di-analyze (lingkungan + emosi + respon)",
        manual: "Hanya VN dengan emosi kuat (marah/sedih/panik) yang di-respon",
      };
      const text = claraWrap("Ambient Context Mimicry", [
        "Mode diubah: " + mode,
        modeDesc[mode],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "ambientmimic");
    } else if (args[0] === "threshold") {
      const threshold = args[1] || "medium";
      if (!["low", "medium", "high"].includes(threshold)) {
        const text = claraWrap("Ambient Context Mimicry", "Threshold tidak valid! Tersedia: low, medium, high");
        await m.reply( text, "ambientmimic");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].threshold = threshold;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const threshDesc = {
        low: "Respon setiap VN, bahkan emosi netral (paling sensitif)",
        medium: "Respon VN dengan emosi terdeteksi (rekomendasi)",
        high: "Hanya VN dengan emosi KUAT (marah/sedih/panik ekstrem)",
      };
      const text = claraWrap("Ambient Context Mimicry", [
        "Threshold: " + threshold,
        threshDesc[threshold],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "ambientmimic");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const mode = cfg[gid]?.mode || "auto";
      const threshold = cfg[gid]?.threshold || "medium";
      const text = claraWrap("Ambient Context Mimicry", [
        "Status: " + status,
        "Mode: " + mode,
        "Threshold: " + threshold,
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "ambientmimic on/off — Toggle",
        prefix + "ambientmimic mode <auto/manual> — Set mode",
        prefix + "ambientmimic threshold <low/medium/high> — Sensitivitas",
        "",
        "Butuh: geminiApiKey di config untuk analisis audio multimodal",
      ].join("\n"));
      await m.reply( text, "ambientmimic");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

// Parse AI output [LINGKUNGAN: ...] [EMOSI: ...] [RESPON: ...]
function parseAmbientResult(text) {
  const result = { lingkungan: "", emosi: "", respon: "" };
  try {
    const lingMatch = text.match(/\[LINGKUNGAN:\s*(.*?)\]/is);
    const emosiMatch = text.match(/\[EMOSI:\s*(.*?)\]/is);
    const responMatch = text.match(/\[RESPON:\s*(.*?)\]/is);
    if (lingMatch) result.lingkungan = lingMatch[1].trim();
    if (emosiMatch) result.emosi = emosiMatch[1].trim();
    if (responMatch) result.respon = responMatch[1].trim();
    // Fallback: if no structured format, use entire text as respon
    if (!result.respon && text.trim()) {
      result.respon = text.replace(/\[.*?\]/g, "").trim();
    }
  } catch (e) { console.error('[ambientmimic.js]:', e.message); }
  return result;
}

// Check if emotion meets threshold
function meetsThreshold(emosi, threshold) {
  const strongEmotions = ["marah", "kesal", "sedih", "panik", "menangis", "frustasi", "lelah", "capek"];
  const mediumEmotions = ["marah", "kesal", "sedih", "panik", "frustasi", "kecewa", "galau"];

  const emosiLower = emosi.toLowerCase();

  if (threshold === "low") return true; // respond to everything
  if (threshold === "medium") {
    return mediumEmotions.some(e => emosiLower.includes(e)) || emosiLower.length > 0;
  }
  if (threshold === "high") {
    return strongEmotions.some(e => emosiLower.includes(e));
  }
  return true;
}

// === REAL-TIME DETECTION (called from handler.js) ===
export async function handleAmbientMimic(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.ambientMimic) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.ambientMimic[gid];
    if (!cfg || !cfg.enabled) return false;

    const msg = m.message || {};
    const audioMsg = msg.audioMessage || msg.voiceMessage || msg.pttMessage;
    if (!audioMsg) return false;

    if (m.fromMe) return false;
    if (m.isCommand) return false;

    const mode = cfg.mode || "auto";
    const threshold = cfg.threshold || "medium";
    const botConfig = (await import("../../config.js")).default;
    const geminiKey = getApiKey("gemini");

    if (!geminiKey) {
      // Without Gemini, can't do multimodal audio analysis
      return false;
    }

    // Download audio
    try { await sock.sendPresenceUpdate("typing", m.key.remoteJid); } catch (e) { console.error('[ambientmimic.js]:', e.message); }
    try { await sock.sendReaction(m.key.remoteJid, "🎧", m.key); } catch (e) { console.error('[ambientmimic.js]:', e.message); }

    const buffer = await sock.downloadMediaMessage(m);
    if (!buffer || buffer.length < 500) return false;

    const mimeType = audioMsg.mimetype || "audio/ogg; codecs=opus";

    // Convert OGG to base64 for Gemini
    const base64 = buffer.toString("base64");

    // Send to Gemini for ambient analysis
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  data: base64,
                  mimeType: mimeType,
                },
              },
              { text: AMBIENT_PROMPT },
            ],
          }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AmbientMimic] Gemini API error:", response.status);
      try { await sock.sendReaction(m.key.remoteJid, "⚠️", m.key); } catch (e) { console.error('[ambientmimic.js]:', e.message); }
      return false;
    }

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText || aiText.trim().length < 5) return false;

    const parsed = parseAmbientResult(aiText);

    // Manual mode: only respond if emotion meets threshold
    if (mode === "manual" && !meetsThreshold(parsed.emosi, threshold)) {
      return false;
    }

    // Auto mode + threshold check
    if (mode === "auto" && threshold === "high" && !meetsThreshold(parsed.emosi, threshold)) {
      return false;
    }

    // Build response with ambient context
    let replyText = "";

    if (parsed.lingkungan && parsed.emosi) {
      // Show what bot "heard"
      const contextLine = claraWrap("Ambient Context Detection", [
        "Lingkungan: " + parsed.lingkungan,
        "Emosi: " + parsed.emosi,
      ].join("\n")) + "\n\n";

      replyText = contextLine + parsed.respon;
    } else if (parsed.respon) {
      replyText = parsed.respon;
    } else {
      replyText = aiText.replace(/\[.*?\]/g, "").trim();
    }

    // Clean up
    replyText = replyText
      .replace(/[*#_~`]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 1500);

    if (replyText.length < 5) return false;

    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });

    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[ambientmimic.js]:', e.message); }
    return true;
  } catch (e) {
    console.error("[AmbientMimic] Handler error:", e.message);
    return false;
  }
}

export function isAmbientMimicEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.ambientMimic) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.ambientMimic[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
