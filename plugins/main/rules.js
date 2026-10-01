// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: 'rules',
    alias: ["rules", "peraturan", "ketentuan"],
    category: 'main',
    description: 'Peraturan & ketentuan penggunaan bot (plain text)',
    usage: '.rules',
    example: '.rules',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const DEFAULT_BOT_RULES = [
    'Gunakan bot dengan bijak dan sesuai peruntukannya',
    'Dilarang spam command dalam jumlah banyak sekaligus',
    'Dilarang menyalahgunakan fitur bot untuk hal negatif',
    'Hormati sesama pengguna bot, jaga sikap dan bahasa',
    'Dilarang mencoba membobol, merusak, atau menyalin bot',
    'Kalau menemukan bug, laporkan ke owner dengan bukti',
    'Request fitur boleh, asalkan masuk akal dan bermanfaat',
    'Bot tidak aktif 24 jam, jadi bisa saja ada maintenance'
]

// FIX 20 Sep 2026 (owner: "isi rules kok g ada kalimat peraturannya tolong
// buatkan jgn gini 1. 1.tes\n2.tes, trus jgn ada emoji gini bahaya gini
// ⚠ hapus aja"):
// (1) nilai lama settings.json default "1.tes\n2. tes" (sisa tes) pakai
//     BACKSLASH-N literal (WA gak bisa kirim newline asli) → split('\n')
//     gak pernah motong → 1 item utuh "1.tes\n2. tes" → render "1. 1.tes...".
// (2) tiap item udah punya nomor sendiri ("1.tes") tapi rules.js nambahin
//     nomor LAGI → dobel "1. 1.tes".
// FIX: parseCustomRules motong newline ASLI + literal \n, buang nomor/bullet
//     yang udah nempel di teks, filter kosong + dedupe.
function parseCustomRules(raw) {
    const lines = String(raw)
        .split(/\r?\n|\\n/)                       // newline asli ATAU literal
        .map(v => v
            .replace(/^\s*(?:[•▪◦\-–*]+|\d{1,2}[.)\-])\s*/, '') // buang "1." / bullet
            .trim())
        .filter(Boolean)
    return [...new Set(lines)]
}

async function handler(m, { sock, config: botConfig }) {
    try {
        const db = getDatabase()
        const customRules = db.setting('botRules')

        let rulesList = DEFAULT_BOT_RULES

        if (customRules) {
            if (Array.isArray(customRules)) {
                rulesList = customRules
            } else if (typeof customRules === 'string') {
                rulesList = parseCustomRules(customRules)
            }
        }

        // Request owner 20 Sep 2026: ganti table/sheet jadi plain text
        // "peraturan ketentuan penggunaan bot" — simpel, gampang dibaca di semua device.
        const botName = botConfig.bot?.name || 'Nova-AI'
        const lines = [
            `*Peraturan & Ketentuan Penggunaan ${botName}*`,
            '',
            ...rulesList.map((rule, i) => `${i + 1}. ${rule}`),
            '',
            'Pelanggaran dapat mengakibatkan banned / kick!',
        ]
        await m.reply(novaWrap('Peraturan Penggunaan Bot', lines))
    } catch (e) {
        m.reply(novaError("Rules", "Ada error nih saat ambil rules"))
    }
}

export { pluginConfig as config, handler }