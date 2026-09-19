// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CronJob } from "cron";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}
function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `anchor_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

// ==================== Plugin Config ====================
const pluginConfig = {
  name: "aianchor",
  alias: ["aianchor"],
  category: "future",
  description: "AI News Anchor - Berita dengan suara natural realistis",
  usage: ".aianchor <command>",
  example: ".aianchor halo semuanya",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 5,
  isEnabled: true,
};

// ==================== TTS Engine ====================
// Multi-provider TTS dengan fallback chain
// 1. Gemini TTS (jika ada API key) - natural, emotion control, kayak Gemini Live
// 2. Google Translate Neural TTS (fallback, no key) - natural voice

const TONE_INSTRUCTIONS = {
  netral: "Speak in a calm, neutral, professional news anchor tone.",
  lembut: "Speak in a warm, gentle, soft tone. Like a caring friend.",
  marah: "Speak with intensity and urgency. Like an angry news reporter covering a crisis.",
  sedih: "Speak in a melancholic, sorrowful tone. Like reporting a tragedy.",
  semangat: "Speak with high energy and enthusiasm. Like a sports commentator.",
  serius: "Speak in a serious, authoritative tone. Like a breaking news anchor.",
  ramah: "Speak in a friendly, cheerful, welcoming tone.",
  dramatis: "Speak in a dramatic, suspenseful tone. Like a documentary narrator.",
};

const TONE_STYLES = {
  netral: { speed: 1.0, prefix: "", suffix: "" },
  lembut: { speed: 0.85, prefix: "", suffix: "..." },
  marah: { speed: 1.15, prefix: "", suffix: "!" },
  sedih: { speed: 0.75, prefix: "", suffix: "..." },
  semangat: { speed: 1.2, prefix: "", suffix: "!" },
  serius: { speed: 0.95, prefix: "", suffix: "." },
  ramah: { speed: 1.0, prefix: "Halo! ", suffix: "" },
  dramatis: { speed: 0.9, prefix: "", suffix: "..." },
};

// Gemini TTS voices (30 voices available)
const GEMINI_VOICES = [
  "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel",
  "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
  "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux",
  "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix",
  "Sadachbia", "Sadaltager", "Sulafat", "Zaurak"
];

// ==================== TTS: Gemini ====================
async function geminiTTS(text, voice, toneInstruction) {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) return null;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-tts",
    });

    const fullInstruction = toneInstruction || TONE_INSTRUCTIONS.netral;
    const prompt = `${fullInstruction}\n\n${text}`;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Puck" },
          },
        },
      },
    });

    // Extract audio data from response
    const candidates = result?.response?.candidates;
    if (!candidates || !candidates[0]) return null;

    const parts = candidates[0]?.content?.parts;
    if (!parts || !parts[0]) return null;

    const audioData = parts[0]?.inlineData?.data;
    if (!audioData) return null;

    const mimeType = parts[0]?.inlineData?.mimeType || "audio/mp3";
    const ext = mimeType.includes("wav") ? ".wav" : ".mp3";

    return { buffer: Buffer.from(audioData, "base64"), ext, mime: mimeType };
  } catch (err) {
    console.error("[aianchor] Gemini TTS error:", err.message);
    return null;
  }
}

// ==================== TTS: Google Translate (Neural) ====================
async function googleTTS(text, lang = "id") {
  try {
    // Google Translate TTS returns natural neural voice
    // Split long text into chunks (max ~200 chars per request)
    const chunks = splitText(text, 200);
    const buffers = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.status === 200 && res.data) {
        buffers.push(Buffer.from(res.data));
      }
    }

    if (buffers.length === 0) return null;
    const combined = buffers.length > 1 ? Buffer.concat(buffers) : buffers[0];
    return { buffer: combined, ext: ".mp3", mime: "audio/mp3" };
  } catch (err) {
    console.error("[aianchor] Google TTS error:", err.message);
    return null;
  }
}

// ==================== Helper: Split text ====================
function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  const sentences = text.split(/([.!?]\s+)/);
  let current = "";
  for (let i = 0; i < sentences.length; i++) {
    if ((current + sentences[i]).length > maxLen && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentences[i] || "";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ==================== TTS: Generate with tone ====================
async function generateVoice(text, options = {}) {
  const tone = options.tone || "netral";
  const voice = options.voice || "Puck";
  const style = TONE_STYLES[tone] || TONE_STYLES.netral;
  const instruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.netral;

  // Apply tone style to text (for non-Gemini providers)
  let styledText = text;
  if (style.prefix) styledText = style.prefix + styledText;
  if (style.suffix) styledText = styledText + style.suffix;

  // Try Gemini TTS first (best quality, emotion control)
  if (config.geminiApiKey || process.env.GEMINI_API_KEY) {
    console.log("[aianchor] Using Gemini TTS...");
    const result = await geminiTTS(styledText, voice, instruction);
    if (result) {
      return { ...result, provider: "gemini", voice, tone };
    }
  }

  // Fallback: Google Translate Neural TTS
  console.log("[aianchor] Using Google Translate TTS (fallback)...");
  const result = await googleTTS(styledText, "id");
  if (result) {
    return { ...result, provider: "google", voice: "id-ID-Neural", tone };
  }

  return null;
}

// ==================== News Content Generator ====================
async function generateNewsContent(topic, sock) {
  // Use the bot's existing AI to generate news content
  try {
    const { UnlimitedAI } = await import("../../src/scraper/unlimitedai.js");
    const prompt = `Kamu adalah pembawa acara berita profesional. Buatkan naskah berita singkat (3-5 kalimat) tentang: ${topic}.
Format: Pembukaan singkat, isi berita, penutup. Gunakan bahasa Indonesia yang jelas dan profesional.
Jangan pakai emoji. Langsung tulis naskahnya tanpa intro.`;
    const result = await UnlimitedAI(prompt, "nova-ai");
    if (result && result.success && result.response) {
      return result.response.trim();
    }
  } catch (e) { console.error('[aianchor.js]:', e.message); }

  // Fallback if AI fails
  return `Selamat malam para pemirsa. Berita terkini tentang ${topic}. Demikian informasi yang dapat kami sampaikan. Terima kasih telah menonton.`;
}

// ==================== Auto News Scheduler ====================
const autoJobs = new Map();

function getAutoConfig(db) {
  return db.setting("aianchor") || { enabled: false, cron: "0 7,12,18 * * *", topics: [] };
}

function saveAutoConfig(db, data) {
  db.setting("aianchor", data);
  db.save();
}

function startAutoJob(db, sock) {
  stopAutoJob();
  const cfg = getAutoConfig(db);
  if (!cfg.enabled || !cfg.cron) return;

  const job = new CronJob(
    cfg.cron,
    async () => {
      try {
        const topics = cfg.topics.length > 0
          ? cfg.topics
          : ["berita terkini", "cuaca hari ini", "tekno dan gadget", "olahraga"];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const content = await generateNewsContent(topic, sock);
        const voiceResult = await generateVoice(content, { tone: "netral" });

        if (voiceResult) {
          const filePath = tempPath(voiceResult.ext);
          fs.writeFileSync(filePath, voiceResult.buffer);

          // Post to saluran — FIX 19 Sep 2026: dulu `saluranId.includes("@newsletter")`
          // lolos terus sama placeholder "@newsletter" → sendMessage ke JID palsu → gagal senyap.
          const { resolveNewsletterJid } = await import("../../src/lib/nova-saluran.js");
          const saluranId = await resolveNewsletterJid(sock).catch(() => "");
          if (saluranId && /^\d+@newsletter$/.test(saluranId)) {
            await sock.sendMessage(saluranId, {
              audio: await toVoiceNote(fs.readFileSync(filePath)),
              mimetype: "audio/ogg; codecs=opus",
              ptt: false,
              contextInfo: {
                forwardingScore: 0,
                isForwarded: false,
              },
            });
          }

          // Clean up
          try { fs.unlinkSync(filePath); } catch (e) { console.error('[aianchor.js]:', e.message); }
        }
      } catch (err) {
        console.error("[aianchor] Auto news error:", err.message);
      }
    },
    null,
    true,
    "Asia/Jakarta"
  );

  autoJobs.set("main", job);
}

function stopAutoJob() {
  if (autoJobs.has("main")) {
    autoJobs.get("main").stop();
    autoJobs.delete("main");
  }
}

// ==================== Handler ====================
async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const subCmd = (args[1] || "").toLowerCase();

  // ==================== HELP ====================
  if (!subCmd || subCmd === "help" || subCmd === "?" || subCmd === "bantuan") {
    const hasGemini = !!(config.geminiApiKey || process.env.GEMINI_API_KEY);
    const provider = hasGemini ? "Gemini TTS (Natural)" : "Google Neural TTS (Fallback)";

    const helpText = [
      "AI NEWS ANCHOR",
      `Provider: ${provider}`,
      "",
      "Cara pakai:",
      `  ${prefix}aianchor <text>`,
      `  ${prefix}aianchor tone=<nada> <text>`,
      `  ${prefix}aianchor voice=<suara> <text>`,
      `  ${prefix}aianchor news <topik>`,
      "",
      "Nada (tone):",
      "  netral, lembut, marah, sedih,",
      "  semangat, serius, ramah, dramatis",
      "",
      "Suara (voice, jika pakai Gemini):",
      "  Puck, Charon, Kore, Aoede,",
      "  Leda, Orus, Callirrhoe, dll",
      "",
      "Auto-berita (owner):",
      `  ${prefix}aianchor auto on`,
      `  ${prefix}aianchor auto off`,
      `  ${prefix}aianchor auto topics <topik1,topopik2>`,
      `  ${prefix}aianchor auto cron <cron>`,
      `  ${prefix}aianchor auto status`,
      "",
      "Contoh:",
      `  ${prefix}aianchor Selamat malam para pemirsa`,
      `  ${prefix}aianchor tone=semangat Skor akhir 3-2!`,
      `  ${prefix}aianchor tone=marah Segera evakuasi!`,
      `  ${prefix}aianchor news gempa terkini`,
    ].join("\n");
    await m.reply(claraWrap("AI Anchor", helpText));
    return { handled: true };
  }

  // ==================== AUTO (owner only) ====================
  if (subCmd === "auto") {
    if (!m.isOwner) {
      await m.reply(claraWrap("AI Anchor", "Khusus owner.", "warn"));
      return { handled: true };
    }

    const autoSub = (args[2] || "").toLowerCase();

    if (autoSub === "on") {
      const cfg = getAutoConfig(db);
      cfg.enabled = true;
      saveAutoConfig(db, cfg);
      startAutoJob(db, sock);
      await m.reply(claraWrap("AI Anchor",
        `Auto-berita AKTIF!\nCron: ${cfg.cron || "0 7,12,18 * * *"}\nBot akan generate & kirim berita otomatis ke saluran.`,
        "success"));
      return { handled: true };
    }

    if (autoSub === "off") {
      const cfg = getAutoConfig(db);
      cfg.enabled = false;
      saveAutoConfig(db, cfg);
      stopAutoJob();
      await m.reply(claraWrap("AI Anchor", "Auto-berita dimatikan.", "warn"));
      return { handled: true };
    }

    if (autoSub === "cron") {
      const cronExpr = args.slice(3).join(" ").trim();
      if (!cronExpr) {
        await m.reply(claraWrap("AI Anchor", `Format: ${prefix}aianchor auto cron <cron>\n💡 *Contoh:* 0 7,12,18 * * *`, "warn"));
        return { handled: true };
      }
      const cfg = getAutoConfig(db);
      cfg.cron = cronExpr;
      saveAutoConfig(db, cfg);
      if (cfg.enabled) startAutoJob(db, sock);
      await m.reply(claraWrap("AI Anchor", `Cron diupdate: ${cronExpr}`, "success"));
      return { handled: true };
    }

    if (autoSub === "topics") {
      const topicsStr = args.slice(3).join(" ").trim();
      if (!topicsStr) {
        const cfg = getAutoConfig(db);
        await m.reply(claraWrap("AI Anchor",
          `Topics saat ini: ${cfg.topics.length > 0 ? cfg.topics.join(", ") : "(kosong, auto-random)"}`, "warn"));
        return { handled: true };
      }
      const topics = topicsStr.split(",").map(t => t.trim()).filter(Boolean);
      const cfg = getAutoConfig(db);
      cfg.topics = topics;
      saveAutoConfig(db, cfg);
      await m.reply(claraWrap("AI Anchor", `Topics disimpan: ${topics.length} topik`, "success"));
      return { handled: true };
    }

    if (autoSub === "status") {
      const cfg = getAutoConfig(db);
      await m.reply(claraWrap("AI Anchor Status",
        `Status: ${cfg.enabled ? "AKTIF" : "MATI"}\nCron: ${cfg.cron || "0 7,12,18 * * *"}\nTopics: ${cfg.topics.length > 0 ? cfg.topics.join(", ") : "(auto-random)"}\nJob running: ${autoJobs.has("main") ? "YA" : "TIDAK"}`));
      return { handled: true };
    }

    await m.reply(claraWrap("AI Anchor", `Sub-command tidak dikenal. Ketik ${prefix}aianchor help`, "warn"));
    return { handled: true };
  }

  // ==================== NEWS (AI-generated content) ====================
  if (subCmd === "news") {
    const topic = args.slice(2).join(" ").trim();
    if (!topic) {
      await m.reply(claraWrap("AI Anchor", `Format: ${prefix}aianchor news <topik>\n💡 *Contoh:* ${prefix}aianchor news gempa terkini`, "warn"));
      return { handled: true };
    }
    try {
      const content = await generateNewsContent(topic, sock);
      const voiceResult = await generateVoice(content, { tone: "netral" });

      if (!voiceResult) {
        await m.reply(novaError("AIAnchor", "Gagal generate suara nih, coba lagi ya"));
        return { handled: true };
      }

      const filePath = tempPath(voiceResult.ext);
      fs.writeFileSync(filePath, voiceResult.buffer);
      await sock.sendMessage(m.chat, {
        audio: await toVoiceNote(fs.readFileSync(filePath)),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      }, { quoted: m });

      // Send the text content too
      const providerLabel = voiceResult.provider === "gemini"
        ? `Gemini Voice: ${voiceResult.voice}`
        : "Google Neural TTS";
      await m.reply(claraWrap("AI Anchor", `${content}\n\nProvider: ${providerLabel}\nNada: ${voiceResult.tone}`));

      try { fs.unlinkSync(filePath); } catch (e) { console.error('[aianchor.js]:', e.message); }
    } catch (err) {
      await m.reply(claraWrap("AI Anchor", `Error: ${err.message}`, "error"));
    }
    return { handled: true };
  }

  // ==================== DIRECT TEXT TO VOICE ====================
  let text = m.text?.trim();
  let tone = "netral";
  let voice = "Puck";

  // Parse tone= and voice= params
  const toneMatch = text.match(/tone=(\w+)/i);
  const voiceMatch = text.match(/voice=(\w+)/i);

  if (toneMatch) {
    tone = toneMatch[1].toLowerCase();
    text = text.replace(/tone=\w+/i, "").trim();
  }
  if (voiceMatch) {
    voice = voiceMatch[1];
    text = text.replace(/voice=\w+/i, "").trim();
  }

  if (!text || text.length < 2) {
    await navReply(sock, m,
      claraWrap("AI Anchor",
        [`Penggunaan: *${prefix}aianchor <text>*`,
          `Atau: *${prefix}aianchor tone=<nada> <text>*`,
          "",
          "Nada: netral, lembut, marah, sedih,",
          "semangat, serius, ramah, dramatis",
          "",
          "Contoh:",
          `${prefix}aianchor Selamat malam para pemirsa`,
          `${prefix}aianchor tone=marah Segera evakuasi!`].join("\n")),
      "aianchor");
    return { handled: true };
  }

  // Validate tone
  if (!TONE_INSTRUCTIONS[tone]) {
    await m.reply(claraWrap("AI Anchor",
      `Nada tidak valid: ${tone}\nTersedia: netral, lembut, marah, sedih, semangat, serius, ramah, dramatis`, "warn"));
    return { handled: true };
  }
  try {
    const voiceResult = await generateVoice(text, { tone, voice });

    if (!voiceResult) {
      await m.reply(novaError("AIAnchor", "Gagal generate suara nih, coba lagi ya"));
      return { handled: true };
    }

    const filePath = tempPath(voiceResult.ext);
    fs.writeFileSync(filePath, voiceResult.buffer);
    // Send as voice note (PTT)
    await sock.sendMessage(m.chat, {
      audio: await toVoiceNote(fs.readFileSync(filePath)),
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    }, { quoted: m });

    // Info
    const providerLabel = voiceResult.provider === "gemini"
      ? `Gemini (${voiceResult.voice})`
      : "Google Neural";
    await m.reply(claraWrap("AI Anchor",
      `Teks: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}\nNada: ${tone}\nProvider: ${providerLabel}`));

    try { fs.unlinkSync(filePath); } catch (e) { console.error('[aianchor.js]:', e.message); }
  } catch (err) {
    await m.reply(claraWrap("AI Anchor", `Error: ${err.message}`, "error"));
  }

  return { handled: true };
}

// ==================== Export ====================
export { pluginConfig as config, handler, startAutoJob, stopAutoJob, generateVoice, TONE_INSTRUCTIONS, GEMINI_VOICES };

// ================================================================
// CARA SETUP GEMINI TTS (suara natural kayak Gemini Live):
//
// 1. Dapatkan API key gratis di: https://aistudio.google.com/apikey
// 2. Set di config.js: geminiApiKey: "AIza..."
//    Atau set env: GEMINI_API_KEY=AIza...
// 3. Kalau ada key, bot otomatis pakai Gemini TTS yang:
//    - 30 suara natural (Puck, Charon, Kore, dll)
//    - Emotion control (lembut, marah, sedih, dll)
//    - Quality kayak Gemini Live
// 4. Kalau TIDAK ada key, fallback ke Google Neural TTS
//    (tetap natural, tapi tanpa emotion control)
//
// CONTOH PAKAI:
// .aianchor Selamat malam para pemirsa
// .aianchor tone=lembut Halo, apa kabar hari ini
// .aianchor tone=marah Segera evakuasi area ini!
// .aianchor tone=semangat Skor akhir 3-2 untuk Indonesia!
// .aianchor tone=dramatis Malam itu, semuanya berubah
// .aianchor voice=Kore tone=lembut Selamat tidur
// .aianchor news gempa terkini
// .aianchor auto on (owner - auto berita ke saluran)
// ================================================================
