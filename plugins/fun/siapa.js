// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: [
        'bego', 'goblok', 'janda', 'perawan', 'babi', 'tolol', 'pekok', 
        'jancok', 'pinter', 'pintar', 'asu', 'bodoh', 'gay', 'lesby',
        'bajingan', 'anjing', 'anjg', 'anjj', 'anj', 'ngentod', 'ngentot',
        'monyet', 'mastah', 'newbie', 'bangsat', 'bangke', 'sange', 'sangean',
        'dakjal', 'horny', 'wibu', 'puki', 'puqi', 'peak', 'pantex', 'pantek',
        'setan', 'iblis', 'cacat', 'yatim', 'piatu', 'ganteng', 'cantik',
        'jelek', 'keren', 'cupu', 'noob', 'pro', 'sultan', 'miskin', 'kaya', 'siapa'
    ],
    alias: ["bego", "goblok", "janda", "perawan", "babi", "tolol", "pekok", "jancok", "pinter", "pintar", "asu", "bodoh", "gay", "lesby", "bajingan", "anjing", "anjg", "anjj", "anj", "ngentod", "ngentot", "monyet", "mastah", "newbie", "bangsat", "bangke", "sange", "sangean", "dakjal", "horny", "wibu", "puki", "puqi", "peak", "pantex", "pantek", "setan", "iblis", "cacat", "yatim", "piatu", "ganteng", "cantik", "jelek", "keren", "cupu", "noob", "pro", "sultan", "miskin", "kaya", "siapa"],
    category: 'fun',
    description: 'Random pilih member untuk kategori tertentu',
    usage: '.<kategori>',
    example: '.ganteng',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const command = m.command?.toLowerCase()
    try {
    await m.react("🕒");
        const groupMeta = m.groupMetadata
        const participants = groupMeta.participants || []
        const members = participants
            .map(p => p.jid)
            .filter(id => id && id !== sock.user?.id?.split(':')[0] + '@s.whatsapp.net')
        if (members.length === 0) {
            return m.reply(claraWrap("Siapa", `❌ Tidak ada member di grup!`))
        }
        const randomMember = members[Math.floor(Math.random() * members.length)]
        const positiveWords = ['ganteng', 'cantik', 'keren', 'pro', 'sultan', 'kaya', 'pinter', 'pintar', 'mastah']
        const isPositive = positiveWords.includes(command)
        const emoji = isPositive ? '' : '😏'
        const label = isPositive ? 'Yang paling' : 'Anak'
        await m.react("🐣");
        await m.reply(claraWrap("Siapa", `*${label} ${command} di sini adalah* @${randomMember.split('@')[0]}`))
    } catch (error) {
    await m.react("❌");
        m.reply(claraWrap("siapa", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }