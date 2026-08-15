// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getRandomItem } from '../../src/lib/nova-game-data.js'
const pluginConfig = {
    name: "dare",
    alias: ["dare", "dare2", "darefun"],
    category: 'fun',
    description: 'Random tantangan dare',
    usage: '.dare',
    example: '.dare',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    const challenge = getRandomItem('dare.json');
    
    if (!challenge) {
        { const __navText = claraWrap("dare", '❌ Data tidak tersedia!'); await m.reply(__navText); };
        return;
    }
    
    await m.reply(`\`\`\`${challenge}\`\`\``);
}

export { pluginConfig as config, handler }