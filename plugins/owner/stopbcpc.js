// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
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
    { const __navText = novaWrap("stopbcpc", '❌ Tidak ada broadcast private yang sedang berjalan.'); return await m.reply(__navText); }
  }
  global.stopBcpc = true
  return m.reply(novaWrap("Stopbcpc", '⏹️ Menghentikan broadcast private...'))
}

export { pluginConfig as config, handler }
