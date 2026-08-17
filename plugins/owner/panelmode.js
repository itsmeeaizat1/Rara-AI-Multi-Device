// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js"
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js"

const pluginConfig = {
    name: 'panelmode',
    alias: ['modepanel', 'deliverypanel', 'setdelivery'],
    category: 'owner',
    description: 'Atur mode pengiriman info akun panel (1=PM, 2=Grup, 3=PM+Grup)',
    usage: '.panelmode 1/2/3 atau .panelmode cek',
    example: '.panelmode 1',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

const MODES = {
    1: { name: 'PM Only', desc: 'Info akun dikirim ke DM pembuat saja' },
    2: { name: 'Grup Only', desc: 'Info akun dikirim di grup/chat saja' },
    3: { name: 'PM + Grup', desc: 'Info akun dikirim ke DM dan grup/chat' }
}

async function handler(m, { sock }) {
    const db = (await import('../../src/lib/nova-database.js')).getDatabase()
    const prefix = m.prefix || '.'
    const args = m.args || []
    const text = (m.text || '').trim().toLowerCase()

    // Cek mode saat ini
    if (text === 'cek' || text === 'status' || !args[0]) {
        const currentMode = db.setting('panelDeliveryMode') || 1
        const modeInfo = MODES[currentMode] || MODES[1]
        
        let txt = 'PANEL DELIVERY MODE\n\n'
        txt += 'Mode aktif: *' + currentMode + ' - ' + modeInfo.name + '*\n'
        txt += modeInfo.desc + '\n\n'
        txt += 'Pilihan mode:\n'
        txt += '  1. PM Only\n'
        txt += '     Info akun ke DM pembuat\n\n'
        txt += '  2. Grup Only\n'
        txt += '     Info akun di grup/chat tempat command dijalankan\n\n'
        txt += '  3. PM + Grup\n'
        txt += '     Info akun dikirim ke DM dan grup\n\n'
        txt += 'Cara pakai: ' + prefix + 'panelmode 1'
        
        return m.reply(claraWrap('panelmode', txt))
    }

    const modeNum = parseInt(args[0])
    if (!MODES[modeNum]) {
        return m.reply(claraWrap('panelmode', 'Mode tidak valid. Pilih 1, 2, atau 3.\n\n' + prefix + 'panelmode 1 = PM\n' + prefix + 'panelmode 2 = Grup\n' + prefix + 'panelmode 3 = PM + Grup'))
    }

    db.setting('panelDeliveryMode', modeNum)
    
    const modeInfo = MODES[modeNum]
    let txt = 'PANEL DELIVERY MODE DIUBAH\n\n'
    txt += 'Mode: *' + modeNum + ' - ' + modeInfo.name + '*\n'
    txt += modeInfo.desc + '\n\n'
    txt += 'Berlaku untuk:\n'
    txt += '  .1gbv1 - .10gbv1 (create server)\n'
    txt += '  .cadminv1 (create admin)\n'
    
    await m.reply(claraWrap('panelmode', txt))
}

export { pluginConfig as config, handler }
