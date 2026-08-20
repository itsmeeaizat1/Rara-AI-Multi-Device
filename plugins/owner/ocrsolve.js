// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// OCR Code/Math Solver — Real-time foto detection, AI Vision analyze code/math
// Toggle: .toggleocrsolve on/off  (owner only)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ocrsolve",
  alias: ["toggleocr", "toggleocrsolve", "automath", "autocodefix", "toggleautomath"],
  category: "owner",
  description: "Toggle on/off auto OCR code/math solver dari foto (real-time)",
  usage: ".toggleocrsolve on/off — Toggle\n.toggleocrsolve status — Cek status\n.toggleocrsolve mode math/code/auto — Set mode deteksi",
  example: ".toggleocrsolve on\n.toggleocrsolve mode auto",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.db.data.autoOcrSolve) db.db.data.autoOcrSolve = {};
    const cfg = db.db.data.autoOcrSolve;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = { enabled: true, mode: cfg[gid]?.mode || "auto" };
      db.db.write();
      const text = claraWrap("Auto OCR Solve", [
        "Status: ON",
        "Mode: " + (cfg[gid].mode || "auto"),
        "",
        "Bot akan otomatis:",
        "1. Deteksi foto masuk di chat",
        "2. Analisis pakai AI Vision (OCR)",
        "3. Deteksi soal matematika atau kode error",
        "4. Kirim jawaban/perbaikan langsung",
        "",
        "Mode: math (soal matematika), code (kode error), auto (deteksi otomatis)",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "toggleocrsolve off untuk matikan");
      await sendReplyWithNav(sock, m, text, "toggleocrsolve");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("Auto OCR Solve", [
        "Status: OFF",
        "Auto OCR solver dimatikan di chat ini",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleocrsolve");
    } else if (args[0] === "mode") {
      const mode = args[1] || "auto";
      if (!["math", "code", "auto"].includes(mode)) {
        const text = claraWrap("Auto OCR Solve", [
          "Mode tidak valid!",
          "Tersedia: math, code, auto",
        ].join("\n"));
        await sendReplyWithNav(sock, m, text, "toggleocrsolve");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].mode = mode;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const modeDesc = {
        math: "Khusus soal matematika",
        code: "Khusus kode error/debugging",
        auto: "Deteksi otomatis (matematika atau kode)",
      };
      const text = claraWrap("Auto OCR Solve", [
        "Mode diubah: " + mode,
        "Deskripsi: " + modeDesc[mode],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleocrsolve");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const mode = cfg[gid]?.mode || "auto";
      const text = claraWrap("Auto OCR Solve", [
        "Status: " + status,
        "Mode: " + mode,
        "",
        "Perintah:",
        prefix + "toggleocrsolve on/off — Toggle",
        prefix + "toggleocrsolve mode <math/code/auto> — Set mode",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleocrsolve");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

// === REAL-TIME DETECTION FUNCTION ===
export async function handleAutoOcrSolve(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoOcrSolve) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoOcrSolve[gid];
    if (!cfg || !cfg.enabled) return false;

    // Check if message is an image
    const msg = m.message || {};
    const imageMsg = msg.imageMessage || m.quoted?.msg?.imageMessage;
    if (!imageMsg) return false;

    if (m.fromMe) return false;
    if (m.isCommand) return false;

    const mode = cfg.mode || "auto";
    const botConfig = (await import("../../config.js")).default;
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      await sock.sendReaction(m.key.remoteJid, "❌", m.key);
      return true;
    }

    // React processing
    try { await sock.sendReaction(m.key.remoteJid, "🔍", m.key); } catch {}

    // Download image
    const buffer = await sock.downloadMediaMessage(m.quoted || m);
    if (!buffer || buffer.length < 500) return false;

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;

    // Build system prompt based on mode
    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "math") {
      systemPrompt = "Kamu adalah tutor matematika ahli. Analisis gambar soal matematika. " +
        "Baca soal dengan OCR, selesaikan langkah demi langkah, dan berikan jawaban akhir. " +
        "Format jawaban dalam bahasa Indonesia, rapi dan mudah dipahami. " +
        "Pisahkan: 1) Soal yang terbaca, 2) Langkah penyelesaian, 3) Jawaban akhir.";
      userPrompt = "Selesaikan soal matematika pada gambar ini.";
    } else if (mode === "code") {
      systemPrompt = "Kamu adalah senior software engineer ahli debugging. " +
        "Analisis gambar kode yang error. Baca kode dengan OCR, identifikasi error, " +
        "dan berikan perbaikan kode yang benar. " +
        "Format: 1) Kode yang terbaca, 2) Error yang teridentifikasi, 3) Kode perbaikan, 4) Penjelasan singkat. " +
        "Gunakan bahasa Indonesia.";
      userPrompt = "Analisis dan perbaiki kode error pada gambar ini.";
    } else {
      // Auto mode: detect if it's math or code
      systemPrompt = "Kamu adalah AI multi-purpose ahli. Analisis gambar ini. " +
        "Deteksi apakah gambar berisi: (A) soal matematika, atau (B) kode programming yang error. " +
        "Jika matematika: selesaikan langkah demi langkah dengan jawaban akhir. " +
        "Jika kode: baca kode, identifikasi error, berikan perbaikan. " +
        "Jika bukan keduanya: jelaskan apa yang ada di gambar secara singkat. " +
        "Format jawaban dalam bahasa Indonesia, rapi dan jelas. " +
        "Pisahkan: 1) Yang terbaca dari gambar, 2) Analisis, 3) Jawaban/Perbaikan.";
      userPrompt = "Analisis gambar ini dan berikan solusi.";
    }

    // Call AI with Vision
    let aiResponse = "";
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiResponse = data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("[AutoOcrSolve] Vision API error:", e.message);
    }

    // Fallback: callAI without vision
    if (!aiResponse) {
      try {
        aiResponse = await callAI({
          providerKey: "openai",
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + " (Note: gambar tidak bisa dibaca, tolong beri tahu user untuk kirim ulang)" },
          ],
          apiKey: apiKey,
          apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoOcrSolve] Fallback error:", e2.message);
      }
    }

    if (!aiResponse || aiResponse.length < 5) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      await sock.sendMessage(m.key.remoteJid, {
        text: claraWrap("Auto OCR Solve", [
          "Gagal menganalisis gambar",
          "Pastikan gambar jelas dan terbaca",
        ].join("\n")),
      }, { quoted: m });
      return true;
    }

    // Send response
    const modeLabel = mode === "math" ? "Math Solver" : mode === "code" ? "Code Fixer" : "Auto Detect";
    const textReply = claraWrap("Auto OCR Solve", [
      "Mode: " + modeLabel,
      "",
      aiResponse.slice(0, 3000),
    ].join("\n"));

    await sock.sendMessage(m.key.remoteJid, { text: textReply }, { quoted: m });
    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch {}

    return true;
  } catch (e) {
    console.error("[AutoOcrSolve] Handler error:", e.message);
    return false;
  }
}

export function isAutoOcrEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoOcrSolve) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoOcrSolve[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
