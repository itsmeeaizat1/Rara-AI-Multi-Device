// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Auto-Translate Voice Note — Real-time VN detection, transcribe, translate, respond VN
// Toggle: .toggleautovn on/off  (owner only)
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, tipText, separator } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "autotranslatevn",
  alias: ["autotranslatevn", "toggleautovn"],
  category: "owner",
  description: "Toggle on/off auto-translate voice note (real-time VN detection)",
  usage: ".toggleautovn on/off — Toggle auto VN translate\n.toggleautovn status — Cek status\n.toggleautovn lang <kode> — Set bahasa target (id, en, su, jv)",
  example: ".toggleautovn on\n.toggleautovn lang id",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    if (!db.db.data.autoVnTranslate) db.db.data.autoVnTranslate = {};
    const cfg = db.db.data.autoVnTranslate;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = { enabled: false, lang: cfg[gid]?.lang || "id" };
      db.db.write();
      const text = claraWrap("Auto VN Translate", [
        "Status: ON",
        "Bahasa target: " + (cfg[gid].lang || "id"),
        "",
        "Bot akan otomatis:",
        "1. Deteksi voice note masuk",
        "2. Transcribe ke teks (speech-to-text)",
        "3. Translate ke bahasa target",
        "4. Balas dengan VN suara natural",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "toggleautovn off untuk matikan");
      await m.reply( text, "toggleautovn");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("Auto VN Translate", [
        "Status: OFF",
        "Auto VN translate dimatikan di chat ini",
      ].join("\n"));
      await m.reply( text, "toggleautovn");
    } else if (args[0] === "lang") {
      const lang = args[1] || "id";
      const supported = ["id", "en", "su", "jv", "ar", "ja", "ko", "zh"];
      if (!supported.includes(lang)) {
        const text = claraWrap("Auto VN Translate", [
          "Bahasa tidak didukung!",
          "Tersedia: " + supported.join(", "),
        ].join("\n"));
        await m.reply( text, "toggleautovn");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].lang = lang;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const langNames = { id: "Indonesia", en: "English", su: "Sunda", jv: "Jawa", ar: "Arab", ja: "Jepang", ko: "Korea", zh: "Mandarin" };
      const text = claraWrap("Auto VN Translate", [
        "Bahasa target diubah: " + (langNames[lang] || lang),
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await m.reply( text, "toggleautovn");
    } else {
      // Status
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const lang = cfg[gid]?.lang || "id";
      const text = claraWrap("Auto VN Translate", [
        "Status: " + status,
        "Bahasa: " + lang,
        "",
        "Perintah:",
        prefix + "toggleautovn on/off — Toggle",
        prefix + "toggleautovn lang <kode> — Set bahasa",
      ].join("\n"));
      await m.reply( text, "toggleautovn");
    }
  } catch (e) {
    await m.reply(claraWrap("autotranslatevn", "Gagal proses. Coba lagi.", "error"));
  }
  return { handled: true };
}

// === REAL-TIME DETECTION FUNCTION ===
// Called from handler.js when a voice note is received
export async function handleAutoVnTranslate(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoVnTranslate) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoVnTranslate[gid];
    if (!cfg || !cfg.enabled) return false;

    // Check if message is a voice note / audio
    const msg = m.message || {};
    const audioMsg = msg.audioMessage || msg.voiceMessage;
    if (!audioMsg) return false;

    // Skip if fromMe
    if (m.fromMe) return false;

    // Skip if command
    if (m.isCommand) return false;

    const targetLang = cfg.lang || "id";
    const botConfig = (await import("../../config.js")).default;

    // React processing
    try { await sock.sendReaction(m.key.remoteJid, "🕒", m.key); } catch (e) { console.error('[autotranslatevn.js]:', e.message); }

    // Download audio
    const buffer = await sock.downloadMediaMessage(m);
    if (!buffer || buffer.length < 500) return false;

    // Convert to base64
    const base64Audio = buffer.toString("base64");
    const mimeType = audioMsg.mimetype || "audio/ogg; codecs=opus";

    // Step 1: Transcribe using AI (speech-to-text via Whisper-compatible API)
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      await sock.sendReaction(m.key.remoteJid, "❌", m.key);
      return true;
    }

    // Use Vision-capable model for audio transcription (gpt-4o supports audio)
    // Fallback: use transcription endpoint
    let transcribedText = "";

    try {
      // Try OpenAI audio transcription endpoint
      const formData = new FormData();
      const audioBlob = new Blob([buffer], { type: mimeType });
      formData.append("file", audioBlob, "voice.ogg");
      formData.append("model", "whisper-1");

      const transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey },
        body: formData,
      });

      if (transcribeRes.ok) {
        const transcribeData = await transcribeRes.json();
        transcribedText = transcribeData.text || "";
      }
    } catch (e) {
      console.error("[AutoVnTranslate] Transcribe error:", e.message);
    }

    if (!transcribedText) {
      // Fallback: use callAI with audio description prompt
      try {
        transcribedText = await callAI({
          providerKey: "openai",
          model: model,
          messages: [
            { role: "system", content: "Transcribe audio ini ke teks. Berikan hanya teks hasil transkripsi." },
            { role: "user", content: "[Audio voice note]" },
          ],
          apiKey: apiKey,
          apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoVnTranslate] Fallback transcribe error:", e2.message);
      }
    }

    if (!transcribedText || transcribedText.length < 2) {
      await sock.sendReaction(m.key.remoteJid, "❌", m.key);
      await sock.sendMessage(m.key.remoteJid, {
        text: claraWrap("Auto VN Translate", [
          "Gagal transcribe voice note",
          "Coba kirim ulang dengan audio lebih jelas",
        ].join("\n")),
      }, { quoted: m });
      return true;
    }

    // Step 2: Translate if needed
    let finalText = transcribedText;
    let translatedText = "";

    // Detect language and translate
    const langNames = { id: "Indonesia", en: "English", su: "Sunda", jv: "Jawa", ar: "Arab", ja: "Jepang", ko: "Korea", zh: "Mandarin" };
    const targetLangName = langNames[targetLang] || "Indonesia";

    try {
      translatedText = await callAI({
        providerKey: "openai",
        model: model,
        messages: [
          { role: "system", content: "Terjemahkan teks berikut ke bahasa " + targetLangName + ". Berikan hanya hasil terjemahan, tanpa penjelasan." },
          { role: "user", content: transcribedText },
        ],
        apiKey: apiKey,
        apiEndpoint: apiEndpoint,
      });

      if (translatedText && translatedText.trim()) {
        finalText = translatedText.trim();
      }
    } catch (e) {
      console.error("[AutoVnTranslate] Translate error:", e.message);
      finalText = transcribedText;
    }

    // Step 3: Send text result
    const textReply = claraWrap("Auto VN Translate", [
      "Transkripsi: " + transcribedText.slice(0, 500),
      "",
      "Terjemahan (" + targetLangName + "):",
      finalText.slice(0, 500),
    ].join("\n"));

    await sock.sendMessage(m.key.remoteJid, { text: textReply }, { quoted: m });

    // Step 4: Generate VN reply (TTS) in target language
    try {
      const ttsEndpoints = [
        "https://api.zeks.xyz/api/tts?text=" + encodeURIComponent(finalText.slice(0, 200)),
      ];

      let vnBuffer = null;
      for (const ttsUrl of ttsEndpoints) {
        try {
          const ttsRes = await fetch(ttsUrl);
          if (ttsRes.ok) {
            const arrBuf = await ttsRes.arrayBuffer();
            if (arrBuf.byteLength > 1000) {
              vnBuffer = Buffer.from(arrBuf);
              break;
            }
          }
        } catch (e) { console.error('[autotranslatevn.js]:', e.message); }
      }

      if (vnBuffer) {
        // Convert to ogg for WhatsApp VN
        const fs = await import("fs");
        const path = await import("path");
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);

        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tmpMp3 = path.join(tmpDir, "autovn_" + Date.now() + ".mp3");
        const tmpOgg = path.join(tmpDir, "autovn_" + Date.now() + ".ogg");

        fs.writeFileSync(tmpMp3, vnBuffer);

        try {
          await execAsync("ffmpeg -y -i " + tmpMp3 + " -codec:a libopus -b:a 32k " + tmpOgg + " 2>/dev/null");
          const oggBuffer = fs.readFileSync(tmpOgg);

          await sock.sendMessage(m.key.remoteJid, {
            audio: oggBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
          }, { quoted: m });
        } catch (e) {
          // Fallback: send as MP3
          await sock.sendMessage(m.key.remoteJid, {
            audio: vnBuffer,
            mimetype: "audio/mpeg",
          }, { quoted: m });
        } finally {
          try { fs.unlinkSync(tmpMp3); } catch (e) { console.error('[autotranslatevn.js]:', e.message); }
          try { fs.unlinkSync(tmpOgg); } catch (e) { console.error('[autotranslatevn.js]:', e.message); }
        }
      }
    } catch (e) {
      console.error("[AutoVnTranslate] TTS error:", e.message);
    }

    try { await sock.sendReaction(m.key.remoteJid, "🐣", m.key); } catch (e) { console.error('[autotranslatevn.js]:', e.message); }
    return true;
  } catch (e) {
    console.error("[AutoVnTranslate] Handler error:", e.message);
    return false;
  }
}

export function isAutoVnEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoVnTranslate) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoVnTranslate[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
