// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { fluxImage } from "../../src/scraper/seaart.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

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
    return m.reply(claraWrap("novabanana2", [
      "Buat gambar dengan AI",
      "",
      `💡 Contoh: ${m.prefix}novabanana2 make a cat`,
    ]));
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
    m.reply(claraWrap("Novabanana2", `🍀 *Waduhh, sepertinya ini ada kendala*

${msg}

Silahkan coba lagi nanti, dimohon jangan spam`));
  }
}

export { pluginConfig as config, handler };
