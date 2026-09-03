// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Quote Card sticker — hybrid: API quotly (primary, hasil ala Telegram/Alya)
// + render lokal @napi-rs/canvas (fallback otomatis kalau API down)
import axios from 'axios'
import canvasPkg from '@napi-rs/canvas';
const { createCanvas, loadImage } = canvasPkg;
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js"

const pluginConfig = {
    name: 'qc',
    alias: ["qc"],
    category: 'sticker',
    description: 'Membuat sticker quote chat dengan warna custom (API + fallback lokal canvas)',
    usage: '.qc <warna> <text>',
    example: '.qc pink Hai semuanya!',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const COLORS = {
    pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50',
    yellow: '#ffeb3b', purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4',
    ash: '#9e9e9e', orange: '#ff9800', black: '#000000', white: '#ffffff',
    teal: '#008080', lightpink: '#FFC0CB', chocolate: '#A52A2A', salmon: '#FFA07A',
    magenta: '#FF00FF', tan: '#D2B48C', wheat: '#F5DEB3', deeppink: '#FF1493',
    fire: '#B22222', skyblue: '#00BFFF', brightskyblue: '#1E90FF', hotpink: '#FF69B4',
    lightskyblue: '#87CEEB', seagreen: '#20B2AA', darkred: '#8B0000', orangered: '#FF4500',
    cyan: '#48D1CC', violet: '#BA55D3', mossgreen: '#00FF7F', darkgreen: '#008000',
    navyblue: '#191970', darkorange: '#FF8C00', darkpurple: '#9400D3', fuchsia: '#FF00FF',
    darkmagenta: '#8B008B', darkgray: '#2F4F4F', peachpuff: '#FFDAB9', darkishgreen: '#BDB76B',
    darkishred: '#DC143C', goldenrod: '#DAA520', darkishgray: '#696969', darkishpurple: '#483D8B',
    gold: '#FFD700', silver: '#C0C0C0'
}

const DEFAULT_PP = 'https://files.catbox.moe/nwvkbt.png'

async function getProfilePicture(sock, jid) {
    try {
        return await sock.profilePictureUrl(jid, 'image')
    } catch {
        return DEFAULT_PP
    }
}

// ═══ PRIMARY: API quotly (brat.siputzx.my.id) — style Telegram quote card ═══
async function renderViaApi({ username, text, avatarUrl, backgroundColor }) {
    const json = {
        messages: [
            {
                from: {
                    id: Math.floor(Math.random() * 10),
                    first_name: username,
                    last_name: "",
                    name: "",
                    photo: { url: avatarUrl }
                },
                text,
                entities: [],
                avatar: true,
                media: { url: "" },
                mediaType: "",
                replyMessage: { name: "", text: "", entities: [], chatId: Math.floor(Math.random() * 10) }
            }
        ],
        backgroundColor,
        width: 512,
        height: 512,
        scale: 2,
        type: "quote",
        format: "png",
        emojiStyle: "apple"
    }

    const response = await axios.post('https://brat.siputzx.my.id/quoted', json, {
        timeout: 20000,
        responseType: 'arraybuffer',
        validateStatus: () => true
    })

    if (response.status !== 200) throw new Error(`api_status_${response.status}`)
    const contentType = response.headers['content-type'] || ''
    if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
        throw new Error('api_not_image')
    }

    const buffer = Buffer.from(response.data)
    if (buffer.length < 500) throw new Error('api_empty_result')
    return buffer
}

// ═══ FALLBACK: render lokal @napi-rs/canvas (kalau API down) ═══
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let currentLine = words[0] || ''
    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i]
        if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine)
            currentLine = words[i]
        } else {
            currentLine = testLine
        }
    }
    lines.push(currentLine)
    return lines
}

async function renderViaCanvas({ username, text, avatarUrl, backgroundColor }) {
    const scale = 2
    const maxCardWidth = 400
    const padding = 24
    const avatarSize = 50
    const gap = 14

    let avatarImg
    try {
        const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 10000 })
        avatarImg = await loadImage(Buffer.from(res.data))
    } catch {
        avatarImg = await loadImage(DEFAULT_PP)
    }

    const measureCanvas = createCanvas(maxCardWidth, 200)
    const mctx = measureCanvas.getContext('2d')
    mctx.font = `${15 * scale}px sans-serif`
    const maxTextWidth = (maxCardWidth - padding * 2 - avatarSize - gap) * scale
    const lines = wrapText(mctx, text, maxTextWidth)

    // Lebar bubble menyesuaikan konten (bukan selalu full width) — biar kartu
    // pendek gak jadi kotak kecil gepeng saat dijadikan stiker persegi
    const longestLineWidth = Math.max(...lines.map(l => mctx.measureText(l).width), mctx.measureText(username).width)
    const contentWidth = avatarSize * scale + gap * scale + longestLineWidth
    const minCardWidth = 260 * scale
    const maxCardWidthPx = maxCardWidth * scale
    const bubbleW = Math.min(Math.max(contentWidth + padding * scale, minCardWidth), maxCardWidthPx)

    const lineH = 22 * scale
    const textBlockH = lines.length * lineH
    const nameH = 20 * scale
    const bubblePadding = 16 * scale
    const bubbleH = nameH + textBlockH + bubblePadding * 2

    // Frame persegi (mendekati 1:1) biar gak gepeng saat jadi stiker WA 512x512
    const contentSize = Math.max(bubbleW, bubbleH) + padding * 2 * scale
    const canvasW = contentSize
    const canvasH = contentSize

    const canvas = createCanvas(canvasW, canvasH)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvasW, canvasH)

    const bubbleX = (canvasW - bubbleW) / 2
    const bubbleY = (canvasH - bubbleH) / 2
    const radius = 18 * scale

    ctx.beginPath()
    ctx.moveTo(bubbleX + radius, bubbleY)
    ctx.lineTo(bubbleX + bubbleW - radius, bubbleY)
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + radius)
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - radius)
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - radius, bubbleY + bubbleH)
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleH)
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - radius)
    ctx.lineTo(bubbleX, bubbleY + radius)
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY)
    ctx.closePath()

    // Bubble putih kalau background bukan putih; kalau background putih, bubble abu muda
    // biar tetap ada kontras dan gak "blank" (bug lama)
    ctx.fillStyle = backgroundColor.toLowerCase() === '#ffffff' ? '#f0f0f0' : '#ffffff'
    ctx.fill()

    const avX = bubbleX + bubblePadding
    const avY = bubbleY + bubblePadding
    ctx.save()
    ctx.beginPath()
    ctx.arc(avX + (avatarSize * scale) / 2, avY + (avatarSize * scale) / 2, (avatarSize * scale) / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImg, avX, avY, avatarSize * scale, avatarSize * scale)
    ctx.restore()

    ctx.fillStyle = '#7a7a7a'
    ctx.font = `${13 * scale}px sans-serif`
    ctx.fillText(username, avX + avatarSize * scale + gap * scale, avY + 16 * scale)

    ctx.fillStyle = '#1a1a1a'
    ctx.font = `${15 * scale}px sans-serif`
    const textX = bubbleX + bubblePadding
    const textY = avY + nameH + bubblePadding
    lines.forEach((line, i) => {
        ctx.fillText(line, textX, textY + i * lineH + 15 * scale)
    })

    return canvas.toBuffer('image/png')
}

async function handler(m, { sock }) {
    const args = m.args || []

    if (args.length < 2) {
        const colorList = Object.keys(COLORS).join(', ')
        return m.reply(
            `💬 *ǫᴜᴏᴛᴇ ꜱᴛɪᴄᴋᴇʀ*\n\n` +
            `\`${m.prefix}qc <warna> <text>\`\n` +
            `Reply pesan + \`${m.prefix}qc <warna>\`\n` +
            `\n` +
            `Contoh: \`${m.prefix}qc pink Hai semuanya!\`\n\n` +
            `${colorList}\n`
        )
    }

    const color = args[0].toLowerCase()
    const backgroundColor = COLORS[color]

    if (!backgroundColor) {
        return m.reply(`❌ *Error*\n\nWarna \`${color}\` tidak ditemukan!\nGunakan salah satu warna yang tersedia.`)
    }

    let message = args.slice(1).join(' ')

    if (m.quoted && !message) {
        message = m.quoted.text || m.quoted.body || ''
    }

    if (!message) {
        return m.reply(`❌ *Error*\n\nMasukkan text untuk quote!`)
    }

    if (message.length > 80) {
        return m.reply(claraWrap("Qc", `❌ *ᴇʀʀᴏʀ*\n\nMaksimal 80 karakter! (Saat ini: ${message.length})`))
    }

    try {
        await m.react("🕒")

        const username = m.pushName || 'User'
        const avatar = await getProfilePicture(sock, m.sender)

        let buffer
        try {
            buffer = await renderViaApi({ username, text: message, avatarUrl: avatar, backgroundColor })
        } catch (apiErr) {
            console.warn("[qc] API gagal, fallback ke canvas lokal:", apiErr.message)
            buffer = await renderViaCanvas({ username, text: message, avatarUrl: avatar, backgroundColor })
        }

        await m.react("🐣")

        await sock.sendImageAsSticker(m.chat, buffer, m, {
            packname: config.sticker?.packname || 'Nova-AI',
            author: config.sticker?.author || 'Bot'
        })
    } catch (error) {
        console.error("[qc] Error:", error.message)
        await m.react("❌")
        m.reply(claraWrap("qc", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
