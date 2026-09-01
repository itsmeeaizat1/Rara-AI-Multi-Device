// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js"

const pluginConfig = {
    name: 'qc',
    alias: ["qc"],
    category: 'sticker',
    description: 'Membuat sticker quote chat dengan warna custom (lokal canvas)',
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

async function renderQuoteCard(opts) {
    const { username, text, avatarUrl, backgroundColor } = opts
    const scale = 2
    const baseWidth = 400
    const padding = 24
    const avatarSize = 50
    const gap = 14

    // Load avatar
    let avatarImg
    try {
        const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 10000 })
        avatarImg = await loadImage(Buffer.from(res.data))
    } catch {
        avatarImg = await loadImage(DEFAULT_PP)
    }

    // Measure text
    const measureCanvas = createCanvas(baseWidth, 200)
    const mctx = measureCanvas.getContext('2d')
    mctx.font = `${15 * scale}px sans-serif`
    const maxWidth = (baseWidth - padding * 2 - avatarSize - gap) * scale
    const lines = wrapText(mctx, text, maxWidth)
    const lineH = 22 * scale
    const textBlockH = lines.length * lineH
    const nameH = 20 * scale
    const bubblePadding = 16 * scale
    const bubbleH = nameH + textBlockH + bubblePadding * 2
    const bubbleW = baseWidth * scale

    const canvasW = bubbleW + padding * 2 * scale
    const canvasH = Math.max(bubbleH + padding * 2 * scale, (avatarSize + bubblePadding) * scale + padding * 2 * scale)

    const canvas = createCanvas(canvasW, canvasH)
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Bubble
    const bubbleX = padding * scale
    const bubbleY = padding * scale
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

    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Avatar (circle)
    const avX = bubbleX + bubblePadding
    const avY = bubbleY + bubblePadding
    ctx.save()
    ctx.beginPath()
    ctx.arc(avX + (avatarSize * scale) / 2, avY + (avatarSize * scale) / 2, (avatarSize * scale) / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImg, avX, avY, avatarSize * scale, avatarSize * scale)
    ctx.restore()

    // Username
    ctx.fillStyle = '#7a7a7a'
    ctx.font = `${13 * scale}px sans-serif`
    ctx.fillText(username, avX + avatarSize * scale + gap * scale, avY + 16 * scale)

    // Message text
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
        return m.reply(`❌ *ᴇʀʀᴏʀ*\n\nWarna \`${color}\` tidak ditemukan!\nGunakan salah satu warna yang tersedia.`)
    }

    let message = args.slice(1).join(' ')

    if (m.quoted && !message) {
        message = m.quoted.text || m.quoted.body || ''
    }

    if (!message) {
        return m.reply(`❌ *ᴇʀʀᴏʀ*\n\nMasukkan text untuk quote!`)
    }

    if (message.length > 80) {
        return m.reply(claraWrap("Qc", `❌ *ᴇʀʀᴏʀ*\n\nMaksimal 80 karakter! (Saat ini: ${message.length})`))
    }

    try {
        const username = m.pushName || 'User'
        const avatar = await getProfilePicture(sock, m.sender)

        const buffer = await renderQuoteCard({
            username,
            text: message,
            avatarUrl: avatar,
            backgroundColor,
        })

        await sock.sendImageAsSticker(m.chat, buffer, m, {
            packname: config.sticker?.packname || 'Nova-AI',
            author: config.sticker?.author || 'Bot'
        })
    } catch (error) {
        console.error("[qc] Error:", error.message)
        m.reply(claraWrap("qc", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
