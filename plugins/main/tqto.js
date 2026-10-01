// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tqto.js — Daftar kontributor + info lengkap bot (request owner 20 Sep 2026):
// kontributor AI disamain role "AI Coding Assistant", ditambah kredit library
// (Baileys/base), daftar pembuat Rest API yang kepakai di fitur bot, kontak
// owner, link grup & saluran official, sosial media, runtime, nama script &
// base, dan keterangan lisensi. Bagian panjang disembunyikan di balik
// readmore biar teks gak langsung muncul panjang nimpa teks atas.

import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { formatUptime } from "../../src/lib/rara-formatter.js";
import config from '../../config.js'

// readmore WhatsApp: teks setelah tanda ini ke-collapse jadi "Baca selengkapnya"
// (pola sama kayak raraMenuLayout readMoreBeforeCategories)
const READMORE = String.fromCharCode(8206).repeat(4001);

const pluginConfig = {
    name: 'tqto',
    alias: ["tqto"],
    category: 'main',
    description: 'Menampilkan daftar kontributor bot',
    usage: '.tqto',
    example: '.tqto',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, uptime }) {
    const botName = config.bot?.name || "Rara AI Whatsapp Bot"

    // ── Kontributor utama (yang keliatan sebelum readmore) ──
    const credits = [
        { name: 'Aizat', role: 'Pembuat Bot', icon: '👑' },
        { name: 'Claude Sonnet 5', role: 'AI Coding Assistant', icon: '〽' },
        { name: 'OpenAI Luna', role: 'AI Coding Assistant', icon: '〽' },
        { name: 'GLM (Terbaru)', role: 'AI Coding Assistant', icon: '〽' },
    ]

    // ── Pembuat Rest API yang kepakai di fitur bot (dari boot doctor probe list) ──
    const restApis = [
        'IkyyXD (Iky) — api.ikyyxd.my.id',
        'HaidarApis (Haidar) — api.haidarxd.my.id',
        'Cuki API — api.cuki.biz.id',
        'StemSplit — stemsplit.io/api/v1',
        'FazzCode — api.fazzcode.eu.cc',
        'Xemoz Official — api-xemoz-official.my.id',
        'KuroNeko / Sylvatica — sylvatica.my.id',
        'FGSI — fgsi.dpdns.org',
        'Inception Labs — api.inceptionlabs.ai',
        '9Router — 9router.cloudku.us.kg',
        'Anabot — anabot.my.id',
        'NeoXR — api.neoxr.eu',
        'ObscuraWorks — api.obscuraworks.org',
        'Firefly (Maiku) — firefly.maiku.my.id',
        'SaveNow — savenow.to',
        'TikWM — tikwm.com (TikTok downloader)',
        'Zann — downloader TikTok HD',
        'LRCLIB — lrclib.net (lirik lagu)',
        'SeaArt — maker AI to*',
    ]

    const grupLink = config.info?.grupwa || "-"
    const saluranLink = config.saluran?.link || "-"
    const saluranName = config.saluran?.name || "Rara AI Official"
    const ownerNumber = (config.owner?.number?.[0] || "628174887770").replace(/^62/, "0")
    const runtimeStr = formatUptime(uptime ?? process.uptime() * 1000)

    const navText = `🍟 *Terima kasih kepada yang sudah berkontribusi di ${botName}*

${credits.map((c, i) => `*${i + 1}*. *${c.name}* [ ${c.icon} ${c.role} ]`).join('\n')}

${READMORE}
*Library & Base Bot:*
- Adiwajshing (Pembuat library Baileys — socket WhatsApp Multi-Device)
- Nurutomo (Kreator wabot-aq, salah satu base bot legendaris)

*All Rest API (pembuat rest api yang kepakai di fitur bot ini):*
${restApis.map(r => `- ${r}`).join('\n')}

*Kontak:*
- WhatsApp: ${ownerNumber}
- Email: aizatalamudinindonesia.plus@gmail.com
- TikTok: itsmee_aizat

*Link Grup Dan Saluran Official:*
- Grup: ${grupLink}
- Saluran: ${saluranName} — ${saluranLink}

*Akun Sosial Media:*
- TikTok: itsmee_aizat

*Runtime:*
- Bot sudah menyala tanpa mati selama ${runtimeStr}

*Nama Script & Base:*
- Base: Rara AI Multi Device
- Baileys: Multi-Device

*Keterangan Lisensi:*
Copyright © 2024-2026 Aizat (itsmeeaizat). All Rights Reserved.
Script Rara AI WhatsApp Bot berlisensi proprietary — dilarang menyalin,
menjual, atau menyebarkan sebagian maupun keseluruhan kode tanpa izin
tertulis dari pembuat.`

    await m.reply(raraWrap("tqto", navText))
}

export { pluginConfig as config, handler }
