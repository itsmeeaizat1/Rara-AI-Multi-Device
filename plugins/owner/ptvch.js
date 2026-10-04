// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import {  raraWrap, raraLine, raraCaption } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch owner) — helper ringkas, best-effort tak pernah ganggu kirim
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
    name: 'ptvch',
    alias: ["ptvch"],
    category: 'owner',
    description: 'Kirim video sebagai PTV ke channel',
    usage: '.ptvch (reply video)',
    example: '.ptvch',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let video = null
    
    if (m.quoted && m.quoted.isVideo) {
        try {
            video = await m.quoted.download()
        } catch (e) {
            return m.reply(raraCaption({
  emoji: "📺",
  name: "ptvch",
  description: "Kirim video sebagai PTV ke channel",
  usage: `${m.prefix}ptvch (reply video)`,
  example: `${m.prefix}ptvch`,
}), "ptvch");
        }
    }
    
    // FIX 19 Sep 2026: placeholder "@newsletter" pernah lolos jadi JID → resolve dulu
    const { resolveNewsletterJid } = await import("../../src/lib/rara-saluran.js")
    const channelId = await resolveNewsletterJid(sock).catch(() => '120363404849776664@newsletter')
    
    await m.reply(raraWrap("Ptvch", `🕕 *Mengirim Ptv Ke Channel...*`))
    
    try {
        await sock.sendMessage(channelId, {
            video: video,
            mimetype: 'video/mp4',
            gifPlayback: true,
            ptv: true
        })
        {
            const card = await dlCard("video", { buffer: video }, [["Engine", "PTV Channel"], ["Saluran", String(channelId || "-").slice(0, 40)], ["Tipe", "PTV (video bulat)"]]);
            if (card) await m.reply(card);
        }
        { const __navText = `✅ *sUkses*\n\nVideo berhasil dikirim ke channel sebagai PTV.`; return await m.reply(__navText); }
        
    } catch (err) {
        return m.reply(raraWrap("ptvch", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
