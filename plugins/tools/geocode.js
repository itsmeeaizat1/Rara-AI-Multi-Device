// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "geocode", alias: ["koordinat", "lokasi"], category: "tools",
  description: "Alamat ke koordinat GPS", usage: ".geocode <nama tempat>",
  example: ".geocode Monas Jakarta", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const query = m.text?.trim();
    if (!query) {
      await m.reply(claraWrap("Geocode", [`│ ❏ Penggunaan: *${prefix}geocode <nama tempat>*`,
        `│ ❏ Contoh: *${prefix}geocode Monas Jakarta*`].join("\n")));
      return { handled: true };
    }
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: query, format: "json", limit: 3 }, timeout: 10000,
      headers: { "User-Agent": "NovaBot/1.0" },
    });
    if (!data?.length) {
      await m.reply(claraWrap("Geocode", [`│ ❏ Tempat: *${query}*`].join("\n")));
      return { handled: true };
    }
    let text = claraWrap("Geocode", "📍") + "\n\n";
    data.forEach((r, i) => {
      text += claraWrap(`HAsIL ${i+1}`, [
        `│ ❏ Nama: *${r.display_name.substring(0,60)}*`,
        `│ ❏ Lat: *${r.lat}*`, `│ ❏ Lon: *${r.lon}*`,
        `│ ❏ Peta: https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}`,
      ]) + "\n\n";
    });
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`);
    await m.reply(claraWrap("geocode", text));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`│ ❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };