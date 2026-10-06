// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

import axios from 'axios'
import te from '../../src/lib/rara-error.js'
import config from '../../config.js'
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch stalker) — helper ringkas, best-effort tak pernah ganggu kirim
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
    name: 'igstalk',
    alias: ["igstalk"],
    category: 'stalker',
    description: 'Stalk akun Instagram',
    usage: '.igstalk <username>',
    example: '.igstalk cristiano',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function shortNum(num) {
    if (!num) return '0'
    num = parseInt(num)
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + ' miliar'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + ' jt'
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + ' rb'
    return num.toString()
}

async function handler(m, { sock }) {
    const username = m.args[0]?.replace('@', '')
    
    if (!username) {
        return m.reply(
            raraWrap("igstalk", `📸 *instagram stalk*\n\n` +
            `Masukkan username Instagram\n\n` +
            `\`Contoh: ${m.prefix}igstalk cristiano\``, "guide")
        )
    }
    try {
        const res = await axios.get(
            `https://firefly.maiku.my.id/api/stalk-instagram?apikey=${config.APIkey.firefly}&username=${encodeURIComponent(username)}`,
            { timeout: 30000 }
        )
        
        const d = res.data?.data
        if (!res.data?.status || !d?.username) {
            return m.reply(raraWrap("igstalk", `❌ Akun *@${username}* tidak ditemukan`))
        }
        
        const caption = `📸 *instagram stalk*\n\n` +
            `👤 *username:* ${d.username}\n` +
            `📛 *nama:* ${d.full_name || '-'}\n` +
            `✅ *verified:* ${d.is_verified ? 'Ya' : 'Tidak'}\n` +
            `🔒 *private:* ${d.is_private ? 'Ya' : 'Tidak'}\n\n` +
            `👥 *pengikut:* ${shortNum(d.stats?.followers)}\n` +
            `👤 *mengikuti:* ${shortNum(d.stats?.following)}\n` +
            `📷 *postingan:* ${shortNum(d.stats?.posts)}\n\n` +
            `📝 *bio:*\n${d.bio || '-'}\n\n` +
            `🔗 https://instagram.com/${d.username}`
        const profilePic = d.profile_pic
        if (profilePic) {
            const card = await dlCard("gambar", { url: profilePic }, [["Engine", "API firefly.maiku"], ["Target", "@" + (d.username || username)], ["Judul", String(d.full_name || d.username || "-").slice(0, 40)], ["Followers", String(d.stats?.followers ?? "-")], ["Mengikuti", String(d.stats?.following ?? "-")], ["Postingan", String(d.stats?.posts ?? "-")], ["Verified", d.is_verified ? "Ya" : "Tidak"]]);
            await sock.sendMessage(m.chat, {
                image: { url: profilePic },
                caption: card ? `${caption}\n\n${card}` : caption
            }, { quoted: m })
        } else {
            await m.reply(caption)
        }
        
    } catch (error) {
        m.reply(raraWrap("igstalk", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }