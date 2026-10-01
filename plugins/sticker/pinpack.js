// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Scrape Pinterest langsung (tanpa API pihak ketiga)
import { raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

import _sharp from 'sharp'
import axios from "axios"
import config from "../../config.js"
import te from "../../src/lib/rara-error.js"
import { addExifToWebp } from "../../src/lib/rara-exif.js"
import { raraError, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js"

function getSharp() { return _sharp }

const MAX_STICKERS = 20
const DOWNLOAD_DELAY = 700

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    return Buffer.from(res.data)
}

async function toWebpSticker(buffer) {
    return (await getSharp())(buffer)
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer()
}

// Scrape Pinterest via internal API endpoint
async function scrapePinterest(query, count = 20) {
    const url = `https://www.pinterest.com/resource/BaseSearchResource/search/?data=${encodeURIComponent(JSON.stringify({
        query,
        scope: "pins",
        page_size: count,
    }))}`
    const res = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        },
        timeout: 15000,
    })
    const results = []
    const pins = res.data?.resource_response?.data?.results || []
    for (const pin of pins) {
        const imgUrl = pin?.images?.orig?.url || pin?.images?.["736x"]?.url || pin?.images?.["474x"]?.url
        if (imgUrl) results.push({ image_url: imgUrl })
    }
    return results
}

const pluginConfig = {
    name: "pinpack",
    alias: ["pinpack"],
    category: "sticker",
    description: "Cari gambar Pinterest lalu jadikan sticker pack (scrape langsung)",
    usage: ".pinpack <query>",
    example: ".pinpack cat",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 20,
    energi: 3,
    isEnabled: true,
}

async function handler(m, { sock }) {
    const query = m.args?.join(" ")?.trim()

    if (!query) {
        return m.reply(raraCaption({
            emoji: "📌",
            name: "pinpack",
            description: "Cari gambar Pinterest lalu jadikan sticker pack",
            usage: `${m.prefix}pinpack <query>`,
            example: `${m.prefix}pinpack cat`,
        }), "pinpack")
    }

    try {
        const results = await scrapePinterest(query, MAX_STICKERS)

        if (!results || results.length === 0) {
            return m.reply(raraError("PinPack", `Gak nemu hasil untuk: ${query} nih`))
        }

        await m.react("🕒");

        const stickerBuffers = []

        for (const item of results) {
            if (!item.image_url) continue
            try {
                const buf = await downloadBuffer(item.image_url)
                const webp = await toWebpSticker(buf)
                stickerBuffers.push(webp)
                await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY))
            } catch { continue }
        }

        if (!stickerBuffers.length) {
            return m.reply(raraGagal("PinPack"))
        }

        const packname = `Pinterest: ${query}`
        const author = config.bot?.developer || config.sticker?.author || "Bot"

        try {
            await sock.sendStickerPack(m.chat, stickerBuffers, m, {
                name: packname, packname, publisher: author, author,
                description: `Sticker pack dari Pinterest: ${query}`,
                emojis: ["❤"],
            })
        } catch (packErr) {
            console.error("[PinPack] Pack send failed:", packErr.message)
            await m.reply(raraWrap("pinpack", "Pack gagal, mengirim satu per satu..."))

            let sent = 0
            for (const buf of stickerBuffers) {
                try {
                    let exifBuf = buf
                    try {
                        exifBuf = await addExifToWebp(buf, { packname, author, emojis: ["❤"] })
                    } catch (e) { console.error('[pinpack.js]:', e.message) }
                    await sock.sendMessage(m.chat, { sticker: exifBuf, contextInfo: { isForwarded: false, forwardingScore: 0 } }, { quoted: m })
                    sent++
                    await new Promise((r) => setTimeout(r, 500))
                } catch { continue }
            }

            if (sent > 0) {
                await m.reply(raraWrap("pinpack", `Berhasil kirim *${sent}* sticker dari *${packname}*`))
            } else {
                await m.reply(raraGagal("PinPack"))
            }
        }
        await m.reply(raraBerhasil("pinpack"));
    } catch (error) {
        console.error("[PinPack] Error:", error.message)
        m.reply(raraGangguan("pinpack"))
    }
}

export { pluginConfig as config, handler }
