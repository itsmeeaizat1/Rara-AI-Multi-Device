// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// OCR Code/Math Solver — Real-time foto detection, AI Vision analyze code/math
// Dual Mode:
//   One-shot (all users): .ocrsolve — reply ke foto, analisis sekali
//   Persistent (owner): .toggleocrsolve on/off — auto detect tiap foto masuk
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaGuideV2, novaNoInput, novaWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ocrsolve",
  alias: ["ocrsolve"],
  category: "ai",
  description: "OCR Solver — analisis foto soal/kode via AI Vision\nOne-shot: .ocrsolve (reply foto)\nToggle: .toggleocrsolve on/off (owner)",
  usage: ".ocrsolve — One-shot analisis foto (reply foto)\n.ocrsolve math/code/auto — One-shot mode spesifik\n.toggleocrsolve on/off — Persistent (owner)\n.toggleocrsolve mode math/code/auto — Set mode\n.toggleocrsolve status — Cek status",
  example: ".ocrsolve (reply foto soal)\n.ocrsolve math (reply foto matematika)\n.toggleocrsolve on",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ════ One-shot OCR analysis ════
async function doOcrAnalysis(m, sock, mode) {
  try {
    // FIX 25 Sep (bug pre-existing): path ini pakai `prefix` tapi gak pernah
    // didefinisin di scope doOcrAnalysis → ReferenceError tiap reply usage.
    const prefix = m.prefix || ".";
    const botConfig = (await import("../../config.js")).default;
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      await m.reply(novaWrap("OCR Solve", "API Key belum di-set. Owner: .setkey openai <key>"));
      return { handled: true };
    }

    // Get image from reply or from message itself
    const msg = m.message || {};
    const imageMsg = msg.imageMessage || (m.quoted?.isImage ? m.quoted.message?.imageMessage : null); // FIX 10 Sep: quoted flags
    if (!imageMsg) {
      await m.reply(novaGuideV2("ocrsolve", {
 kaomoji: "(๑ᵔ⤙ᵔ๑)",
 sapaan: "jawab soal dari gambar cukup dengan reply! (◕‿◕)",
        cara: "reply foto soalnya lalu ketik command, mode opsional math atau code",
        contoh: prefix + "ocrsolve math (reply foto soal) · " + prefix + "ocrsolve code",
        note: "bot baca soalnya dari gambar terus jawab langsung, math khusus matematika dan code khusus kode error",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }));
      return { handled: true };
    }

    try { await sock.sendReaction(m.key.remoteJid, "🔍", m.key); } catch (e) { console.error('[ocrsolve.js]:', e.message); }

    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download(); // FIX 10 Sep
    if (!buffer || buffer.length < 500) {
      await m.reply(novaWrap("OCR Solve", "Gagal download gambar."));
      return { handled: true };
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;

    // Build prompts based on mode
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
      systemPrompt = "Kamu adalah AI multi-purpose ahli. Analisis gambar ini. " +
        "Deteksi apakah gambar berisi: (A) soal matematika, atau (B) kode programming yang error. " +
        "Jika matematika: selesaikan langkah demi langkah dengan jawaban akhir. " +
        "Jika kode: baca kode, identifikasi error, berikan perbaikan. " +
        "Jika bukan keduanya: jelaskan apa yang ada di gambar secara singkat. " +
        "Format jawaban dalam bahasa Indonesia, rapi dan jelas. " +
        "Pisahkan: 1) Yang terbaca dari gambar, 2) Analisis, 3) Jawaban/Perbaikan.";
      userPrompt = "Analisis gambar ini dan berikan solusi.";
    }

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
      console.error("[OcrSolve] Vision API error:", e.message);
    }

    // Fallback: callAI without vision
    if (!aiResponse) {
      try {
        aiResponse = await callAI({
          providerKey: "ikyy_gemini",
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + " (Note: gambar tidak bisa dibaca, tolong beri tahu user untuk kirim ulang)" },
          ],
          apiKey: apiKey,
          apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[OcrSolve] Fallback error:", e2.message);
      }
    }

    if (!aiResponse || aiResponse.length < 5) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      await m.reply(novaWrap("OCR Solve", "Gagal menganalisis gambar. Pastikan gambar jelas dan terbaca."));
      return { handled: true };
    }

    const modeLabel = mode === "math" ? "Math Solver" : mode === "code" ? "Code Fixer" : "Auto Detect";
    await m.reply(novaWrap("OCR Solve", ["Mode: " + modeLabel, "", aiResponse.slice(0, 3000)].join("\n")));
    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[ocrsolve.js]:', e.message); }
    return { handled: true };
  } catch (e) {
    console.error("[OcrSolve] One-shot error:", e.message);
    await m.reply(novaWrap("ocrsolve", e.message || "Ada yang error nih, coba lagi ya", "error"));
    return { handled: true };
  }
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const db = getDatabase();
    if (!db.db.data.autoOcrSolve) db.db.data.autoOcrSolve = {};
    const cfg = db.db.data.autoOcrSolve;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);
    const isOwner = m.isOwner;

    // ════ TOGGLE COMMANDS (OWNER ONLY) ════
    // Commands: toggleocrsolve, toggleocr, toggleautomath
    const isToggleCmd = ["on", "off", "mode", "status"].includes(args[0]);

    // Check if it's a toggle command (alias starts with "toggle")
    const cmdName = (m.text || "").trim().split(/\s+/)[0].toLowerCase().replace(prefix, "");
    const isToggleAlias = ["toggleocrsolve", "toggleocr", "toggleautomath"].includes(cmdName);

    if (isToggleAlias || (isToggleCmd && ["toggleocr", "toggleocrsolve", "toggleautomath", "automath", "autocodefix"].includes(cmdName))) {
      // Owner-only toggle section
      if (!isOwner) {
        await m.react("🐣");
        await m.reply( novaWrap("OCR Solve", [
          "Toggle persistent hanya untuk owner.",
          "",
          "Kamu bisa pakai one-shot:",
          prefix + "ocrsolve — reply foto untuk analisis sekali",
          prefix + "ocrsolve math — khusus matematika",
          prefix + "ocrsolve code — khusus kode error",
        ].join("\n")), "ocrsolve");
        return { handled: true };
      }

      if (args[0] === "on" || (cmdName === "toggleocrsolve" && !args[0])) {
        cfg[gid] = { enabled: true, mode: cfg[gid]?.mode || "auto" };
        db.db.write();
        const text = novaWrap("Auto OCR Solve", [
          "Status: ON (persistent)",
          "Mode: " + (cfg[gid].mode || "auto"),
          "",
          "Bot akan otomatis deteksi & analisis",
          "setiap foto yang masuk di chat ini.",
        ].join("\n")) + "\n" + tipText("Ketik " + prefix + "toggleocrsolve off untuk matikan");
        await m.reply(text, "ocrsolve");
        return { handled: true };
      } else if (args[0] === "off") {
        if (cfg[gid]) cfg[gid].enabled = false;
        db.db.write();
        await m.reply(novaWrap("Auto OCR Solve", "Status: OFF. Persistent mode dimatikan."), "ocrsolve");
        return { handled: true };
      } else if (args[0] === "mode") {
        const mode = args[1] || "auto";
        if (!["math", "code", "auto"].includes(mode)) {
          await m.reply(novaWrap("Auto OCR Solve", "Mode tidak valid. Tersedia: math, code, auto"), "ocrsolve");
          return { handled: true };
        }
        if (!cfg[gid]) cfg[gid] = {};
        cfg[gid].mode = mode;
        cfg[gid].enabled = cfg[gid].enabled ?? true;
        db.db.write();
        const modeDesc = { math: "Khusus soal matematika", code: "Khusus kode error/debugging", auto: "Deteksi otomatis" };
        await m.reply(novaWrap("Auto OCR Solve", ["Mode: " + mode, "Desc: " + modeDesc[mode], "Status: " + (cfg[gid].enabled ? "ON" : "OFF")].join("\n")), "ocrsolve");
        return { handled: true };
      } else if (args[0] === "status") {
        const status = cfg[gid]?.enabled ? "ON" : "OFF";
        const mode = cfg[gid]?.mode || "auto";
        await m.reply(novaWrap("Auto OCR Solve", ["Status: " + status, "Mode: " + mode, "", "Persistent: " + prefix + "toggleocrsolve on/off", "One-shot: " + prefix + "ocrsolve (reply foto)"].join("\n")), "ocrsolve");
        return { handled: true };
      }
    }

    // ════ ONE-SHOT MODE (ALL USERS) ════
    // .ocrsolve → auto detect (reply foto)
    // .ocrsolve math → math mode
    // .ocrsolve code → code mode
    let mode = "auto";
    if (args[0] === "math" || args[0] === "code" || args[0] === "auto") {
      mode = args[0];
    } else if (args[0] && !["math", "code", "auto"].includes(args[0])) {
      // Unknown sub-command → show help
      await m.reply(novaGuideV2("ocrsolve", {
 kaomoji: "(๑ᵔ⤙ᵔ๑)",
 sapaan: "jawab soal dari gambar cukup dengan reply! (◕‿◕)",
        cara: "reply foto soalnya lalu ketik command, mode opsional math atau code",
        contoh: prefix + "ocrsolve math · " + prefix + "ocrsolve code",
        note: "sub-command yang dikenal cuma math, code, dan auto — mode default bisa diatur owner lewat toggleocrsolve",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }));
      return { handled: true };
    }

    return await doOcrAnalysis(m, sock, mode);
  } catch (e) {
    await m.reply(novaWrap("ocrsolve", e.message || "Ada yang error nih, coba lagi ya", "error"));
  }
  return { handled: true };
}

// === REAL-TIME DETECTION (persistent mode, called from handler.js) ===
export async function handleAutoOcrSolve(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoOcrSolve) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoOcrSolve[gid];
    if (!cfg || !cfg.enabled) return false;

    const msg = m.message || {};
    const imageMsg = msg.imageMessage || (m.quoted?.isImage ? m.quoted.message?.imageMessage : null); // FIX 10 Sep: quoted flags
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

    try { await sock.sendReaction(m.key.remoteJid, "🔍", m.key); } catch (e) { console.error('[ocrsolve.js]:', e.message); }

    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download(); // FIX 10 Sep
    if (!buffer || buffer.length < 500) return false;

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "math") {
      systemPrompt = "Kamu adalah tutor matematika ahli. Analisis gambar soal matematika. Baca soal dengan OCR, selesaikan langkah demi langkah, dan berikan jawaban akhir. Format jawaban dalam bahasa Indonesia, rapi dan mudah dipahami. Pisahkan: 1) Soal yang terbaca, 2) Langkah penyelesaian, 3) Jawaban akhir.";
      userPrompt = "Selesaikan soal matematika pada gambar ini.";
    } else if (mode === "code") {
      systemPrompt = "Kamu adalah senior software engineer ahli debugging. Analisis gambar kode yang error. Baca kode dengan OCR, identifikasi error, dan berikan perbaikan kode yang benar. Format: 1) Kode yang terbaca, 2) Error yang teridentifikasi, 3) Kode perbaikan, 4) Penjelasan singkat. Gunakan bahasa Indonesia.";
      userPrompt = "Analisis dan perbaiki kode error pada gambar ini.";
    } else {
      systemPrompt = "Kamu adalah AI multi-purpose ahli. Analisis gambar ini. Deteksi apakah gambar berisi: (A) soal matematika, atau (B) kode programming yang error. Jika matematika: selesaikan langkah demi langkah. Jika kode: baca kode, identifikasi error, berikan perbaikan. Jika bukan keduanya: jelaskan singkat. Format bahasa Indonesia. Pisahkan: 1) Yang terbaca, 2) Analisis, 3) Jawaban/Perbaikan.";
      userPrompt = "Analisis gambar ini dan berikan solusi.";
    }

    let aiResponse = "";
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: dataUrl } }] },
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

    if (!aiResponse) {
      try {
        aiResponse = await callAI({
          providerKey: "ikyy_gemini", model: model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt + " (gambar tidak bisa dibaca)" }],
          apiKey: apiKey, apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoOcrSolve] Fallback error:", e2.message);
      }
    }

    if (!aiResponse || aiResponse.length < 5) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      await sock.sendMessage(m.key.remoteJid, { text: novaWrap("Auto OCR Solve", "Gagal menganalisis gambar. Pastikan gambar jelas.") }, { quoted: m });
      return true;
    }

    const modeLabel = mode === "math" ? "Math Solver" : mode === "code" ? "Code Fixer" : "Auto Detect";
    await sock.sendMessage(m.key.remoteJid, { text: novaWrap("Auto OCR Solve", ["Mode: " + modeLabel, "", aiResponse.slice(0, 3000)].join("\n")) }, { quoted: m });
    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[ocrsolve.js]:', e.message); }
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
    if (!cfg) return false;
    return cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
