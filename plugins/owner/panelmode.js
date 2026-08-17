// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js"
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js"
import { getDatabase } from "../../src/lib/nova-database.js"

const pluginConfig = {
    name: 'togglecpanelinfo',
    alias: ['togglepanelinfo', 'cpanelinfo', 'panelinfomode'],
    category: 'owner',
    description: 'Atur mode pengiriman info akun panel (dm/grup/both)',
    usage: '.togglecpanelinfo dm / grup / both',
    example: '.togglecpanelinfo dm',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const MODES = {
    'dm': { num: 1, name: 'PM Only', desc: 'Info akun dikirim ke DM pembuat saja' },
    'grup': { num: 2, name: 'Grup Only', desc: 'Info akun dikirim di grup/chat saja' },
    'both': { num: 3, name: 'PM + Grup', desc: 'Info akun dikirim ke DM dan grup' }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const prefix = m.prefix || '.'
    const text = (m.text || '').trim().toLowerCase()

    // Cek mode saat ini
    const currentMode = db.setting('panelDeliveryMode') || 1
    const currentName = currentMode === 1 ? 'dm' : currentMode === 2 ? 'grup' : 'both'
    const currentInfo = MODES[currentName] || MODES['dm']

    if (!text || text === 'cek' || text === 'status') {
        let txt = 'PANEL DELIVERY MODE\n\n'
        txt += 'Mode aktif: *' + currentName + ' - ' + currentInfo.name + '*\n'
        txt += currentInfo.desc + '\n\n'
        txt += 'Pilihan:\n'
        txt += '  dm   = PM only (ke DM pembuat)\n'
        txt += '  grup = Grup only (di grup/chat)\n'
        txt += '  both = PM + Grup (dua-duanya)\n\n'
        txt += 'Cara pakai: ' + prefix + 'togglecpanelinfo dm'

        return m.reply(claraWrap('panelmode', txt))
    }

    if (!MODES[text]) {
        return m.reply(claraWrap('panelmode', 
            'Mode tidak valid. Pilih: dm, grup, atau both\n\n' +
            prefix + 'togglecpanelinfo dm\n' +
            prefix + 'togglecpanelinfo grup\n' +
            prefix + 'togglecpanelinfo both'
        ))
    }

    const modeInfo = MODES[text]
    db.setting('panelDeliveryMode', modeInfo.num)

    let txt = 'PANEL DELIVERY DIUBAH\n\n'
    txt += 'Mode: *' + text + ' - ' + modeInfo.name + '*\n'
    txt += modeInfo.desc + '\n\n'
    txt += 'Berlaku untuk:\n'
    txt += '  .cp (custom panel)\n'
    txt += '  .1gbv1 - .10gbv1\n'
    txt += '  .cadminv1 - .cadminv5'

    await m.reply(claraWrap('panelmode', txt))
}

export { pluginConfig as config, handler }
