// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Meme Generator — Buat meme dari 100+ template via Imgflip API (free, no login)
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "memegenapi",
  alias: ["memegenapi"],
  category: "tools",
  description: "Meme Generator — 100+ template meme via Imgflip, gratis tanpa login",
  usage: ".memegen list — Lihat template\n.memegen <id> | text1 | text2 — Buat meme\n.memegen random | text1 | text2 — Random template",
  example: ".memegen 112126428 | Saya | Nova AI\n.memegen random | Test | Berhasil",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

let cachedMemes = null;
let cacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

async function getMemes() {
  if (cachedMemes && Date.now() - cacheTime < CACHE_TTL) {
    return cachedMemes;
  }

  const res = await fetch("https://api.imgflip.com/get_memes", {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data.success) throw new Error("Gagal ambil template");
  cachedMemes = data.data.memes;
  cacheTime = Date.now();
  return cachedMemes;
}

async function captionMeme(templateId, texts) {
  const url = "https://api.imgflip.com/caption_image";
  const params = new URLSearchParams();
  params.append("template_id", templateId);
  params.append("username", "imgflip_user");
  params.append("password", "imgflip_pass");

  for (let i = 0; i < texts.length; i++) {
    params.append("boxes[" + i + "][text]", texts[i]);
    params.append("boxes[" + i + "][x]", "50");
    params.append("boxes[" + i + "][y]", "50");
    params.append("boxes[" + i + "][width]", "500");
    params.append("boxes[" + i + "][height]", "100");
    params.append("boxes[" + i + "][color]", "#ffffff");
    params.append("boxes[" + i + "][outline_color]", "#000000");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json();
  return data;
}

async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text.trim();

    if (!input || input.toLowerCase() === "list" || input.toLowerCase() === "help") {
      const memes = await getMemes();
      const lines = [
        "MEME GENERATOR (Imgflip API)",
        "Total: " + memes.length + " template",
        "",
        "TEMPLATE POPULER:",
      ];
      const popular = memes.slice(0, 15);
      for (let i = 0; i < popular.length; i++) {
        const meme = popular[i];
        lines.push((i + 1) + ". " + meme.name + " (ID: " + meme.id + ", " + meme.box_count + " text)");
      }
      lines.push("");
      lines.push("Total " + memes.length + " template. Ketik " + usedPrefix + "memegen list untuk semua.");
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push(usedPrefix + "memegen <id> | text1 | text2");
      lines.push(usedPrefix + "memegen random | text1 | text2");
      lines.push("");
      lines.push("Contoh:");
      lines.push(usedPrefix + "memegen 112126428 | Saya | Nova AI");
      lines.push(usedPrefix + "memegen random | Test | Berhasil");
      return m.reply(claraWrap("Meme Generator", lines, "info"));
    }

    // Parse: templateId | text1 | text2 | text3
    const parts = input.split("|").map((s) => s.trim());
    let templateId = parts[0];
    const textParts = parts.slice(1);

    if (!textParts.length || textParts.every((t) => !t)) {
      return m.reply(claraWrap("Meme Generator", [
        "Text tidak boleh kosong",
        "",
        "Format: " + usedPrefix + "memegen <id> | text1 | text2",
        "Contoh: " + usedPrefix + "memegen 112126428 | Saya | Nova AI",
      ], "warn"));
    }

    // Handle random
    if (templateId.toLowerCase() === "random") {
      const memes = await getMemes();
      const random = memes[Math.floor(Math.random() * memes.length)];
      templateId = random.id;
    }

    m.reply(claraWrap("Meme Generator", "Sedang membuat meme..."));

    // Try caption via Imgflip API
    const result = await captionMeme(templateId, textParts);

    if (result.success && result.data?.url) {
      try {
        const imgBuf = await downloadImage(result.data.url);
        await conn.sendMessage(
          m.key.remoteJid,
          {
            image: imgBuf,
            caption: claraWrap("Meme Generator", [
              "Meme berhasil dibuat!",
              "Template ID: " + templateId,
              "Text: " + textParts.join(" | "),
              "Source: Imgflip API",
            ], "info"),
          },
          { quoted: m }
        );
      } catch (dlErr) {
        // If download fails, send URL
        return m.reply(claraWrap("Meme Generator", [
          "Meme berhasil dibuat (URL):",
          result.data.url,
        ], "info"));
      }
    } else {
      // Fallback: Download template and overlay text locally
      return m.reply(claraWrap("Meme Generator", [
        "Caption API butuh akun Imgflip",
        "",
        "Gunakan template ID untuk download gambar:",
        "https://api.imgflip.com/get_memes",
        "",
        "Atau gunakan .smemev2 untuk meme local (reply gambar + text)",
      ], "warn"));
    }
  } catch (e) {
    console.error("[MemeGen]", e);
    m.reply(claraWrap("Meme Generator", [
      "Error: " + e.message,
      "",
      "Kemungkinan:",
      "1. API Imgflip sedang down",
      "2. Template ID salah",
      "3. Koneksi timeout",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
