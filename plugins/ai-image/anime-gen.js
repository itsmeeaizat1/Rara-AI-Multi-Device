// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { f } from '../../src/lib/rara-http.js'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraLine, raraCaption } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}
const pluginConfig = {
    name: 'anime-gen',
    alias: ["anime-gen", "anime"],
    category: 'ai image',
    description: 'Generate AI anime art dari prompt',
    usage: '.anime-gen <prompt>',
    example: '.anime-gen girl, vibrant color, smilling',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const prompt = m.text
    
    if (!prompt) {
        return m.reply(raraCaption({
  emoji: "🎨",
  name: "anime-gen",
  description: "Generate AI anime art dari prompt",
  usage: `${m.prefix}anime-gen <prompt>`,
  example: `${m.prefix}anime-gen girl, vibrant color, smilling`,
}), "anime-gen");
    }
    try {
    await m.react("🕒");
        const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-RaraMD'
        const apiUrl = `https://api.neoxr.eu/api/ai-anime?q=${encodeURIComponent(prompt)}&apikey=${NEOXR_APIKEY}`
        
        const data = await f(apiUrl)
        
        if (!data?.status || !data?.data?.url) {
            return m.reply('Gagal generate gambar nih, coba lagi ya!')
        }
        
        const result = data.data;
        const c = await dlCard("gambar", { url: result.url }, [["Prompt", String(prompt).slice(0, 40)], ["Engine", "Neoxr AI"]]);
        await sock.sendMedia(m.chat, result.url, c || undefined, m, {
            type: 'image'
        });
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            await m.react("🐣");
            m.reply(raraWrap("Anime-gen", '⏱️ *Timeout*\n\nRequest terlalu lama. Coba lagi!'))
        } else {
            m.reply(raraWrap("anime-gen", te(m.prefix, m.command, m.pushName), "error"))
        }
    }
}

export { pluginConfig as config, handler };

