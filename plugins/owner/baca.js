import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
const pluginConfig = {
  name: ["baca", "read", "markread"],
  alias: ["baca", "read", "markread"],
  category: "owner",
  description: "Tandai pesan sebagai sudah dibaca",
  usage: ".baca",
  example: ".baca",
  isOwner: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await sock.readMessages([m.key]);
    return m.reply(raraWrap("Baca", "📖 *Pesan ditandai sudah dibaca*"));
  } catch (err) {
    return m.reply(raraWrap("baca", `❌ Gagal: ${err.message}`));
  }
}

export { pluginConfig as config, handler };
