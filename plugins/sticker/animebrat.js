// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaReply } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
    name: "animebrat",
    alias: ["animebrat"],
    category: "sticker",
    description: "Membuat sticker brat anime style (lokal canvas)",
    usage: ".animebrat <text>",
    example: ".animebrat Hai semua",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true,
};

async function handler(m, { sock }) {
    const text = m.args.join(" ").trim();
    if (!text) {
        const msg = novaReply({
            title: "animebrat",
            status: "⚠ Masukkan teks untuk generate brat sticker",
            content: `│\n│ Contoh: ${m.prefix}animebrat Hai semua`,
        });
        return await m.reply(msg);
    }
    const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.png`);
    try {
        // Anime style: dark bg + pink/red text
        const pngBuffer = await bratGen(text, { C_BG: "#0a0a23", C_TEXT: "#ff6b9d" });
        await fs.promises.writeFile(tempFile, pngBuffer);
        await sock.sendImageAsSticker(m.chat, tempFile, m, {
            packname: config.sticker.packname,
            author: config.sticker.author,
        });
        await fs.promises.unlink(tempFile).catch(() => {});
    } catch (error) {
        await fs.promises.unlink(tempFile).catch(() => {});
        console.error("[animebrat] Error:", error.message);
        const msg = novaReply({
            title: "animebrat",
            status: `❌ Gagal generate: ${error.message}`,
        });
        await m.reply(msg);
    }
}

export { pluginConfig as config, handler };
