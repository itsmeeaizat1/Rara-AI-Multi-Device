// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getRandomItem } from '../../src/lib/nova-game-data.js'
const pluginConfig = {
    name: "truth",
    alias: ["truth", "truth2", "truthfun"],
    category: 'fun',
    description: 'Random pertanyaan truth',
    usage: '.truth',
    example: '.truth',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    const question = getRandomItem('truth.json');
    if (!question) {
        { const __navText = claraWrap("truth", '❌ Data tidak tersedia!'); await m.reply(__navText); };
        return;
    }
    await m.reply(`\`\`\`${question}\`\`\``);
}

export { pluginConfig as config, handler }