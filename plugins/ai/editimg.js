// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// editimg — Edit gambar dengan AI (text-to-image editing)
import { Img2Img } from "../../src/scraper/img2img.js";
import { live3d } from "../../src/scraper/seaart.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "editimg",
  alias: ["editimg", "aiedit", "ai-edit", "editgambar", "imgedit"],
  category: 'ai image',
  description: "Edit gambar dengan AI — kirim foto + instruksi teks",
  usage: ".editimg <instruksi edit> (reply/kirim foto)",
  example: ".editimg ubah background jadi pantai (reply foto)\n.editimg tambahkan kacamata (reply foto)\n.editimg ubah rambut jadi merah (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";

    // Cek gambar
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage"));
    if (!isImage) {
      return m.reply(
        "" +
        `🎨 Edit gambar dengan AI\n` +
        `
` +
        `📌 Cara pakai:\n` +
        `Kirim/reply foto + caption instruksi\n` +
        `
` +
        `💡 Contoh:\n` +
        `${prefix}editimg ubah background jadi pantai\n` +
        `${prefix}editimg tambahkan kacamata hitam\n` +
        `${prefix}editimg ubah jadi gaya anime\n` +
        `${prefix}editimg hapus orang di belakang\n` +
        ""
      );
    }

    // Get prompt
    const prompt = m.text?.trim() || m.args?.join(" ").trim();
    if (!prompt) {
      await m.react("❌");
      return m.reply(claraWrap("editimg", `Kasih instruksi editnya!\n\nContoh: ${prefix}editimg ubah background jadi pantai (reply foto)`, "guide"));
    }

    await m.react("🕒");

    // Download gambar
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      await m.react("❌");
      return m.reply(claraWrap("editimg", "Gagal download gambar. Coba kirim ulang.", "error"));
    }

    // Rantai edit gambar — nano-banana DULUAN (live verified 8 Sep 2026),
    // FGSI img2img cadangan (key fgsi lagi banned → cepat fail-through)
    let result = null;
    let usedApi = "";

    // Method 1: live3d (nano-banana) — paling bagus & hidup
    try {
      const res = await live3d(buffer, prompt);
      if (res.image) {
        result = res.image;
        usedApi = "nano-banana";
      }
    } catch (e) {
      console.error("editimg live3d:", e.message);
    }

    // Method 2: Img2Img (FGSI API) — cadangan
    if (!result) {
      try {
        const res = await Img2Img(prompt, buffer, "edit.png");
        if (res.status && res.result) {
          // result bisa URL atau base64
          result = res.result;
          usedApi = "img2img";
        }
      } catch (e) {
        console.error("editimg img2img:", e.message);
      }
    }

    if (!result) {
      await m.react("❌");
      return m.reply(claraWrap("editimg", "Semua API edit gambar lagi down. Coba lagi nanti.", "error"));
    }

    await m.react("🐣");

    // Kirim hasil
    let caption = "";
    caption += `🎨 Instruksi: *${prompt}*\n`;
    caption += `⚙️ Engine: *${usedApi}*\n`;
    
    // Jika result adalah Buffer, kirim langsung
    if (Buffer.isBuffer(result)) {
      await sock.sendMedia(m.chat, result, null, m, { type: "image", caption });
    } else {
      // Jika URL, download dulu
      try {
        const axios = (await import("axios")).default;
        const imgRes = await axios.get(result, { responseType: "arraybuffer", timeout: 30000 });
        const imgBuf = Buffer.from(imgRes.data);
        await sock.sendMedia(m.chat, imgBuf, null, m, { type: "image", caption });
      } catch {
        // Kalau gagal download, kirim URL
        await m.reply(caption + "\n\n" + result);
      }
    }
  } catch (err) {
    console.error("editimg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("editimg", err.message || te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
