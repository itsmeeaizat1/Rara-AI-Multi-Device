// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "text2img",
  alias: ["text2img", "txt2img", "texttoimg"],
  category: "tools",
  description: "Generate gambar dari text (Pollinations AI - gratis)",
  usage: ".text2img <text>",
  example: ".text2img kucing terbang di langit",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

async function handler(m, { sock, args }) {
  const prompt = (args || []).join(" ").trim();

  if (!prompt) {
    let txt = `Text2Img - Pollinations AI\n\n`;
    txt += `> Generate gambar dari text (gratis tanpa API key)\n\n`;
    txt += `\`${m.prefix}text2img <text>\`\n\n`;
    txt += `Contoh:\n`;
    txt += `1. \`${m.prefix}text2img kucing terbang di langit\`\n`;
    txt += `2. \`${m.prefix}text2img pemandangan gunung saat sunset\`\n`;
    txt += `3. \`${m.prefix}text2img robot makan mie\`\n\n`;
    txt += `Opsi:\n`;
    txt += `1. \`${m.prefix}text2img <text> --model flux\`\n`;
    txt += `2. \`${m.prefix}text2img <text> --width 1024 --height 1024\`\n`;
    txt += `3. \`${m.prefix}text2img <text> --nologo\`\n`;
    txt += `4. \`${m.prefix}text2img <text> --enhance\``;
    return await sendReplyWithNav(m, sock, txt, { commandName: "text2img" });
  }

  await m.react("🕐");

  try {
    // Parse options from prompt
    let model = "flux";
    let width = 1024;
    let height = 1024;
    let nologo = false;
    let enhance = false;
    let cleanPrompt = prompt;

    // Extract --model
    const modelMatch = cleanPrompt.match(/--model\s+(\S+)/);
    if (modelMatch) {
      model = modelMatch[1];
      cleanPrompt = cleanPrompt.replace(/--model\s+\S+/, "").trim();
    }

    // Extract --width
    const widthMatch = cleanPrompt.match(/--width\s+(\d+)/);
    if (widthMatch) {
      width = Math.min(parseInt(widthMatch[1]), 2048);
      cleanPrompt = cleanPrompt.replace(/--width\s+\d+/, "").trim();
    }

    // Extract --height
    const heightMatch = cleanPrompt.match(/--height\s+(\d+)/);
    if (heightMatch) {
      height = Math.min(parseInt(heightMatch[1]), 2048);
      cleanPrompt = cleanPrompt.replace(/--height\s+\d+/, "").trim();
    }

    // Extract --nologo
    if (cleanPrompt.includes("--nologo")) {
      nologo = true;
      cleanPrompt = cleanPrompt.replace("--nologo", "").trim();
    }

    // Extract --enhance
    if (cleanPrompt.includes("--enhance")) {
      enhance = true;
      cleanPrompt = cleanPrompt.replace("--enhance", "").trim();
    }

    // Build URL
    const encoded = encodeURIComponent(cleanPrompt);
    let url = `${POLLINATIONS_URL}/${encoded}?width=${width}&height=${height}&model=${model}&seed=${Math.floor(Math.random() * 1000000)}`;
    if (nologo) url += "&nologo=true";
    if (enhance) url += "&enhance=true";

    // Download image
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      throw new Error(`Pollinations error: HTTP ${res.status}`);
    }

    const resultBuffer = Buffer.from(res.data);

    await m.react("✅");

    let caption = `Text2Img - Pollinations AI\n`;
    caption += `> Prompt: ${cleanPrompt}\n`;
    caption += `> Model: ${model}\n`;
    caption += `> Size: ${width}x${height}`;

    await sock.sendMessage(
      m.chat,
      { image: resultBuffer, caption },
      { quoted: m },
    );
  } catch (e) {
    console.error("[TEXT2IMG] Error:", e.message);
    let txt = `Gagal generate gambar!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("text2img", txt));
  }
}

export { pluginConfig as config, handler };
