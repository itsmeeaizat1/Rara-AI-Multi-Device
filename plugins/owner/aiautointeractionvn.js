// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// AI Auto Interaction VN — Gemini Live style, real-time VN detection + neural TTS response
// Toggle: .aiautointeractionvn on/off  (owner only, default OFF saat pairing pertama)
// TTS: Microsoft Edge Neural TTS (GRATIS, suara natural seperti manusia)
import { getDatabase } from "../../src/lib/nova-database.js";
import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
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
  name: "aiautointeractionvn",
  alias: ["aiautointeractionvn"],
  category: "owner",
  description: "Toggle AI auto VN interaction (Gemini Live style) — VN masuk, AI balas suara neural natural",
  usage: ".aiautointeractionvn on/off — Toggle\n.aiautointeractionvn status — Cek status\n.aiautointeractionvn voice <id> — Pilih voice neural\n.aiautointeractionvn lang <kode> — Set bahasa\n.aiautointeractionvn mode api/free — API=Gemini, Free=Edge Neural TTS",
  example: ".aiautointeractionvn on\n.aiautointeractionvn voice gadis",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

// === NEURAL VOICES (Microsoft Edge TTS — GRATIS, natural) ===
const VOICE_OPTIONS = [
  { id: "ardi",     name: "Ardi (Pria ID, natural hangat)",      lang: "id-ID-ArdiNeural",     type: "edge", gender: "Male" },
  { id: "gadis",    name: "Gadis (Wanita ID, natural ceria)",    lang: "id-ID-GadisNeural",    type: "edge", gender: "Female" },
  { id: "ava",      name: "Ava (Wanita EN, natural modern)",      lang: "en-US-AvaNeural",      type: "edge", gender: "Female" },
  { id: "andrew",   name: "Andrew (Pria EN, natural hangat)",     lang: "en-US-AndrewNeural",   type: "edge", gender: "Male" },
  { id: "emma",     name: "Emma (Wanita EN, natural lembut)",     lang: "en-US-EmmaNeural",     type: "edge", gender: "Female" },
  { id: "brian",    name: "Brian (Pria EN, natural BBC style)",   lang: "en-US-BrianNeural",    type: "edge", gender: "Male" },
  { id: "ana",      name: "Ana (Wanita EN, natural muda)",        lang: "en-US-AnaNeural",      type: "edge", gender: "Female" },
  { id: "jenny",    name: "Jenny (Wanita EN, natural friendly)",   lang: "en-US-JennyNeural",    type: "edge", gender: "Female" },
  { id: "topmedia-happy", name: "TopMedia Happy (Emosional)",     lang: "id", type: "topmedia", emotion: "Happy" },
  { id: "topmedia-sad", name: "TopMedia Sad (Emosional sedih)",   lang: "id", type: "topmedia", emotion: "Sad" },
  { id: "topmedia-angry", name: "TopMedia Angry (Emosional marah)", lang: "id", type: "topmedia", emotion: "Angry" },
];

const SYSTEM_INSTRUCTION = `Kamu adalah teman ngobrol via voice note yang sangat natural, hangat, dan ekspresif — seperti Gemini Live.

Aturan jawaban:
1. Jawab dengan gaya bicara LISAN yang natural, kasual, mengalir. Seperti lagi telepon sama teman dekat.
2. JANGAN gunakan format formal, poin-poin, markdown (#, *, -), atau emoji robot. Teks akan diubah jadi suara langsung.
3. Sesuaikan emosi & intonasi dengan emosi VN user. User ceria? Jawab ceria. User sedih? Jawab empatik & lembut. User marah? Jawab tenang tapi tegas.
4. Jawab SINGKAT (1-5 kalimat). Jangan monolog. Ini obrolan dua arah, bukan ceramah.
5. Boleh pakai bahasa gaul/sehari-hari. Natural banget.
6. JANGAN mengaku sebagai AI/bot. Kamu teman biasa namanya Nova.`;

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) db.db.data.aiAutoVnInteraction = {};
    const cfg = db.db.data.aiAutoVnInteraction;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        mode: cfg[gid]?.mode || "free",
        voice: cfg[gid]?.voice || "gadis",
        lang: cfg[gid]?.lang || "id",
      };
      db.db.write();
      const voiceInfo = VOICE_OPTIONS.find(v => v.id === cfg[gid].voice);
      const text = claraWrap("AI Auto VN Interaction", [
        "Status: ON",
        "Mode: " + cfg[gid].mode + (cfg[gid].mode === "free" ? " (Edge Neural TTS gratis)" : " (Gemini API)"),
        "Voice: " + (voiceInfo ? voiceInfo.name : cfg[gid].voice),
        "Bahasa: " + cfg[gid].lang,
        "",
        "Cara kerja:",
        "1. VN masuk -> bot deteksi real-time",
        "2. Transcribe VN (speech-to-text)",
        "3. AI generate jawaban natural",
        "4. Convert ke suara neural (Edge TTS)",
        "5. Balas dengan VN suara natural",
        "",
        "Default OFF. Fitur ini tidak aktif otomatis saat pairing.",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "aiautointeractionvn off untuk matikan");
      await m.reply( text, "aiautointeractionvn");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("AI Auto VN Interaction", [
        "Status: OFF",
        "AI VN interaction dimatikan di chat ini",
      ].join("\n"));
      await m.reply( text, "aiautointeractionvn");
    } else if (args[0] === "mode") {
      const mode = args[1] || "free";
      if (!["free", "api"].includes(mode)) {
        const text = claraWrap("AI Auto VN Interaction", [
          "Mode tidak valid!",
          "free = Edge Neural TTS (GRATIS, suara natural, tanpa API key)",
          "api = Gemini multimodal (butuh geminiApiKey di config)",
        ].join("\n"));
        await m.reply( text, "aiautointeractionvn");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].mode = mode;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const modeDesc = {
        free: "Edge Neural TTS (GRATIS, Microsoft neural voice, tanpa API key, suara natural)",
        api: "Gemini multimodal + TTS (butuh geminiApiKey di config, paling natural)",
      };
      const text = claraWrap("AI Auto VN Interaction", [
        "Mode diubah: " + mode,
        modeDesc[mode],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "aiautointeractionvn");
    } else if (args[0] === "voice") {
      if (!args[1]) {
        let list = "Neural voices tersedia:\n\n";
        VOICE_OPTIONS.forEach((v, i) => {
          list += (i + 1) + ". " + v.id + " — " + v.name + "\n";
        });
        list += "\nKetik: " + prefix + "aiautointeractionvn voice <id>";
        const text = claraWrap("AI Auto VN Interaction", list);
        await m.reply( text, "aiautointeractionvn");
        return { handled: true };
      }
      const voiceId = args[1];
      const voice = VOICE_OPTIONS.find(v => v.id === voiceId);
      if (!voice) {
        const text = claraWrap("AI Auto VN Interaction", "Voice tidak ditemukan! Ketik " + prefix + "aiautointeractionvn voice untuk list");
        await m.reply( text, "aiautointeractionvn");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].voice = voice.id;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const text = claraWrap("AI Auto VN Interaction", [
        "Voice diubah: " + voice.id,
        "Nama: " + voice.name,
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "aiautointeractionvn");
    } else if (args[0] === "lang") {
      const lang = args[1] || "id";
      const supported = ["id", "en", "su", "jv", "ar", "ja", "ko", "zh"];
      if (!supported.includes(lang)) {
        const text = claraWrap("AI Auto VN Interaction", "Bahasa tidak didukung! Tersedia: " + supported.join(", "));
        await m.reply( text, "aiautointeractionvn");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].lang = lang;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const text = claraWrap("AI Auto VN Interaction", [
        "Bahasa diubah: " + lang,
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "aiautointeractionvn");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const mode = cfg[gid]?.mode || "free";
      const voiceId = cfg[gid]?.voice || "gadis";
      const voiceInfo = VOICE_OPTIONS.find(v => v.id === voiceId);
      const lang = cfg[gid]?.lang || "id";
      const text = claraWrap("AI Auto VN Interaction", [
        "Status: " + status,
        "Mode: " + mode + (mode === "free" ? " (Edge Neural TTS)" : " (Gemini API)"),
        "Voice: " + (voiceInfo ? voiceInfo.name : voiceId),
        "Bahasa: " + lang,
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "aiautointeractionvn on/off — Toggle",
        prefix + "aiautointeractionvn mode <free/api> — Set mode",
        prefix + "aiautointeractionvn voice <id> — Pilih neural voice",
        prefix + "aiautointeractionvn lang <kode> — Set bahasa",
      ].join("\n"));
      await m.reply( text, "aiautointeractionvn");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

// === EDGE NEURAL TTS (Microsoft — GRATIS, suara natural) ===
async function edgeTTS(text, voiceLang) {
  try {
    const outFile = tempPath("edgetts", ".mp3");
    const cleanText = text.replace(/["`']/g, "").replace(/\n/g, " ").slice(0, 500);

    // Python edge-tts command
    const cmd = `python3 -c "
import edge_tts, asyncio
import config from "../../config.js";
async def gen():
    comm = edge_tts.Communicate('${cleanText.replace(/'/g, "\\'")}', '${voiceLang}')
    await comm.save('${outFile}')
asyncio.run(gen())
" 2>/dev/null`;

    await execAsync(cmd, { timeout: 30000 });

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      return fs.readFileSync(outFile);
    }
    return null;
  } catch (e) {
    console.error("[AI AutoVN] Edge TTS error:", e.message);
    return null;
  }
}

// === TOPMEDIA TTS (emotion-aware, has API key) ===
async function topMediaTTS(text, emotion = "Happy") {
  try {
    const response = await fetch("https://api.topmediai.com/v1/text2speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.APIkey.voiceai,
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        speaker: "001526de-3826-11ee-a861-00163e2ac61b",
        emotion: emotion,
      }),
    });

    const data = await response.json();
    const audioUrl = data?.data?.oss_url;
    if (!audioUrl) return null;

    const { default: axios } = await import("axios");
    const audioRes = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 30000 });
    if (audioRes.status === 200 && audioRes.data.length > 1000) {
      return Buffer.from(audioRes.data);
    }
  } catch (e) {
    console.error("[AI AutoVN] TopMedia TTS error:", e.message);
  }
  return null;
}

// Convert to OGG Opus for WhatsApp VN
async function convertToOgg(inputBuffer, inputExt = ".mp3") {
  const inFile = tempPath("vnin", inputExt);
  const outFile = tempPath("vnout", ".ogg");

  try {
    fs.writeFileSync(inFile, inputBuffer);
    await execAsync("ffmpeg -y -i " + inFile + " -codec:a libopus -b:a 32k -ar 48000 " + outFile + " 2>/dev/null");

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      return fs.readFileSync(outFile);
    }
    return null;
  } catch (e) {
    console.error("[AI AutoVN] Convert error:", e.message);
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
    try { fs.unlinkSync(outFile); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
  }
}

// === STT: Transcribe VN ===
async function transcribeVN(buffer, mimeType, botConfig) {
  const aiConfig = botConfig.aiHelp || {};
  const apiKey = getApiKey("aiFallback") || getApiKey("openai");
  const geminiKey = String(aiConfig.geminiApiKey || "");

  // Try Gemini multimodal (if key available)
  if (geminiKey) {
    try {
      const base64 = buffer.toString("base64");
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { data: base64, mimeType: mimeType || "audio/ogg" } },
                { text: "Transkripsi audio ini ke teks. Berikan HANYA teks hasil transkripsi, tanpa penjelasan." },
              ],
            }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 1) return text.trim();
      }
    } catch (e) {
      console.error("[AI AutoVN] Gemini STT error:", e.message);
    }
  }

  // Try OpenAI Whisper API
  if (apiKey) {
    try {
      const formData = new FormData();
      const audioBlob = new Blob([buffer], { type: mimeType || "audio/ogg" });
      formData.append("file", audioBlob, "voice.ogg");
      formData.append("model", "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text.trim().length > 1) return data.text.trim();
      }
    } catch (e) {
      console.error("[AI AutoVN] Whisper STT error:", e.message);
    }
  }

  return null;
}

// === AI Response Generation ===
async function generateAIResponse(transcribedText, botConfig) {
  const aiConfig = botConfig.aiHelp || {};
  const apiKey = getApiKey("aiFallback") || getApiKey("openai");
  const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
  const model = String(aiConfig.model || aiConfig.openaiModel || "gpt-4o-mini");
  const geminiKey = String(aiConfig.geminiApiKey || "");

  // Try Gemini API (if key available)
  if (geminiKey) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: transcribedText }] }],
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 1) return text.trim();
      }
    } catch (e) {
      console.error("[AI AutoVN] Gemini response error:", e.message);
    }
  }

  // Fallback: callAI (existing bot AI service)
  try {
    const reply = await callAI({
      providerKey: "openai",
      model: model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: transcribedText },
      ],
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.9,
      maxTokens: 300,
    });
    if (reply && reply.trim().length > 1) return reply.trim();
  } catch (e) {
    console.error("[AI AutoVN] callAI error:", e.message);
  }

  return null;
}

// === REAL-TIME DETECTION FUNCTION (called from handler.js) ===
export async function handleAiAutoVnInteraction(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.aiAutoVnInteraction[gid];
    if (!cfg || !cfg.enabled) return false;

    // Check if message is voice note / audio
    const msg = m.message || {};
    const audioMsg = msg.audioMessage || msg.voiceMessage || msg.pttMessage;
    if (!audioMsg) return false;

    if (m.fromMe) return false;
    if (m.isCommand) return false;

    const voiceId = cfg.voice || "gadis";
    const botConfig = (await import("../../config.js")).default;

    // Set "recording" presence — biar kelihatan hidup
    try { await sock.sendPresenceUpdate("recording", m.key.remoteJid); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
    try { await sock.sendReaction(m.key.remoteJid, "🎙️", m.key); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }

    // Download audio
    const buffer = await sock.downloadMediaMessage(m);
    if (!buffer || buffer.length < 500) return false;

    const mimeType = audioMsg.mimetype || "audio/ogg; codecs=opus";

    // Step 1: Transcribe VN
    let transcribedText = await transcribeVN(buffer, mimeType, botConfig);

    if (!transcribedText) {
      try { await sock.sendReaction(m.key.remoteJid, "⚠️", m.key); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
      await sock.sendMessage(m.key.remoteJid, {
        text: claraWrap("AI VN Interaction", [
          "Gagal transcribe voice note",
          "Butuh API key untuk STT (speech-to-text)",
          "Set di config: aiHelp.apiKey atau aiHelp.geminiApiKey",
        ].join("\n")),
      }, { quoted: m });
      return true;
    }

    // Step 2: Generate AI response (natural conversation)
    let aiReply = await generateAIResponse(transcribedText, botConfig);

    if (!aiReply) {
      try { await sock.sendReaction(m.key.remoteJid, "⚠️", m.key); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
      return true;
    }

    // Clean up AI reply for TTS
    aiReply = aiReply
      .replace(/[*#_~`]/g, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/\[.*?\]/g, "")
      .trim()
      .slice(0, 500);

    // Step 3: Generate VN with neural TTS
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId) || VOICE_OPTIONS[0];
    let vnBuffer = null;

    if (voice.type === "topmedia") {
      vnBuffer = await topMediaTTS(aiReply, voice.emotion || "Happy");
    } else {
      // Edge Neural TTS (primary — GRATIS, natural)
      vnBuffer = await edgeTTS(aiReply, voice.lang);
    }

    // Fallback: try Edge TTS with default Indonesian voice
    if (!vnBuffer) {
      vnBuffer = await edgeTTS(aiReply, "id-ID-ArdiNeural");
    }

    if (!vnBuffer) {
      // If all TTS fail, send text reply
      try { await sock.sendReaction(m.key.remoteJid, "💬", m.key); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
      await sock.sendMessage(m.key.remoteJid, {
        text: claraWrap("AI VN Interaction", aiReply),
      }, { quoted: m });
      return true;
    }

    // Step 4: Convert to OGG Opus for WhatsApp VN
    const oggBuffer = await convertToOgg(vnBuffer, ".mp3");

    if (oggBuffer) {
      await sock.sendMessage(m.key.remoteJid, {
        audio: oggBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.key.remoteJid, {
        audio: vnBuffer,
        mimetype: "audio/mpeg",
      }, { quoted: m });
    }

    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[aiautointeractionvn.js]:', e.message); }
    return true;
  } catch (e) {
    console.error("[AI AutoVN] Handler error:", e.message);
    return false;
  }
}

export function isAiAutoVnEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.aiAutoVnInteraction) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.aiAutoVnInteraction[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
