// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Instant Meme Generator — Real-time foto detection, auto add funny text via AI Vision
// Dual Mode:
//   One-shot (all users): .automeme — reply ke foto, generate meme sekali
//   Persistent (owner): .toggleautomeme on/off — auto generate tiap foto masuk (default ON)
import { getDatabase } from "../../src/lib/rara-database.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText } from "../../src/lib/rara-menu-style.js";
import { callAI, callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "automemegenerator",
  alias: ["automemegenerator", "automeme"],
  category: "ai",
  description: "Meme Generator — AI Vision auto teks meme dari foto\nOne-shot: .automeme (reply foto)\nToggle: .toggleautomeme on/off (owner)",
  usage: ".automeme — One-shot generate meme (reply foto)\n.automeme top/bottom/full/auto — One-shot style\n.toggleautomeme on/off — Persistent (owner)\n.toggleautomeme style <style> — Set style\n.toggleautomeme status — Cek status",
  example: ".automeme (reply foto)\n.automeme bottom (reply foto, classic)\n.toggleautomeme off",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ════ One-shot meme generation ════
async function doMemeAnalysis(m, sock, style) {
  try {
    const botConfig = (await import("../../config.js")).default;
    const prefix = botConfig.command?.prefix || ".";
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      await m.reply(raraWrap("Auto Meme", "API Key belum di-set. Owner: .setkey openai <key>"));
      return { handled: true };
    }

    const msg = m.message || {};
    const imageMsg = msg.imageMessage || (m.quoted?.isImage ? m.quoted.message?.imageMessage : null); // FIX 10 Sep: quoted flags
    if (!imageMsg) {
      await m.reply(raraGuide(
        "automeme",
        "Tidak ada foto terdeteksi — reply foto dengan command ini untuk generate meme\n" +
        prefix + "automeme — auto style (reply foto)\n" +
        prefix + "automeme top — teks di atas\n" +
        prefix + "automeme bottom — classic (teks di bawah)\n" +
        prefix + "automeme full — caption panjang",
        prefix + "automeme top (reply foto)"
      ));
      return { handled: true };
    }

    try { await sock.sendReaction(m.key.remoteJid, "🎭", m.key); } catch (e) { console.error('[automemegenerator.js]:', e.message); }

    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download(); // FIX 10 Sep
    if (!buffer || buffer.length < 500) {
      await m.reply(raraError("AutoMeme", "Gagal download gambar nih"));
      return { handled: true };
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;
    const caption = imageMsg.caption || "";

    let systemPrompt = "Kamu adalah meme generator AI yang lucu dan kreatif. Analisis foto dan buat teks meme yang lucu, relevan, dan relate ke konteks foto. ";
    if (style === "top") {
      systemPrompt += "Buat SATU teks singkat (max 5 kata) untuk bagian ATAS meme. ";
    } else if (style === "bottom") {
      systemPrompt += "Buat SATU teks singkat (max 7 kata) untuk bagian BAWAH meme (classic meme style). ";
    } else if (style === "full") {
      systemPrompt += "Buat caption meme lucu yang lebih panjang (1-2 kalimat). ";
    } else {
      systemPrompt += "Pilih style terbaik: buat teks atas DAN bawah meme, atau caption saja. ";
    }
    systemPrompt += "Gunakan bahasa Indonesia yang gaul dan lucu. JANGAN gunakan kata kasar atau SARA. Berikan HANYA teks meme, tanpa penjelasan tambahan.";

    let userPrompt = "Buat teks meme lucu dari foto ini.";
    if (caption) userPrompt += " Caption foto: " + caption;

    let memeText = "";
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
          max_tokens: 200,
          temperature: 0.9,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        memeText = data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("[AutoMeme] Vision API error:", e.message);
    }

    if (!memeText || memeText.length < 2) {
      try {
        memeText = await callAI({
          providerKey: "ikyy_gemini", model: model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Buat teks meme lucu random (gambar tidak bisa dibaca)." }],
          apiKey: apiKey, apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoMeme] Fallback error:", e2.message);
      }
    }

    if (!memeText || memeText.length < 2) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      await m.reply(raraError("AutoMeme", "Gagal generate meme nih, coba lagi ya"));
      return { handled: true };
    }

    memeText = memeText.replace(/^["']|["']$/g, "").replace(/\n{2,}/g, "\n").trim();

    // Try to generate meme image with text overlay via sharp
    let memeSent = false;
    try {
      const sharp = (await import("sharp")).default;
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;

      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 500;
      const height = metadata.height || 500;
      const fontSize = Math.round(width / 15);
      const textY = style === "top" ? fontSize : style === "bottom" ? height - fontSize * 2 : height / 2;

      const maxChars = Math.floor(width / (fontSize * 0.6));
      let lines = [];
      let currentLine = "";
      for (const word of memeText.split(" ")) {
        if ((currentLine + " " + word).length > maxChars) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) lines.push(currentLine);
      if (lines.length > 3) lines = lines.slice(0, 3);

      const svgText = lines.map((line, i) => {
        const y = textY + (i * fontSize * 1.3);
        return `<text x="50%" y="${y}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="white" stroke="black" stroke-width="${Math.round(fontSize/15)}" font-family="Impact, Arial Black, sans-serif">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`;
      }).join("");

      const svgOverlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" fill="none" />${svgText}</svg>`);

      const memeBuffer = await sharp(buffer).composite([{ input: svgOverlay, top: 0, left: 0 }]).jpeg({ quality: 85 }).toBuffer();

      let memeCap = raraWrap("Auto Meme", ["Style: " + style, "", memeText.slice(0, 200)].join("\n"));
      try {
        const info = await probeBuffer(memeBuffer);
        const card = mediaResultCard({
          header: "automeme",
          request: [["Gaya", style], ["Teks", String(memeText).slice(0, 80)]],
          size: info.size, mime: info.mime, width: info.width, height: info.height,
        });
        if (card) memeCap = card;
      } catch {}
      await sock.sendMessage(m.key.remoteJid, {
        image: memeBuffer,
        caption: memeCap,
      }, { quoted: m });
      memeSent = true;
    } catch (e) {
      console.error("[AutoMeme] Sharp overlay error:", e.message);
    }

    if (!memeSent) {
      await m.reply(raraWrap("Auto Meme", ["Style: " + style, "", memeText.slice(0, 300)].join("\n")));
    }

    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[automemegenerator.js]:', e.message); }
    return { handled: true };
  } catch (e) {
    console.error("[AutoMeme] One-shot error:", e.message);
    await m.reply(raraWrap("automemegenerator", e.message || "Ada yang error nih, coba lagi ya", "error"));
    return { handled: true };
  }
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const db = getDatabase();
    if (!db.db.data.autoMemeGen) db.db.data.autoMemeGen = {};
    const cfg = db.db.data.autoMemeGen;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);
    const isOwner = m.isOwner;

    const cmdName = (m.text || "").trim().split(/\s+/)[0].toLowerCase().replace(prefix, "");
    const isToggleAlias = ["toggleautomeme", "automemetoggle", "toggleinstantmeme"].includes(cmdName);
    const isToggleSubCmd = ["on", "off", "style", "status"].includes(args[0]);

    // ════ TOGGLE COMMANDS (OWNER ONLY) ════
    if (isToggleAlias || (isToggleSubCmd && ["toggleautomeme", "automemetoggle"].includes(cmdName))) {
      if (!isOwner) {
        await m.react("🐣");
        await m.reply( raraWrap("Auto Meme", [
          "Toggle persistent hanya untuk owner.",
          "",
          "Kamu bisa pakai one-shot:",
          prefix + "automeme — reply foto, generate meme sekali",
          prefix + "automeme top/bottom/full/auto — pilih style",
        ].join("\n")), "automemegenerator");
        return { handled: true };
      }

      if (args[0] === "on" || (cmdName === "toggleautomeme" && !args[0])) {
        cfg[gid] = { enabled: true, style: cfg[gid]?.style || "auto" };
        db.db.write();
        const text = raraWrap("Auto Meme Generator", [
          "Status: ON (persistent)",
          "Style: " + (cfg[gid].style || "auto"),
          "",
          "Bot akan otomatis generate meme",
          "dari setiap foto yang masuk di chat ini.",
        ].join("\n")) + "\n" + tipText("Ketik " + prefix + "toggleautomeme off untuk matikan");
        await m.reply(text, "automemegenerator");
        return { handled: true };
      } else if (args[0] === "off") {
        if (!cfg[gid]) cfg[gid] = {};
        cfg[gid].enabled = false;
        db.db.write();
        await m.reply(raraWrap("Auto Meme Generator", "Status: OFF. Persistent mode dimatikan."), "automemegenerator");
        return { handled: true };
      } else if (args[0] === "style") {
        const style = args[1] || "auto";
        if (!["top", "bottom", "full", "auto"].includes(style)) {
          await m.reply(raraError("AutoMeme", "Style gak valid nih! Tersedia: top, bottom, full, auto"), "automemegenerator");
          return { handled: true };
        }
        if (!cfg[gid]) cfg[gid] = {};
        cfg[gid].style = style;
        cfg[gid].enabled = cfg[gid].enabled !== false; // keep current or default ON
        db.db.write();
        const styleDesc = { top: "Teks meme di atas foto", bottom: "Teks meme di bawah foto (classic)", full: "Caption panjang lucu", auto: "AI pilih style terbaik" };
        await m.reply(raraWrap("Auto Meme Generator", ["Style: " + style, "Desc: " + styleDesc[style], "Status: " + (cfg[gid].enabled !== false ? "ON" : "OFF")].join("\n")), "automemegenerator");
        return { handled: true };
      } else if (args[0] === "status") {
        const enabled = cfg[gid]?.enabled !== false;
        const style = cfg[gid]?.style || "auto";
        await m.reply(raraWrap("Auto Meme Generator", ["Status: " + (enabled ? "ON" : "OFF"), "Style: " + style, "", "Persistent: " + prefix + "toggleautomeme on/off", "One-shot: " + prefix + "automeme (reply foto)"].join("\n")), "automemegenerator");
        return { handled: true };
      }
    }

    // ════ ONE-SHOT MODE (ALL USERS — always available) ════
    let style = "auto";
    if (["top", "bottom", "full", "auto"].includes(args[0])) {
      style = args[0];
    } else if (args[0]) {
      await m.reply(raraGuide(
        "automeme",
        "Meme generator dari foto via AI Vision\n" +
        prefix + "automeme — auto style (reply foto)\n" +
        prefix + "automeme top — teks di atas\n" +
        prefix + "automeme bottom — classic (bawah)\n" +
        prefix + "automeme full — caption panjang",
        prefix + "automeme top\n" + prefix + "automeme full",
        "Persistent (owner):\n" +
        prefix + "toggleautomeme on/off\n" +
        prefix + "toggleautomeme style <style>\n" +
        prefix + "toggleautomeme status"
      ));
      return { handled: true };
    }

    return await doMemeAnalysis(m, sock, style);
  } catch (e) {
    await m.reply(raraWrap("automemegenerator", e.message || "Ada yang error nih, coba lagi ya", "error"));
  }
  return { handled: true };
}

// === REAL-TIME DETECTION (persistent mode, called from handler.js) ===
// Default: ON when no config exists
export async function handleAutoMemeGen(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoMemeGen) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoMemeGen[gid];
    if (!cfg || !cfg.enabled) return false;

    const msg = m.message || {};
    const imageMsg = msg.imageMessage || (m.quoted?.isImage ? m.quoted.message?.imageMessage : null); // FIX 10 Sep: quoted flags
    if (!imageMsg) return false;

    if (m.fromMe) return false;
    if (m.isCommand) return false;

    const style = cfg.style || "auto";
    const botConfig = (await import("../../config.js")).default;
    const aiConfig = botConfig.aiHelp || {};
    const apiKey = String(aiConfig.apiKey || "");
    const apiEndpoint = String(aiConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions");
    const model = String(aiConfig.model || "gpt-4o-mini");

    if (!apiKey) {
      await sock.sendReaction(m.key.remoteJid, "❌", m.key);
      return true;
    }

    try { await sock.sendReaction(m.key.remoteJid, "🎭", m.key); } catch (e) { console.error('[automemegenerator.js]:', e.message); }

    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download(); // FIX 10 Sep
    if (!buffer || buffer.length < 500) return false;

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;
    const caption = imageMsg.caption || "";

    let systemPrompt = "Kamu adalah meme generator AI yang lucu dan kreatif. Analisis foto dan buat teks meme yang lucu, relevan, dan relate ke konteks foto. ";
    if (style === "top") systemPrompt += "Buat SATU teks singkat (max 5 kata) untuk bagian ATAS meme. ";
    else if (style === "bottom") systemPrompt += "Buat SATU teks singkat (max 7 kata) untuk bagian BAWAH meme. ";
    else if (style === "full") systemPrompt += "Buat caption meme lucu (1-2 kalimat). ";
    else systemPrompt += "Pilih style terbaik: teks atas DAN bawah, atau caption saja. ";
    systemPrompt += "Bahasa Indonesia gaul dan lucu. JANGAN kata kasar/SARA. HANYA teks meme.";

    let userPrompt = "Buat teks meme lucu dari foto ini.";
    if (caption) userPrompt += " Caption: " + caption;

    let memeText = "";
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
          max_tokens: 200,
          temperature: 0.9,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        memeText = data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("[AutoMemeGen] Vision API error:", e.message);
    }

    if (!memeText || memeText.length < 2) {
      try {
        memeText = await callAI({
          providerKey: "ikyy_gemini", model: model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Buat teks meme lucu random." }],
          apiKey: apiKey, apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoMemeGen] Fallback error:", e2.message);
      }
    }

    if (!memeText || memeText.length < 2) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      return true;
    }

    memeText = memeText.replace(/^["']|["']$/g, "").replace(/\n{2,}/g, "\n").trim();

    let memeSent = false;
    try {
      const sharp = (await import("sharp")).default;
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 500;
      const height = metadata.height || 500;
      const fontSize = Math.round(width / 15);
      const textY = style === "top" ? fontSize : style === "bottom" ? height - fontSize * 2 : height / 2;

      const maxChars = Math.floor(width / (fontSize * 0.6));
      let lines = [];
      let currentLine = "";
      for (const word of memeText.split(" ")) {
        if ((currentLine + " " + word).length > maxChars) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) lines.push(currentLine);
      if (lines.length > 3) lines = lines.slice(0, 3);

      const svgText = lines.map((line, i) => {
        const y = textY + (i * fontSize * 1.3);
        return `<text x="50%" y="${y}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="white" stroke="black" stroke-width="${Math.round(fontSize/15)}" font-family="Impact, Arial Black, sans-serif">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`;
      }).join("");

      const svgOverlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100%" height="100%" fill="none" />${svgText}</svg>`);

      const memeBuffer = await sharp(buffer).composite([{ input: svgOverlay, top: 0, left: 0 }]).jpeg({ quality: 85 }).toBuffer();

      let memeCap = raraWrap("Auto Meme", ["Style: " + style, "", memeText.slice(0, 200)].join("\n"));
      try {
        const info = await probeBuffer(memeBuffer);
        const card = mediaResultCard({
          header: "automeme",
          request: [["Gaya", style], ["Teks", String(memeText).slice(0, 80)]],
          size: info.size, mime: info.mime, width: info.width, height: info.height,
        });
        if (card) memeCap = card;
      } catch {}
      await sock.sendMessage(m.key.remoteJid, {
        image: memeBuffer,
        caption: memeCap,
      }, { quoted: m });
      memeSent = true;
    } catch (e) {
      console.error("[AutoMemeGen] Sharp overlay error:", e.message);
    }

    if (!memeSent) {
      await sock.sendMessage(m.key.remoteJid, { text: raraWrap("Auto Meme", ["Style: " + style, "", memeText.slice(0, 300)].join("\n")) }, { quoted: m });
    }

    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch (e) { console.error('[automemegenerator.js]:', e.message); }
    return true;
  } catch (e) {
    console.error("[AutoMemeGen] Handler error:", e.message);
    return false;
  }
}

// Default: ON when no config exists
export function isAutoMemeEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoMemeGen) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoMemeGen[gid];
    if (!cfg) return false;
    return cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
