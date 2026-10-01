// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  novaHeader,  separator, tipText, novaWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "geocode", alias: ["geocode"], category: "tools",
  alias: ["geocode"],
  description: "Alamat ke koordinat GPS", usage: ".geocode <nama tempat>",
  example: ".geocode Monas Jakarta", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const query = m.text?.trim();
    if (!query) {
      await m.reply(novaCaption({
  emoji: "🛠️",
  name: "geocode",
  description: "Alamat ke koordinat GPS",
  usage: `${prefix}geocode <nama tempat>`,
  example: `${prefix}geocode Monas Jakarta`,
}));
      return { handled: true };
    }
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: query, format: "json", limit: 3 }, timeout: 10000,
      headers: { "User-Agent": "NovaBot/1.0" },
    });
    if (!data?.length) {
      await m.reply(novaWrap("Geocode", [`Tempat: *${query}*`].join("\n")));
      return { handled: true };
    }
    let text = novaWrap("Geocode", "📍") + "\n\n";
    data.forEach((r, i) => {
      text += novaWrap(`HAsIL ${i+1}`, [
        `Nama: *${r.display_name.substring(0,60)}*`,
        `Lat: *${r.lat}*`, `Lon: *${r.lon}*`,
        `Peta: https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}`,
      ]) + "\n\n";
    });
    text +=  tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.react("🐣");
    await m.reply(text, "geocode");
  } catch (e) {
    await m.react("❌");
    await m.reply(novaError("Tools", "Gagal nih"));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };