// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
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
    name: "getpp",
    alias: ["getpp"],
    category: 'group',
    description: 'Ambil foto profil target (mention/reply)',
    usage: '.getpp @user',
    example: '.getpp @628xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let target = m.sender
    
    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid?.length) {
        target = m.mentionedJid[0]
    } else if (m.args[0]) {
        let num = m.args[0].replace(/[^0-9]/g, '')
        if (num.startsWith('0')) num = '62' + num.slice(1)
        target = num + '@s.whatsapp.net'
    }
    
    const targetNum = target.split('@')[0]
    
    let ppUrl
    try {
        ppUrl = await sock.profilePictureUrl(target, 'image')
    } catch {
        ppUrl = 'https://files.catbox.moe/ejy4ky.jpg'
    }

    const card = await dlCard("gambar", { url: ppUrl }, [["Engine", "WhatsApp CDN"], ["Target", `@${targetNum}`], ["Tipe", "Foto Profil"]]);
    await sock.sendMedia(m.chat, ppUrl, card ? `Foto profil milik @${targetNum}\n\n${card}` : `Foto profil milik @${targetNum}`, m, {
        type: 'image',
        mentions: [target]
    })
}

export { pluginConfig as config, handler }