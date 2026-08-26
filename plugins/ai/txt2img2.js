// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { Txt2Img2 } from "../../src/scraper/txt2img2.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "txt2img2",
  alias: ["txt2img2"],
  category: "ai",
  description: "Buat gambar dari teks pakai Flux Klein 4B",
  usage: ".txt2img2 <deskripsi gambar>",
  example: ".txt2img2 Mobil Lamborghini revuelto",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(`🎨 *Text to Image (Flux)*\n\n` +
      `Buat gambar dari deskripsi teks pakai AI Flux Klein 4B.\n\n` +
      `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
      `*${m.prefix}txt2img2 <deskripsi>*\n\n` +
      `*ᴄᴏɴᴛᴏʜ:*\n` +
      `*${m.prefix}txt2img2 Mobil Lamborghini revuelto*\n` +
      `*${m.prefix}txt2img2 Kucing lucu pakai topi*\n\n` +
      `_Proses generate agak lama, sekitar 30-60 detik_`, "text2img4");
  }

  m.react("🕒");

  try {
    const result = await Txt2Img2(text);

    if (!result.status) {
      { const __navText = `❌ *ɢᴇɴᴇʀᴀᴛᴇ ɢᴀɢᴀʟ*\n\n${result.error}`; return await m.reply(__navText); };
    }

    await sock.sendMedia(m.chat, result.url, `🎨 *Flux Klein 4B*\n\nPrompt: *${result.prompt}*`, m, {
      type: "image",
    });

    m.react("🐣");
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("txt2img2", "❌ Gagal generate gambar, coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
