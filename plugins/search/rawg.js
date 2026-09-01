import config from '../../config.js';
import axios from 'axios';
import { novaError, novaEmpty, novaNoInput, novaGuide } from '../../src/lib/nova-menu-style.js';

const pluginConfig = {
    name: "rawg",
    alias: ["rawg"],
    category: 'search',
    description: 'Search info game dari database RAWG',
    usage: '.rawg <nama game>',
    example: '.rawg god of war',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

async function handler(m, { sock }) {
    const query = m.text?.trim();

    if (!query) {
        return m.reply(novaGuide('Game Search', 'Mau nyari info game apa nih? Ketik nama gamenya ya!', pluginConfig.example));
    }
    try {
        const apiKey = config.APIkey?.rawg || 'DEMO_KEY';
        const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=5`;

        const response = await axios.get(url, { timeout: 15000 });
        const games = response.data?.results || [];

        if (!games.length) {
            return m.reply(novaEmpty('Game Search', `Gak nemu game "${query}" 🧐`));
        }

        const list = games.slice(0, 5);

        let resultText = `╭─「 ✦ Game Search ✦ 」\n`;

        list.forEach((g, index) => {
            const name = g.name || 'Unknown';
            const releasedYear = g.released ? g.released.split('-')[0] : 'N/A';
            const rating = g.rating !== undefined && g.rating !== null ? g.rating : 'N/A';
            const metacritic = g.metacritic !== undefined && g.metacritic !== null ? g.metacritic : 'N/A';

            const platforms = g.platforms && g.platforms.length > 0
                ? g.platforms.map(p => p.platform?.name).filter(Boolean).join(', ')
                : 'N/A';

            const genres = g.genres && g.genres.length > 0
                ? g.genres.map(gn => gn.name).filter(Boolean).join(', ')
                : 'N/A';

            resultText += `│ ${index + 1}. ${name} (${releasedYear})\n`;
            resultText += `│ ⭐ ${rating} | Metacritic: ${metacritic}\n`;
            resultText += `│ 🎮 ${platforms}\n`;
            resultText += `│ 🏷 ${genres}\n`;

            if (index < list.length - 1) {
                resultText += `│\n`;
            }
        });

        resultText += `╰────  •  ────`;
        const thumbnail = list.find(g => g.background_image)?.background_image;

        if (thumbnail) {
            try {
                return await sock.sendMessage(m.chat, {
                    image: { url: thumbnail },
                    caption: resultText
                }, { quoted: m });
            } catch {
                return await m.reply(resultText);
            }
        } else {
            return await m.reply(resultText);
        }
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message || 'Terjadi kesalahan saat menghubungi API RAWG.';
        return m.reply(novaError('Game Search', errorMsg));
    }
}

export { pluginConfig as config, handler };
