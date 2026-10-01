// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: 'stopbcpc',
  alias: ["stopbcpc"],
  category: 'owner',
  description: 'Hentikan broadcast private yang sedang berjalan',
  usage: '.stopbcpc',
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
}

async function handler(m, { sock }) {
  if (!global.statusBcpc) {
    { const __navText = raraWrap("stopbcpc", '❌ Tidak ada broadcast private yang sedang berjalan.'); return await m.reply(__navText); }
  }
  global.stopBcpc = true
  return m.reply(raraWrap("Stopbcpc", '⏹️ Menghentikan broadcast private...'))
}

export { pluginConfig as config, handler }
