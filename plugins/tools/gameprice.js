// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: "gameprice",
    alias: ["gameprice"],
    category: 'tools',
    description: 'Cari diskon game Steam/Epic terbaik',
    usage: '.gameprice',
    example: '.gameprice',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

async function handler(m, { sock }) {
    try {
    await m.react("🕒");
        const response = await axios.get("https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=5", {
            timeout: 15000,
            headers: {
                "User-Agent": "RaraBot/1.0 (contact@rarabot.ai)"
            }
        });

        if (response.status !== 200 || !Array.isArray(response.data) || response.data.length === 0) {
            throw new Error("Gagal ambil nih data dari API CheapShark");
        }

        const deals = response.data.slice(0, 5);

        let boxText = "";
        deals.forEach((game, index) => {
            const savingsFormatted = Math.round(parseFloat(game.savings || 0));
            boxText += `${index + 1}. ${game.title}\n`;
            boxText += `💰 $${game.salePrice} (was $${game.normalPrice})\n`;
            boxText += `📉 ${savingsFormatted}% OFF | Rating: ${game.dealRating}/10\n`;
            if (index < deals.length - 1) {
                boxText += `
`;
            }
        });
        
        const thumbUrl = deals[0]?.thumb;
        let imageBuffer = null;

        if (thumbUrl) {
            try {
                const imgRes = await axios.get(thumbUrl, {
                    responseType: "arraybuffer",
                    timeout: 10000,
                    headers: {
                        "User-Agent": "RaraBot/1.0 (contact@rarabot.ai)"
                    }
                });
                if (imgRes.status === 200 && imgRes.data) {
                    imageBuffer = Buffer.from(imgRes.data);
                }
            } catch (err) {
                // Fallback to sending image by URL if buffer fetch fails
            }
        }

        if (imageBuffer) {
            await sock.sendMessage(m.chat, { image: imageBuffer, caption: boxText }, { quoted: m });
        } else if (thumbUrl) {
            await sock.sendMessage(m.chat, { image: { url: thumbUrl }, caption: boxText }, { quoted: m });
        } else {
            await m.react("🐣");
            await m.reply(boxText);
        }
    } catch (error) {
    await m.react("❌");
        const errorBox = [
            "",
            `Gagal mengambil data diskon game!`,
            `Alasan: ${error.message || "Ada error nih"}`,
            ""
        ].join("\n");
        await m.reply(errorBox);
    }
}

export { pluginConfig as config, handler };
