// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "pricetrack", alias: ["pricetrack"], category: "utility",
  alias: ["pricetrack"],
  description: "Cek harga produk online", usage: ".pricetrack <url produk>",
  example: ".pricetrack https://shopee.co.id/...", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 15, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const url = m.text?.trim();
    if (!url || !url.startsWith("http")) {
      await m.reply( raraCaption({
  emoji: "🔧",
  name: "pricetrack",
  description: "Cek harga produk online",
  usage: `${prefix}pricetrack <url produk>`,
  example: `${prefix}pricetrack https://shopee.co.id/...`,
}), "pricetrack");
      return { handled: true };
    }
    const { data: html } = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
    const title = (html.match(/<title>([^<]+)<\/title>/i) || [,""])[1].trim();
    const price = (html.match(/(?:price|harga)["'\s:>]+([\d.,]+)/i) || [,"-"])[1];
    await m.reply(raraWrap("Price Track", [`Produk: *${title.substring(0,80)}*`,
      `Harga: *${price}*`,
      `URL: ${url.substring(0,60)}...`].join("\n")) + "\n" + tipText("Harga bisa berubah sewaktu-waktu"));
  } catch (e) {
    await m.reply(raraWrap("Gagal nih", [`${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };