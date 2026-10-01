// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { downloadMediaMessage } from 'nova'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const run = promisify(exec)

const pluginConfig = {
    name: "upch",
    alias: ["upch"],
    category: "owner",
    description: "Upload gambar, audio, video, atau teks ke saluran",
    usage: ".upch <id saluran> <teks opsional>",
    example: ".upch 12xxx@newsletter Halo!",
    cooldown: 10,
    energi: 0,
    isOwner: true,
    isEnabled: true
}

async function toOggOpus(inputBuf) {
    const tmp = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const id = crypto.randomBytes(6).toString("hex")
    const inp = path.join(tmp, `upch_in_${id}`)
    const out = path.join(tmp, `upch_out_${id}.ogg`)
    fs.writeFileSync(inp, inputBuf)
    await run(`ffmpeg -y -i "${inp}" -vn -map_metadata -1 -ac 1 -ar 48000 -c:a libopus -b:a 96k -vbr on -application audio -f ogg "${out}"`)
    const buf = fs.readFileSync(out)
    try { fs.unlinkSync(inp) } catch (e) { console.error('[upch.js]:', e.message); }
    try { fs.unlinkSync(out) } catch (e) { console.error('[upch.js]:', e.message); }
    return buf
}

function generateWaveform(audioBuf, samples = 64) {
    const waveform = new Uint8Array(samples)
    const chunkSize = Math.floor(audioBuf.length / samples)
    for (let i = 0; i < samples; i++) {
        const offset = i * chunkSize
        let sum = 0
        const len = Math.min(chunkSize, audioBuf.length - offset)
        for (let j = 0; j < len; j++) {
            sum += Math.abs(audioBuf[offset + j] - 128)
        }
        waveform[i] = Math.min(255, Math.floor((sum / len) * 2.5))
    }
    return waveform
}

async function handler(m, { sock }) {
    const args = m.text?.replace(/^\.upch\s+/i, '').split(" ") || []
    // FIX 19 Sep 2026: dulu default config.saluran.id = placeholder "@newsletter"
    // → kirim ke JID palsu → gagal senyap. Sekarang resolve dari link invite.
    let chId = args[0]?.includes("@newsletter") ? args.shift() : null
    if (!chId) {
        const { resolveNewsletterJid } = await import("../../src/lib/rara-saluran.js")
        chId = await resolveNewsletterJid(sock).catch(() => config?.saluran?.id)
    }
    const chName = config?.saluran?.name || config?.bot?.name || "Rara-AI"
    const caption = args.join(" ").trim()

    const quoted = m.quoted || m
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    const isVideo = m.isVideo || (m.quoted && m.quoted.type === 'videoMessage')
    const isAudio = m.type === 'audioMessage' || (m.quoted && m.quoted.type === 'audioMessage')
    const isMedia = isImage || isVideo || isAudio

    if (!isMedia && !caption) {
        return m.reply( `📤 *upload saluran*\n\n` +
            `Kirim/reply media dengan caption:\n` +
            `  \`${m.prefix}upch 12xxx@newsletter <teks opsional>\`\n\n` +
            `*Support:*\n` +
            `  🖼️ Gambar\n` +
            `  🎥 Video\n` +
            `  🎵 Audio/VN\n` +
            `  📝 Teks (tanpa media)`, "upch")
    }
    try {
        if (!isMedia && caption) {
            await sock.sendMessage(chId, { text: caption })
            return m.reply(raraWrap("Upch", `✅ Teks berhasil dikirim ke saluran`))
        }

        const mediaBuf = await downloadMediaMessage(quoted, "buffer", {})
        if (!mediaBuf || mediaBuf.length < 1000) throw new Error("Media terlalu kecil atau gagal download")

        if (isImage) {
            await sock.sendMessage(chId, {
                image: mediaBuf,
                caption: caption || undefined
            })
            return m.reply(raraWrap("Upch", "✅ Gambar berhasil dikirim ke saluran"))
        }

        if (isVideo) {
            await sock.sendMessage(chId, {
                video: mediaBuf,
                caption: caption || undefined
            })
            return m.reply(raraWrap("Upch", "✅ Video berhasil dikirim ke saluran"))
        }

        if (isAudio) {
            const opusBuf = await toOggOpus(mediaBuf)
            if (opusBuf.length < 5000) throw new Error("Konversi opus gagal")
            const waveform = generateWaveform(opusBuf)
            await sock.sendMessage(chId, {
                audio: opusBuf,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                waveform: Array.from(waveform)
            })
            return m.reply(raraWrap("Upch", "✅ Audio berhasil dikirim ke saluran"))
        }

        { const __navText = "❌ Tipe media tidak didukung"; await m.reply(__navText); }
    } catch (e) {
        console.error("[UpCh]", e)
        await m.reply(raraWrap("upch", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
