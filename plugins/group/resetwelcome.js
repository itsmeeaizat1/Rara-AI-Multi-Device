// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'resetwelcome',
    alias: ["resetwelcome"],
    category: 'group',
    description: 'Reset welcome message ke default',
    usage: '.resetwelcome',
    example: '.resetwelcome',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat)
    
    if (!groupData?.welcomeMsg) {
        return m.reply(novaWrap("resetwelcome", "Pesan welcome masih default, gak ada yang perlu di-reset.", "info"))
    }

    db.setGroup(m.chat, { welcomeMsg: null })
    db.save()
    await m.reply(novaWrap("resetwelcome", [
        "Pesan welcome berhasil di-reset ke default.",
        "",
        `💡 Custom lagi? Ketik ${m.prefix}setwelcome <pesan>`,
    ], "success"))
}

export { pluginConfig as config, handler }