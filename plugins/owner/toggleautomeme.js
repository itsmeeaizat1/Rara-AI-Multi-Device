// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Instant Meme Generator — Real-time foto detection, auto add funny text via AI Vision
// Toggle: .toggleautomeme on/off  (owner only)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { callAI } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "toggleautomeme",
  alias: ["toggleautomeme", "automemetoggle", "autoinstantmeme", "toggleinstantmeme"],
  category: "owner",
  description: "Toggle on/off instant meme generator dari foto (real-time AI Vision)",
  usage: ".toggleautomeme on/off — Toggle\n.toggleautomeme status — Cek status\n.toggleautomeme style <top/bottom/full/auto> — Set style teks meme",
  example: ".toggleautomeme on\n.toggleautomeme style auto",
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
    if (!db.db.data.autoMemeGen) db.db.data.autoMemeGen = {};
    const cfg = db.db.data.autoMemeGen;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = { enabled: true, style: cfg[gid]?.style || "auto" };
      db.db.write();
      const text = claraWrap("Auto Meme Generator", [
        "Status: ON",
        "Style: " + (cfg[gid].style || "auto"),
        "",
        "Bot akan otomatis:",
        "1. Deteksi foto masuk di chat",
        "2. Analisis konteks foto & chat terakhir",
        "3. Generate teks meme lucu sesuai konteks",
        "4. Kirim teks meme sebagai caption balasan",
        "",
        "Style: top (atas), bottom (bawah), full (caption), auto (AI pilih)",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "toggleautomeme off untuk matikan");
      await sendReplyWithNav(sock, m, text, "toggleautomeme");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("Auto Meme Generator", [
        "Status: OFF",
        "Auto meme generator dimatikan di chat ini",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleautomeme");
    } else if (args[0] === "style") {
      const style = args[1] || "auto";
      if (!["top", "bottom", "full", "auto"].includes(style)) {
        const text = claraWrap("Auto Meme Generator", [
          "Style tidak valid!",
          "Tersedia: top, bottom, full, auto",
        ].join("\n"));
        await sendReplyWithNav(sock, m, text, "toggleautomeme");
        return { handled: true };
      }
      if (!cfg[gid]) cfg[gid] = {};
      cfg[gid].style = style;
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const styleDesc = {
        top: "Teks meme di atas foto",
        bottom: "Teks meme di bawah foto (classic)",
        full: "Caption panjang lucu",
        auto: "AI pilih style terbaik",
      };
      const text = claraWrap("Auto Meme Generator", [
        "Style diubah: " + style,
        "Deskripsi: " + styleDesc[style],
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleautomeme");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const style = cfg[gid]?.style || "auto";
      const text = claraWrap("Auto Meme Generator", [
        "Status: " + status,
        "Style: " + style,
        "",
        "Perintah:",
        prefix + "toggleautomeme on/off — Toggle",
        prefix + "toggleautomeme style <top/bottom/full/auto> — Set style",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "toggleautomeme");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

// === REAL-TIME DETECTION FUNCTION ===
export async function handleAutoMemeGen(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoMemeGen) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoMemeGen[gid];
    if (!cfg || !cfg.enabled) return false;

    // Check if message is an image
    const msg = m.message || {};
    const imageMsg = msg.imageMessage || m.quoted?.msg?.imageMessage;
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

    // React processing
    try { await sock.sendReaction(m.key.remoteJid, "🎭", m.key); } catch {}

    // Download image
    const buffer = await sock.downloadMediaMessage(m.quoted || m);
    if (!buffer || buffer.length < 500) return false;

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = "data:image/png;base64," + base64;

    // Get caption from image if any
    const caption = imageMsg.caption || "";

    // Build prompt based on style
    let systemPrompt = "Kamu adalah meme generator AI yang lucu dan kreatif. " +
      "Analisis foto dan buat teks meme yang lucu, relevan, dan relate ke konteks foto. ";

    if (style === "top") {
      systemPrompt += "Buat SATU teks singkat (max 5 kata) untuk bagian ATAS meme. ";
    } else if (style === "bottom") {
      systemPrompt += "Buat SATU teks singkat (max 7 kata) untuk bagian BAWAH meme (classic meme style). ";
    } else if (style === "full") {
      systemPrompt += "Buat caption meme lucu yang lebih panjang (1-2 kalimat). ";
    } else {
      systemPrompt += "Pilih style terbaik: buat teks atas DAN bawah meme, atau caption saja. ";
    }

    systemPrompt += "Gunakan bahasa Indonesia yang gaul dan lucu. ";
    systemPrompt += "JANGAN gunakan kata kasar atau SARA. ";
    systemPrompt += "Berikan HANYA teks meme, tanpa penjelasan tambahan.";

    let userPrompt = "Buat teks meme lucu dari foto ini.";
    if (caption) {
      userPrompt += " Caption foto: " + caption;
    }

    // Call AI Vision
    let memeText = "";
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
      // Fallback: use callAI without vision
      try {
        memeText = await callAI({
          providerKey: "openai",
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Buat teks meme lucu random (karena gambar tidak bisa dibaca)." },
          ],
          apiKey: apiKey,
          apiEndpoint: apiEndpoint,
        });
      } catch (e2) {
        console.error("[AutoMemeGen] Fallback error:", e2.message);
      }
    }

    if (!memeText || memeText.length < 2) {
      await sock.sendReaction(m.key.remoteJid, "⚠️", m.key);
      return true;
    }

    // Clean up meme text
    memeText = memeText.replace(/^["']|["']$/g, "").replace(/\n{2,}/g, "\n").trim();

    // Try to generate meme image with text overlay
    let memeSent = false;
    try {
      // Try using sharp for text overlay on image
      const sharp = (await import("sharp")).default;
      const path = (await import("path")).default;
      const fs = (await import("fs")).default;

      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 500;
      const height = metadata.height || 500;

      // Create SVG text overlay
      const fontSize = Math.round(width / 15);
      const textY = style === "top" ? fontSize : style === "bottom" ? height - fontSize * 2 : height / 2;

      // Wrap text for SVG
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

      const svgOverlay = Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="100%" height="100%" fill="none" />
          ${svgText}
        </svg>
      `);

      const memeBuffer = await sharp(buffer)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .jpeg({ quality: 85 })
        .toBuffer();

      // Send meme image
      await sock.sendMessage(m.key.remoteJid, {
        image: memeBuffer,
        caption: claraWrap("Auto Meme", [
          "Style: " + style,
          "",
          memeText.slice(0, 200),
        ].join("\n")),
      }, { quoted: m });

      memeSent = true;
    } catch (e) {
      console.error("[AutoMemeGen] Sharp overlay error:", e.message);
    }

    // Fallback: send text only
    if (!memeSent) {
      const textReply = claraWrap("Auto Meme", [
        "Style: " + style,
        "",
        memeText.slice(0, 300),
      ].join("\n"));
      await sock.sendMessage(m.key.remoteJid, { text: textReply }, { quoted: m });
    }

    try { await sock.sendReaction(m.key.remoteJid, "✅", m.key); } catch {}
    return true;
  } catch (e) {
    console.error("[AutoMemeGen] Handler error:", e.message);
    return false;
  }
}

export function isAutoMemeEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.autoMemeGen) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.autoMemeGen[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
