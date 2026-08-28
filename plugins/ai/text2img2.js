// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import { claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "text2img2",
  alias: ["text2img2"],
  category: 'ai',
  description: 'Generate image from text using AI',
  usage: '.text2img2 <prompt>',
  example: '.text2img2 a futuristic city in mars',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
}

async function handler(m, { sock }) {
  if (!m.fullArgs) { const __navText = `Silahkan masukkan prompt.\n💡 *Contoh:* ${m.prefix + m.command} car`; return await m.reply(__navText); }

  await m.react('🕐')

  try {
    const url = `https://api-abztech.zone.id/ai/genimg?text=${encodeURIComponent(m.fullArgs)}`
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.data || response.data.length < 100) {
      throw new Error('Invalid image data received')
    }

    await sock.sendMedia(m.chat, response.data, m.fullArgs, m, { type: 'image' })
    await m.react('✅')
  } catch (e) {
    console.error(e)
    return m.reply(claraWrap("text2img2", te(m.prefix, m.command, m.pushName), "error"))
  }
}

export { pluginConfig as config, handler }