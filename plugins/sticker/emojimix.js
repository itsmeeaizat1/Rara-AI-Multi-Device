// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Emojimix — pakai emoji-mixer + Google Emoji Kitchen CDN (tanpa API key)
// Tenor Google API sudah discontinued, ganti dengan direct Google CDN
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { toUnicode, checkSupported } from 'emoji-mixer';

const pluginConfig = {
    name: 'emojimix',
    alias: ["emojimix"],
    category: 'sticker',
    description: 'Gabungkan 2 emoji menjadi 1 (Google Emoji Kitchen)',
    usage: '.emojimix <emoji1><emoji2>',
    example: '.emojimix 😂🔥',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

// Base URL Google Emoji Kitchen CDN
const BASE_URL = "https://www.gstatic.com/android/keyboard/emojikitchen";

/**
 * Cari URL emoji kitchen untuk pasangan emoji
 * Cek kedua arah: emoji1_emoji2 dan emoji2_emoji1
 */
function getEmojiKitchenUrl(emoji1, emoji2) {
    const u1 = toUnicode(emoji1);
    const u2 = toUnicode(emoji2);

    // Cek arah 1: emoji1 sebagai left
    const pairs1 = checkSupported(emoji1);
    if (pairs1) {
        const match1 = pairs1.find(p => p.rightEmoji === u2);
        if (match1) {
            return `${BASE_URL}/${match1.date}/u${match1.leftEmoji}/u${match1.leftEmoji}_u${match1.rightEmoji}.png`;
        }
    }

    // Cek arah 2: emoji2 sebagai left
    const pairs2 = checkSupported(emoji2);
    if (pairs2) {
        const match2 = pairs2.find(p => p.rightEmoji === u1);
        if (match2) {
            return `${BASE_URL}/${match2.date}/u${match2.leftEmoji}/u${match2.leftEmoji}_u${match2.rightEmoji}.png`;
        }
    }

    return null;
}

async function handler(m, { sock }) {
    const text = m.text?.trim()
    
    if (!text) {
        return m.reply( `🎭 *ᴇᴍᴏᴊɪ ᴍɪx*\n\n` +
            `Gabungkan 2 emoji menjadi 1\n\n` +
            `Contoh: \`${m.prefix}emojimix 😂🔥\``, "emojimix")
    }
    
    const emojiRegex = /\p{Extended_Pictographic}/gu
    const emojis = text.match(emojiRegex)
    
    if (!emojis || emojis.length < 2) {
        return m.reply( novaError("EmojiMix", "Masukin minimal 2 emoji ya!"), { commandName: "emojimix" })
    }
    
    const emoji1 = emojis[0]
    const emoji2 = emojis[1]
    
    m.react('🕐')
    
    try {
        // Cari URL dari Google Emoji Kitchen (tanpa API key)
        const imageUrl = getEmojiKitchenUrl(emoji1, emoji2);
        
        if (!imageUrl) {
            return m.reply(claraWrap("Emojimix", [
                `Kombinasi ${emoji1} + ${emoji2} gak tersedia nih!`,
                "",
                "Coba kombinasi emoji lain ya!"
            ].join("\n")));
        }
        
        // Download image dari Google CDN
        const res = await fetch(imageUrl);
        if (!res.ok) {
            return m.reply(claraWrap("Emojimix", [
                `Gagal download emoji mix nih.`,
                "",
                "Coba lagi ya!"
            ].join("\n")));
        }
        
        const buffer = Buffer.from(await res.arrayBuffer());
        
        // Kirim sebagai sticker
        await sock.sendImageAsSticker(m.chat, buffer, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        
        m.react('✅')
        
    } catch (err) {
        console.error('[emojimix] Error:', err.message);
        m.reply(claraWrap("Emojimix", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
