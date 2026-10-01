// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from '../../src/lib/nova-database.js'
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'resetgoodbye',
    alias: ["resetgoodbye"],
    category: 'group',
    description: 'Reset goodbye message ke default',
    usage: '.resetgoodbye',
    example: '.resetgoodbye',
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
    
    if (!groupData?.goodbyeMsg) {
        return m.reply(novaWrap("resetgoodbye", "Pesan goodbye masih default, gak ada yang perlu di-reset.", "info"))
    }

    db.setGroup(m.chat, { goodbyeMsg: null })
    db.save()
    await m.reply(novaWrap("resetgoodbye", [
        "Pesan goodbye berhasil di-reset ke default.",
        "",
        `💡 Custom lagi? Ketik ${m.prefix}setgoodbye <pesan>`,
    ], "success"))
}

export { pluginConfig as config, handler }