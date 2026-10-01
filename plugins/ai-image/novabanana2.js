// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { fluxImage } from "../../src/scraper/seaart.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine, novaGuideV2 } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "novabanana2",
  alias: ["novabanana2"],
  category: 'ai image',
  description: "Buat gambar dengan AI menggunakan prompt",
  usage: ".novabanana2 <prompt>",
  example: ".novabanana2 make it anime style",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prompt = m.text;
  if (!prompt) {
    return m.reply(novaGuideV2("novabanana2", {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "bikin gambar apa aja pakai AI Banana2, deskripsikan aja! (≧▽≦)",
      cara: "ketik deskripsi gambar yang mau dibuat",
      contoh: `${m.prefix}novabanana2 make a cat`,
      spec: ["⚡ energi 1", "⏱ 30dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const result = await fluxImage(prompt, "1:1");
    const imageUrl = result.url;
    await sock.sendMedia(m.chat, imageUrl, null, m, {
      type: "image",
    });
  } catch (error) {
    console.log(error);
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Terjadi kesalahan";
    await m.react("🐣");
    m.reply(novaWrap("Novabanana2", `🍀 *Waduhh, sepertinya ini ada kendala*

${msg}

Silahkan coba lagi nanti, dimohon jangan spam`));
  }
}

export { pluginConfig as config, handler };
