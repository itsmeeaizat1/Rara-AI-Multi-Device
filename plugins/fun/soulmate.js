// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";

/**
 * Soul Match / Belahan Jiwa - Fun compatibility checker
 * Ported from RTXZY-MD-pro
 */

const pluginConfig = {
    name: "soulmate",
    alias: ["soulmate"],
    category: 'fun',
    description: 'Cek kecocokan jiwa dengan seseorang',
    usage: '.soulmate nama1|nama2',
    example: '.soulmatch Raiden|Mei',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 0,
    isEnabled: true
}

const ELEMENTS = ['Api 🔥', 'Air 💧', 'Tanah 🌍', 'Angin 🌪️', 'Petir ⚡', 'Es ❄️', 'Cahaya', 'Bayangan 🌑']
const ZODIAC = ['♈ Aries', '♉ Taurus', '♊ Gemini', '♋ Cancer', '♌ Leo', '♍ Virgo', 
               '♎ Libra', '♏ Scorpio', '♐ Sagittarius', '♑ Capricorn', '♒ Aquarius', '♓ Pisces']
const SOUL_TYPES = [
    "Pemimpin Yang Berani", "Penyeimbang Bijaksana", "Kreator Ekspresif", "Pembangun Solid", 
    "Petualang Bebas", "Pelindung Setia", "Pemikir Mistis", "Penakluk Kuat", "Humanitarian Murni"
]

function generateSoulData(name, seed) {
    const nameVal = Array.from(name.toLowerCase()).reduce((a, c) => a + c.charCodeAt(0), 0)
    return {
        element: ELEMENTS[(nameVal + seed) % ELEMENTS.length],
        zodiac: ZODIAC[(nameVal + seed * 2) % ZODIAC.length],
        soulType: SOUL_TYPES[(nameVal + seed * 3) % SOUL_TYPES.length]
    }
}

function getMatchDescription(score) {
    if (score >= 90) return "💫 Takdir Sejati"
    if (score >= 80) return "Harmoni Sempurna"
    if (score >= 70) return "🌟 Koneksi Kuat"
    if (score >= 60) return "⭐ Potensi Bagus"
    if (score >= 50) return "🌙 Perlu Perjuangan"
    return "🌑 Tantangan Berat"
}

function getReading(score) {
    if (score >= 80) {
        return "Jiwa kalian memiliki koneksi yang sangat istimewa dan langka. Takdir telah merencanakan pertemuan ini."
    } else if (score >= 60) {
        return "Ada chemistry yang kuat di antara kalian. Perbedaan kalian justru menciptakan harmoni."
    } else if (score >= 40) {
        return "Butuh waktu untuk saling memahami. Setiap tantangan akan memperkuat ikatan kalian."
    }
    return "Perbedaan signifikan dalam energi jiwa. Butuh banyak adaptasi dan pengertian."
}

async function handler(m, { sock }) {
    const args = m.args || []
    const text = args.join(' ')
    
    if (!text || !text.includes('|')) {
        return m.reply(
            claraWrap("soulmate", [
              `Cek kecocokan jiwa 2 orang.`,
              ``,
              `📌 Format: ${m.prefix}soulmatch <nama1>|<nama2>`,
              `💡 Contoh: ${m.prefix}soulmatch Raiden|Mei`,
            ])
        )
    }
    
    const [nama1, nama2] = text.split('|').map(n => n.trim())
    
    if (!nama1 || !nama2) {
        return m.reply(claraWrap("soulmate", [
            `Masukkan 2 nama dengan format yang benar.`,
            ``,
            `💡 Contoh: ${m.prefix}soulmatch Raiden|Mei`,
        ]))
    }
    const seed1 = Date.now() % 100
    const seed2 = (Date.now() + 50) % 100
    const soul1 = generateSoulData(nama1, seed1)
    const soul2 = generateSoulData(nama2, seed2)
    const combined = nama1.toLowerCase() + nama2.toLowerCase()
    const baseScore = Array.from(combined).reduce((a, c) => a + c.charCodeAt(0), 0)
    const compatibility = (baseScore % 51) + 50 
    const rows = [
        `│ • 👤 ${nama1}`,
        `│   🔮 Soul : ${soul1.soulType}`,
        `│   🌟 Element : ${soul1.element}`,
        `│   🎯 Zodiac : ${soul1.zodiac}`,
        "│",
        `│ • 👤 ${nama2}`,
        `│   🔮 Soul : ${soul2.soulType}`,
        `│   🌟 Element : ${soul2.element}`,
        `│   🎯 Zodiac : ${soul2.zodiac}`,
        "│",
        `│ • 💕 Compatibility : ${compatibility}%`,
        `│ • 🎭 Status : ${getMatchDescription(compatibility)}`,
        `│ • 🔮 Reading : ${getReading(compatibility)}`,
    ]
    await m.reply(novaGameBox({
        title: "soulmate", icon: "💞",
        flavor: `💞 *KECOCOKAN JIWA ${nama1} & ${nama2}!*`,
        body: rows.join("\n"),
        cta: gameCTA("soulmate"),
    }))
}

export { pluginConfig as config, handler }