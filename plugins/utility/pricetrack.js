// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "pricetrack", alias: ["trackprice", "hargatracker"], category: "utility",
  description: "Cek harga produk online", usage: ".pricetrack <url produk>",
  example: ".pricetrack https://shopee.co.id/...", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 15, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const url = m.text?.trim();
    if (!url || !url.startsWith("http")) {
      await sendReplyWithNav(sock, m, claraWrap("Price Track", [`  ┊  ➶ Penggunaan: *${prefix}pricetrack <url>*`,
        `  ┊  ➶ Support: Shopee, Tokopedia, Bukalapak`,
        "  ┊  ➶ Cek harga & info produk"].join("\n")), "pricetrack");
      return { handled: true };
    }
    const { data: html } = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
    const title = (html.match(/<title>([^<]+)<\/title>/i) || [,""])[1].trim();
    const price = (html.match(/(?:price|harga)["'\s:>]+([\d.,]+)/i) || [,"-"])[1];
    await m.reply(claraWrap("Price Track", [`  ┊  ➶ Produk: *${title.substring(0,80)}*`,
      `  ┊  ➶ Harga: *${price}*`,
      `  ┊  ➶ URL: ${url.substring(0,60)}...`].join("\n")) + "\n" + tipText("Harga bisa berubah sewaktu-waktu"));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`  ┊  ➶ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };