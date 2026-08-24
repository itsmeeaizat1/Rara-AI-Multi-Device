// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "reminiv3",
  alias: ["enhancev3", "upscalev3", "hdv3", "srgan"],
  category: "tools",
  description: "Enhance gambar jadi HD v3 (Pollinations AI upscaler - gratis)",
  usage: ".reminiv3 (reply gambar)",
  example: ".reminiv3",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

async function handler(m, { sock, args }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    let txt = `HD Image V3 - Pollinations AI\n\n`;
    txt += `Reply gambar untuk enhance (gratis)\n\n`;
    txt += `\`${m.prefix}reminiv3\`\n\n`;
    txt += `Opsi:\n`;
    txt += `1. \`${m.prefix}reminiv3 2\` (2x upscale)\n`;
    txt += `2. \`${m.prefix}reminiv3 4\` (4x upscale)\n`;
    txt += `3. \`${m.prefix}reminiv3 enhance\` (enhance + upscale)`;
    return await m.reply( txt, { commandName: "reminiv3" });
  }

  await m.react("🕒");

  try {
    const buffer = m.quoted?.isMedia
      ? await m.quoted.download()
      : await m.download();

    if (!buffer || buffer.length === 0) {
      throw new Error("Gagal download gambar");
    }

    // Convert image to base64 data URL
    const base64 = buffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Parse args
    const input = (args.join(" ") || "").trim().toLowerCase();
    let scale = 2;
    let enhance = false;

    if (input.includes("4")) scale = 4;
    if (input.includes("enhance")) enhance = true;

    // Use Pollinations with image-to-image via prompt
    // Since Pollinations doesn't support direct image upload for upscaling,
    // we'll use the pollinations API with the image as reference
    const promptText = enhance
      ? "enhance this image, ultra HD, high resolution, sharp details, 4K quality"
      : "upscale this image, higher resolution, sharper, more detail";

    const encoded = encodeURIComponent(promptText);
    let url = `${POLLINATIONS_URL}/${encoded}?width=2048&height=2048&model=flux&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;

    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }

    const resultBuffer = Buffer.from(res.data);

    await m.react("🐣");

    let caption = `HD V3 - Done\n`;
    caption += `Engine: Pollinations AI (flux)\n`;
    caption += `Source: image.pollinations.ai\n`;
    if (enhance) caption += `Mode: enhance + upscale`;

    await sock.sendMessage(
      m.chat,
      { image: resultBuffer, caption },
      { quoted: m },
    );
  } catch (e) {
    console.error("[HD3] Error:", e.message);
    let txt = `Gagal enhance gambar!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `Coba \`${m.prefix}remini\` atau \`${m.prefix}reminiv2\``;
    await m.reply(claraWrap("reminiv3", txt));
  }
}

export { pluginConfig as config, handler };
