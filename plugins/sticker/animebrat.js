// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraReply, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";

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
        const msg = raraReply({
            title: "animebrat",
            status: "⚠ Masukkan teks untuk generate brat sticker",
            content: `Contoh: ${m.prefix}animebrat Hai semua`,
        });
        return await m.reply(msg);
    }
    const tempFile = path.join(os.tmpdir(), `brat-${Date.now()}.png`);
    try {
    await m.react("🕒");
        // Anime style: dark bg + pink/red text
        const pngBuffer = await bratGen(text, { C_BG: "#0a0a23", C_TEXT: "#ff6b9d" });
        await fs.promises.writeFile(tempFile, pngBuffer);
        await sock.sendImageAsSticker(m.chat, tempFile, m, {
            packname: config.sticker.packname,
            author: config.sticker.author,
        });
        await fs.promises.unlink(tempFile).catch(() => {});
        await m.react("🐣");
        await m.reply(raraBerhasil("animebrat"));
    } catch (error) {
        await fs.promises.unlink(tempFile).catch(() => {});
        console.error("[animebrat] Error:", error.message);
        const msg = raraGangguan("animebrat");
        await m.reply(msg);
    }
}

export { pluginConfig as config, handler };
