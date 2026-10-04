// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getParticipantJids } from '../../src/lib/rara-lid.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
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
    name: ['ht', 'hidetag'],
    alias: ["ht", "hidetag"],
    category: 'group',
    description: 'Hidetag dengan support reply pesan (teks/media)',
    usage: '.ht [pesan] atau reply pesan',
    example: '.ht atau reply pesan lalu .ht',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: false
}

async function handler(m, { sock }) {
    try {
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        const mentions = getParticipantJids(participants)

        const quoted = m.quoted
        const text = m.fullArgs?.trim()

        // ===== REPLY MODE =====
        if (quoted) {
            const qMsg = quoted.message || {}
            const type = Object.keys(qMsg)[0]

            // ===== IMAGE =====
            if (type === 'imageMessage') {
                const media = await quoted.download()
                const caption = qMsg.imageMessage?.caption || text || ''

                const card = await dlCard("gambar", { buffer: media }, [["Engine", "Hidetag Media"], ["Tipe", "Gambar"]])
                return sock.sendMessage(m.chat, {
                    image: media,
                    caption: card ? `${caption}\n\n${card}` : caption,
                    mentions
                })
            }

            // ===== VIDEO =====
            if (type === 'videoMessage') {
                const media = await quoted.download()
                const caption = qMsg.videoMessage?.caption || text || ''

                const card = await dlCard("video", { buffer: media }, [["Engine", "Hidetag Media"], ["Tipe", "Video"]])
                return sock.sendMessage(m.chat, {
                    video: media,
                    caption: card ? `${caption}\n\n${card}` : caption,
                    mentions
                })
            }

            // ===== STICKER =====
            if (type === 'stickerMessage') {
                const media = await quoted.download()

                await sock.sendMessage(m.chat, {
                    sticker: media,
                    mentions
                })

                {
                    const card = await dlCard("stiker", { buffer: media, mime: "image/webp" }, [["Engine", "Hidetag Media"], ["Tipe", "Stiker"]])
                    if (card) await sock.sendMessage(m.chat, { text: card, mentions })
                }

                if (text) {
                    await sock.sendMessage(m.chat, {
                        text,
                        mentions
                    })
                }
                return
            }

            // ===== AUDIO =====
            if (type === 'audioMessage') {
                const media = await quoted.download()
                const audioMsg = qMsg.audioMessage || {}

                await sock.sendMessage(m.chat, {
                    audio: media,
                    mimetype: audioMsg.mimetype,
                    ptt: audioMsg.ptt || false,
                    mentions
                })

                {
                    const card = await dlCard("audio", { buffer: media, mime: audioMsg.mimetype }, [["Engine", "Hidetag Media"], ["Tipe", "Audio"]])
                    if (card) await sock.sendMessage(m.chat, { text: card, mentions })
                }

                if (text) {
                    await sock.sendMessage(m.chat, {
                        text,
                        mentions
                    })
                }
                return
            }

            // ===== DOCUMENT =====
            if (type === 'documentMessage') {
                const media = await quoted.download()
                const docMsg = qMsg.documentMessage || {}

                await sock.sendMessage(m.chat, {
                    document: media,
                    mimetype: docMsg.mimetype,
                    fileName: docMsg.fileName || 'file',
                    mentions
                })

                {
                    const card = await dlCard("dokumen", { buffer: media, mime: docMsg.mimetype }, [["Engine", "Hidetag Media"], ["Tipe", "Dokumen"], ["Nama File", String(docMsg.fileName || 'file').slice(0, 50)]])
                    if (card) await sock.sendMessage(m.chat, { text: card, mentions })
                }

                if (text) {
                    await sock.sendMessage(m.chat, {
                        text,
                        mentions
                    })
                }
                return
            }

            // ===== TEXT / OTHER =====
            const quotedText =
                quoted.text ||
                qMsg.conversation ||
                qMsg.extendedTextMessage?.text ||
                ''

            const finalText = text || quotedText

            if (!finalText) {
                return m.reply(raraWrap("Ht", '❌ *pesan kosong*'))
            }

            return sock.sendMessage(m.chat, {
                text: finalText,
                mentions
            })
        }
        if (!text) {
            return m.reply( `📢 *hidetag*\n\n` +
                `Reply pesan lalu ketik \`${m.prefix}ht\`\n` +
                `Atau ketik \`${m.prefix}ht <pesan>\`\n\n` +
                `Support: teks, gambar, video, sticker, audio, dokumen`, "ht")
        }

        await sock.sendMessage(m.chat, {
            text,
            mentions
        }, { quoted: m    })

    } catch (err) {
        m.reply(raraWrap("ht", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }