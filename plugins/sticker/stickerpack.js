// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Scrape Telegram sticker pack via combot.org (tanpa API key)
import { raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

import _sharp from 'sharp'
import axios from "axios"
import config from "../../config.js"
import te from "../../src/lib/rara-error.js"
import { addExifToWebp } from "../../src/lib/rara-exif.js"
import { raraError, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js"

function getSharp() { return _sharp }

const MAX_STICKERS = 20
const DOWNLOAD_DELAY = 500

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    return Buffer.from(res.data)
}

async function toWebpSticker(buffer) {
    // cdn.combot.online sudah format webp, tinggal resize
    return (await getSharp())(buffer)
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer()
}

// Scrape combot.org untuk cari sticker pack
async function searchStickerPacks(query) {
    const url = `https://combot.org/telegram/stickers?q=${encodeURIComponent(query)}`
    const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 15000,
    })
    const html = res.data
    // Extract sticker set names dari href="/stickers/<name>"
    const matches = [...html.matchAll(/href="\/stickers\/([a-zA-Z0-9_]+)"/g)]
    // Deduplicate
    const seen = new Set()
    const packs = []
    for (const m of matches) {
        const name = m[1]
        if (!seen.has(name)) {
            seen.add(name)
            packs.push(name)
        }
    }
    return packs
}

// Scrape individual sticker set page untuk dapat URL gambar
async function getStickerSetUrls(setName) {
    const url = `https://combot.org/stickers/${setName}`
    const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 15000,
    })
    const html = res.data
    // Extract sticker image URLs dari data-src atau src
    const matches = [...html.matchAll(/(?:data-src|src)="(https:\/\/cdn\.combot\.online\/[^"]+\.webp)"/g)]
    const urls = matches.map(m => m[1])
    // Deduplicate
    return [...new Set(urls)]
}

const pluginConfig = {
    name: "stickerpack",
    alias: ["stickerpack"],
    category: "sticker",
    description: "Cari dan kirim sticker pack Telegram (scrape combot.org)",
    usage: ".stickerpack <query>",
    example: ".stickerpack anime",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 20,
    energi: 2,
    isEnabled: true,
}

async function handler(m, { sock }) {
    const query = m.args?.join(" ")?.trim()

    if (!query) {
        return m.reply(raraCaption({
            emoji: "🖼️",
            name: "stickerpack",
            description: "Cari dan kirim sticker pack Telegram",
            usage: `${m.prefix}stickerpack <query>`,
            example: `${m.prefix}stickerpack anime`,
        }), "stickerpack")
    }

    try {
        // Step 1: Search sticker packs
        const packs = await searchStickerPacks(query)
        if (!packs.length) {
            return m.reply(raraWrap("stickerpack", `Tidak ada sticker pack untuk: *${query}*`))
        }

        // Step 2: Pick random pack
        const randomPack = packs[Math.floor(Math.random() * packs.length)]
        await m.react("🕒");

        // Step 3: Get sticker URLs from pack page
        const stickerUrls = await getStickerSetUrls(randomPack)
        if (!stickerUrls.length) {
            return m.reply(raraGagal("StickerPack"))
        }

        const limited = stickerUrls.slice(0, MAX_STICKERS)
        
        // Step 4: Download & convert stickers
        const stickerBuffers = []
        for (const url of limited) {
            try {
                const buf = await downloadBuffer(url)
                const webp = await toWebpSticker(buf)
                stickerBuffers.push(webp)
                await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY))
            } catch { continue }
        }

        if (!stickerBuffers.length) {
            return m.reply(raraGagal("StickerPack"))
        }

        // Step 5: Send sticker pack
        const packname = randomPack.replace(/_/g, " ")
        const author = config.bot?.developer || config.sticker?.author || "Bot"

        try {
            await sock.sendStickerPack(m.chat, stickerBuffers, m, {
                name: packname, packname, publisher: author, author,
                description: `Sticker pack: ${packname}`,
                emojis: ["❤"],
            })
        } catch (packErr) {
            console.error("[StickerPack] Pack send failed:", packErr.message)
            await m.reply(raraWrap("stickerpack", "Pack gagal, mengirim satu per satu..."))

            let sent = 0
            for (const buf of stickerBuffers) {
                try {
                    let exifBuf = buf
                    try {
                        exifBuf = await addExifToWebp(buf, { packname, author, emojis: ["❤"] })
                    } catch (e) { console.error('[stickerpack.js]:', e.message) }
                    await sock.sendMessage(m.chat, { sticker: exifBuf, contextInfo: { isForwarded: false, forwardingScore: 0 } }, { quoted: m })
                    sent++
                    await new Promise((r) => setTimeout(r, 500))
                } catch { continue }
            }

            if (sent > 0) {
                await m.reply(raraWrap("stickerpack", `Berhasil kirim *${sent}* sticker dari *${packname}*`))
            } else {
                await m.reply(raraGagal("StickerPack"))
            }
        }
        await m.reply(raraBerhasil("stickerpack"));
    } catch (error) {
        console.error("[StickerPack] Error:", error.message)
        m.reply(raraGangguan("stickerpack"))
    }
}

export { pluginConfig as config, handler }
