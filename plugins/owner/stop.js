// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'stop',
    alias: ["stop"],
    category: 'owner',
    description: 'Stop bot process',
    usage: '.stop',
    example: '.stop',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    { const __navText = novaWrap("Stopping Bot...", '🛑 *Stopping Bot...*\n\nBot dimatikan. Harus dinyalakan manual dari terminal.'); await m.reply(__navText); }
    console.log('Stopping via command...')
    
    // Allow message to send before exit
    setTimeout(() => {
        process.exit(1) // Exit code 1 usually stops auto-restart in simple loops
    }, 1000)
}

export { pluginConfig as config, handler }