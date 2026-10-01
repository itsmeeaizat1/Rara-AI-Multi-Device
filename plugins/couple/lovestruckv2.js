import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";
import { getRandomItem } from '../../src/lib/rara-game-engine.js'
const pluginConfig = {
    name: "bucinv2",
    alias: ["bucinv2", "bucin"],
    category: "couple",
    description: 'Random kata-kata bucin/romantis',
    usage: '.bucin',
    example: '.bucin',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    const quote = getRandomItem('bucin.json');
    
    if (!quote) {
        { const __navText = raraWrap("bucin", '❌ Data tidak tersedia!'); await m.reply(__navText); };
        return;
    }
    
    await m.reply(raraGameBox({
      title: "quotes bucin", icon: "💕",
      flavor: "💕 *QUOTES BUCIN BUAT KAMU!*",
      body: `│ • "${quote}"`,
      cta: gameCTA("bucin"),
    }));
}

export { pluginConfig as config, handler }