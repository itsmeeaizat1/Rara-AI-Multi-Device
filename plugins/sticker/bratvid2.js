// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { bratVid } from "brat-canvas/video";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: "bratvid2",
    alias: ["bratvid2"],
    category: "sticker",
    description: "Membuat sticker brat video v2 (lokal canvas)",
    usage: ".bratvid2 <text>",
    example: ".bratvid2 hello world",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true,
};

async function handler(m, { sock }) {
    const text = m.args.join(" ").trim();
    if (!text) {
        const msg = `🎬 *ʙʀᴀᴛ ᴠɪᴅᴇᴏ ᴠ2*\n\nMasukkan teks\n\n\`Contoh: ${m.prefix}bratvid2 hello world\``;
        return await m.reply(msg);
    }
    const tempFile = path.join(os.tmpdir(), `bratvid2-${Date.now()}.webp`);
    try {
        const buffer = await bratVid(text, {
            outputFormat: "mp4",
        });
        await fs.promises.writeFile(tempFile, buffer);
        await sock.sendVideoAsSticker(m.chat, tempFile, m, {
            packname: config.sticker.packname,
            author: config.sticker.author,
        });
        await fs.promises.unlink(tempFile).catch(() => {});
        await m.reply(novaBerhasil("bratvid2"));
    } catch (error) {
        await fs.promises.unlink(tempFile).catch(() => {});
        console.error("[bratvid2] Error:", error.message);
        m.reply(novaGangguan("bratvid2"));
    }
}

export { pluginConfig as config, handler };
