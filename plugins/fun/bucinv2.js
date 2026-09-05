import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";
import { getRandomItem } from '../../src/lib/nova-game-engine.js'
const pluginConfig = {
    name: "bucinv2",
    alias: ["bucinv2", "bucin"],
    category: 'fun',
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
        { const __navText = claraWrap("bucin", '❌ Data tidak tersedia!'); await m.reply(__navText); };
        return;
    }
    
    await m.reply(novaGameBox({
      title: "quotes bucin", icon: "💕",
      flavor: "💕 *QUOTES BUCIN BUAT KAMU!*",
      body: `│ • "${quote}"`,
      cta: gameCTA("bucin"),
    }));
}

export { pluginConfig as config, handler }